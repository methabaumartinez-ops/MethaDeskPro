import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env before any other imports
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim();
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

const getDriveClient = () => {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        throw new Error('Google Drive credentials missing.');
    }
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth: oauth2Client });
};

async function main() {
    const { qdrantClient } = await import('../src/lib/qdrant/client');

    console.log('Iniciando limpieza de proyecto GAZ Beringen...');
    const projectId = '29ff60bc-8e31-4085-b77a-01fe273d56e0';

    // 1. Fetch Project from Qdrant
    console.log('1. Obteniendo datos del proyecto desde Qdrant...');
    const projResponse = await qdrantClient.retrieve('projekte', {
        ids: [projectId],
        with_payload: true,
    });

    if (projResponse.length === 0) {
        throw new Error(`Proyecto no encontrado con ID: ${projectId}`);
    }

    const project = projResponse[0].payload as any;
    const projectNr = project.projektnummer || 'SinNumero';
    const projectName = project.projektname || 'GAZ Beringen';
    const driveFolderId = project.driveFolderId;

    if (!driveFolderId) {
        throw new Error('El proyecto no tiene un driveFolderId asignado. No se puede continuar.');
    }

    console.log(`Proyecto encontrado: ${projectNr} - ${projectName}`);
    console.log(`Carpeta raíz en Google Drive: ${driveFolderId}`);

    const drive = getDriveClient();

    // 2. Rename Project Folder
    const newFolderName = `${projectNr} ${projectName}`;
    console.log(`2. Renombrando carpeta principal a: "${newFolderName}"...`);

    await drive.files.update({
        fileId: driveFolderId,
        requestBody: {
            name: newFolderName
        }
    });
    console.log('✔️ Carpeta renombrada con éxito.');

    // 3. Find 04_IFC folder
    console.log('3. Buscando subcarpeta 04_IFC...');
    const query = `mimeType='application/vnd.google-apps.folder' and name='04_IFC' and '${driveFolderId}' in parents and trashed=false`;
    const res = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    });

    if (!res.data.files || res.data.files.length === 0) {
        console.log('No se encontró la carpeta 04_IFC. No hay limpieza que hacer.');
        return;
    }

    const ifcFolderId = res.data.files[0].id;
    console.log(`✔️ Carpeta 04_IFC encontrada: ${ifcFolderId}`);

    // 4. Get all Teilsysteme for this project
    console.log('4. Obteniendo Teilsysteme vinculados al proyecto...');

    let allPoints: any[] = [];
    let next_page_offset: any = undefined;

    do {
        const response = await qdrantClient.scroll('teilsysteme', {
            limit: 100,
            filter: {
                must: [{ key: 'projektId', match: { value: projectId } }]
            },
            with_payload: true,
            with_vector: false,
            offset: next_page_offset,
        });

        allPoints.push(...response.points);
        next_page_offset = response.next_page_offset;
    } while (next_page_offset);

    const validIfcIds = new Set<string>();

    for (const pt of allPoints) {
        const payload = pt.payload;
        if (payload && payload.ifcUrl && payload.ifcUrl.includes('id=')) {
            // Ejemplo URL: https://drive.google.com/uc?export=view&id=1XyZ...
            const fileId = payload.ifcUrl.split('id=')[1].split('&')[0];
            if (fileId) {
                validIfcIds.add(fileId);
            }
        }
    }

    console.log(`✔️ Encontrados ${allPoints.length} Teilsysteme.`);
    console.log(`✔️ Archivos IFC válidos extraídos de la BD: ${validIfcIds.size}`);

    // 5. List files in 04_IFC and delete orphans
    console.log('5. Listando archivos en la carpeta 04_IFC de Google Drive...');
    const filesQuery = `'${ifcFolderId}' in parents and trashed=false`;
    const filesRes = await drive.files.list({
        q: filesQuery,
        fields: 'files(id, name)',
        spaces: 'drive',
        pageSize: 1000 // assuming less than 1000 files
    });

    const driveFiles = filesRes.data.files || [];
    console.log(`✔️ Encontrados ${driveFiles.length} archivos en Drive en la carpeta 04_IFC.`);

    let deletedCount = 0;
    for (const file of driveFiles) {
        if (!file.id) continue;

        if (!validIfcIds.has(file.id)) {
            console.log(`🗑️ Eliminando archivo huérfano: ${file.name} (${file.id})...`);
            try {
                await drive.files.delete({ fileId: file.id });
                deletedCount++;
            } catch (err: any) {
                console.error(`Error al eliminar ${file.id}:`, err.message);
            }
        } else {
            console.log(`✅ Manteniendo archivo válido: ${file.name} (${file.id})`);
        }
    }

    console.log(`================================`);
    console.log(`✅ Proceso finalizado.`);
    console.log(`Archivos huérfanos eliminados: ${deletedCount}`);
}

main().catch(err => {
    console.error('Error durante la ejecución del script:', err);
});

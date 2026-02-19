import 'server-only';
import { google } from 'googleapis';
import { Readable } from 'stream';

const ROOT_FOLDER_ID = process.env.GOOGLE_ROOT_FOLDER_ID;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

const getDriveClient = () => {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        console.warn('Google Drive credentials missing. Drive integration disabled.');
        return null;
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Ensures a project folder exists in Google Drive.
 * Structure: ROOT -> [ProjectNr]_[ProjectName]
 * Returns the folder ID.
 */
export const ensureProjectFolder = async (projekt: { projektnummer: string; projektname: string; driveFolderId?: string }) => {
    const drive = getDriveClient();
    if (!drive) return null;

    // specific folder name format
    const folderName = `${projekt.projektnummer}_${projekt.projektname}`;

    try {
        // 1. Check if we already have a folder ID (and verify it still exists)
        if (projekt.driveFolderId) {
            try {
                await drive.files.get({ fileId: projekt.driveFolderId });
                return projekt.driveFolderId;
            } catch (e) {
                console.log('Cached folder ID invalid or not found, searching by name...');
            }
        }

        // 2. Search for folder by name in ROOT
        const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`;
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            console.log(`Found existing folder for ${folderName}: ${res.data.files[0].id}`);
            return res.data.files[0].id;
        }

        // 3. Create new folder if not found
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [ROOT_FOLDER_ID],
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });

        console.log(`Created new folder for ${folderName}: ${file.data.id}`);

        // Create standard subfolders
        await createSubfolder(drive, file.data.id, '01_Dokumente');
        await createSubfolder(drive, file.data.id, '02_Pläne');
        await createSubfolder(drive, file.data.id, '03_Fotos');
        await createSubfolder(drive, file.data.id, '04_IFC');

        return file.data.id;

    } catch (error) {
        console.error('Error in ensureProjectFolder:', error);
        return null;
    }
};

const createSubfolder = async (drive: any, parentId: string, name: string) => {
    try {
        const fileMetadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };
        await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });
    } catch (e) {
        console.error(`Failed to create subfolder ${name}`, e);
    }
}

/**
 * Uploads a file to a specific project folder.
 * If subfolder (e.g. '04_IFC') is provided, it uploads there.
 */
export const uploadFileToDrive = async (
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    projectFolderId: string,
    subfolderName?: string
) => {
    const drive = getDriveClient();
    if (!drive) return null;

    try {
        let parentId = projectFolderId;

        // If subfolder requested, find it
        if (subfolderName) {
            const query = `mimeType='application/vnd.google-apps.folder' and name='${subfolderName}' and '${projectFolderId}' in parents and trashed=false`;
            const res = await drive.files.list({ q: query, fields: 'files(id)' });
            if (res.data.files && res.data.files.length > 0) {
                parentId = res.data.files[0].id;
            } else {
                // Should exist from creation, but fallback create
                const fileMetadata = {
                    name: subfolderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [projectFolderId],
                };
                const file = await drive.files.create({ resource: fileMetadata, fields: 'id' });
                parentId = file.data.id;
            }
        }

        const media = {
            mimeType: mimeType,
            body: Readable.from(fileBuffer),
        };

        const fileMetadata = {
            name: fileName,
            parents: [parentId],
        };

        const res = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink, thumbnailLink',
        });

        // Set permissions to anyone with link (optional, depends on requirement)
        // For now keep private to the authenticated user account

        return res.data;

    } catch (error) {
        console.error('Error uploading file to Drive:', error);
        throw error;
    }
};

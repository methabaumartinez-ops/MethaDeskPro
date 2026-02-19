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
        console.warn('CLIENT_ID:', CLIENT_ID ? 'set' : 'MISSING');
        console.warn('CLIENT_SECRET:', CLIENT_SECRET ? 'set' : 'MISSING');
        console.warn('REFRESH_TOKEN:', REFRESH_TOKEN ? 'set' : 'MISSING');
        return null;
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

    return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Escape single quotes in folder names for Google Drive API queries
 */
const escapeQueryValue = (val: string) => val.replace(/'/g, "\\'");

/**
 * Ensures a project folder exists in Google Drive.
 * Structure: ROOT -> [ProjectNr]_[ProjectName]
 * Returns the folder ID.
 */
export const ensureProjectFolder = async (projekt: { projektnummer?: string; projektname?: string; driveFolderId?: string }) => {
    const drive = getDriveClient();
    if (!drive) {
        console.error('ensureProjectFolder: Drive client is null');
        return null;
    }

    if (!ROOT_FOLDER_ID) {
        console.error('ensureProjectFolder: GOOGLE_ROOT_FOLDER_ID is missing');
        return null;
    }

    // Build folder name, handle missing values
    const nr = projekt.projektnummer || 'OHNE-NR';
    const name = projekt.projektname || 'Unbenannt';
    const folderName = `${nr}_${name}`;

    console.log(`ensureProjectFolder: Looking for folder "${folderName}" in root ${ROOT_FOLDER_ID}`);

    try {
        // 1. Check if we already have a folder ID (and verify it still exists)
        if (projekt.driveFolderId) {
            try {
                const existing = await (drive.files as any).get({ fileId: projekt.driveFolderId });
                console.log('ensureProjectFolder: Existing folder found:', existing.data?.id);
                return projekt.driveFolderId;
            } catch (e: any) {
                console.log('ensureProjectFolder: Cached folder ID invalid:', e.message || e);
            }
        }

        // 2. Search for folder by name in ROOT
        const escapedName = escapeQueryValue(folderName);
        const query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`;
        console.log('ensureProjectFolder: Search query:', query);

        const res = await (drive.files as any).list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            console.log(`ensureProjectFolder: Found existing folder: ${res.data.files[0].id}`);
            return res.data.files[0].id;
        }

        // 3. Create new folder if not found
        console.log('ensureProjectFolder: Creating new folder...');
        const file = await (drive.files as any).create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [ROOT_FOLDER_ID],
            },
            fields: 'id',
        });

        console.log(`ensureProjectFolder: Created folder: ${file.data.id}`);

        // Create standard subfolders
        await createSubfolder(drive, file.data.id, '01_Dokumente');
        await createSubfolder(drive, file.data.id, '02_Pläne');
        await createSubfolder(drive, file.data.id, '03_Fotos');
        await createSubfolder(drive, file.data.id, '04_IFC');

        return file.data.id;

    } catch (error: any) {
        console.error('ensureProjectFolder ERROR:', error.message || error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data));
        }
        return null;
    }
};

const createSubfolder = async (drive: any, parentId: string, name: string) => {
    try {
        await (drive.files as any).create({
            requestBody: {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id',
        });
    } catch (e: any) {
        console.error(`Failed to create subfolder ${name}:`, e.message || e);
    }
};

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

        // If subfolder requested, find or create it
        if (subfolderName) {
            const escapedName = escapeQueryValue(subfolderName);
            const query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and '${projectFolderId}' in parents and trashed=false`;
            const res = await (drive.files as any).list({ q: query, fields: 'files(id)' });
            if (res.data.files && res.data.files.length > 0) {
                parentId = res.data.files[0].id;
            } else {
                // Create subfolder
                const file = await (drive.files as any).create({
                    requestBody: {
                        name: subfolderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [projectFolderId],
                    },
                    fields: 'id',
                });
                parentId = file.data.id;
            }
        }

        const media = {
            mimeType: mimeType,
            body: Readable.from(fileBuffer),
        };

        const res = await (drive.files as any).create({
            requestBody: {
                name: fileName,
                parents: [parentId],
            },
            media: media,
            fields: 'id, webViewLink, webContentLink, thumbnailLink',
        });

        console.log('uploadFileToDrive: File uploaded:', res.data.id);

        return res.data;

    } catch (error: any) {
        console.error('uploadFileToDrive ERROR:', error.message || error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data));
        }
        throw error;
    }
};

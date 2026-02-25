import 'server-only';
import { google } from 'googleapis';
import { Readable } from 'stream';

const ROOT_FOLDER_ID = process.env.GOOGLE_ROOT_FOLDER_ID?.trim();
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim();
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim();
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN?.trim();
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

const getDriveClient = () => {
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        console.warn('Google Drive credentials missing. Drive integration disabled.');
        return null;
    }

    try {
        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
        return google.drive({ version: 'v3', auth: oauth2Client });
    } catch (error: any) {
        console.error('Google Drive initialization error:', error.message);
        return null;
    }
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
        throw new Error('Google Drive client could not be initialized. Check credentials.');
    }

    if (!ROOT_FOLDER_ID) {
        throw new Error('GOOGLE_ROOT_FOLDER_ID is missing');
    }

    // Build folder name, handle missing values
    const nr = projekt.projektnummer || 'OHNE-NR';
    const name = projekt.projektname || 'Unbenannt';
    const folderName = `${nr}_${name}`;

    try {
        // 1. Check if we already have a folder ID (and verify it still exists)
        if (projekt.driveFolderId) {
            try {
                const existing = await (drive.files as any).get({ fileId: projekt.driveFolderId });
                if (existing.data) return projekt.driveFolderId;
            } catch (e: any) {
                console.log('ensureProjectFolder: Cached folder ID invalid, searching...', e.message);
            }
        }

        // 2. Search for folder by name in ROOT
        const escapedName = escapeQueryValue(folderName);
        const query = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`;

        const res = await (drive.files as any).list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
        }

        // 3. Create new folder if not found
        const file = await (drive.files as any).create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [ROOT_FOLDER_ID],
            },
            fields: 'id',
        });

        const newFolderId = file.data.id;

        // Create standard subfolders
        await createSubfolder(drive, newFolderId, '01_Dokumente');
        await createSubfolder(drive, newFolderId, '02_Pläne');
        await createSubfolder(drive, newFolderId, '03_Fotos');
        await createSubfolder(drive, newFolderId, '04_IFC');

        return newFolderId;

    } catch (error: any) {
        console.error('ensureProjectFolder ERROR:', error.message || error);
        throw new Error(`Failed to ensure project folder: ${error.message}`);
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
    if (!drive) throw new Error('Google Drive client is not available');

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

        if (!res || !res.data) {
            throw new Error('Google Drive API returned an empty response during upload');
        }

        const fileId = res.data.id;

        // Make file publicly accessible (anyone with the link can view)
        try {
            await (drive.permissions as any).create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (permError: any) {
            console.error('uploadFileToDrive: Failed to set public permission:', permError.message);
        }

        // Return data with a direct image URL that works in <img> tags
        return {
            ...res.data,
            directUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
        };

    } catch (error: any) {
        console.error('uploadFileToDrive ERROR:', error.message || error);
        if (error.response) {
            console.error('Drive API Detail:', JSON.stringify(error.response.data));
            throw new Error(`Drive API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
};

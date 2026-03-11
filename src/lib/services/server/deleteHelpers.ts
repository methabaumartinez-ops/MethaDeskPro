import { DatabaseService } from '@/lib/services/db';
import { deleteFileFromDrive } from '@/lib/services/googleDriveService';

/** Helper to delete a Drive file from a URL containing ?id=... or /d/... */
export function extractDriveFileId(url: string): string | null {
    if (!url) return null;
    const idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParam) return idParam[1];
    const dParam = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dParam) return dParam[1];
    return null;
}

async function deleteDocAndDriveFile(doc: any): Promise<void> {
    const fileId = extractDriveFileId(doc.url);
    if (fileId) {
        try { await deleteFileFromDrive(fileId); } catch (e) {
            console.error(`[deleteHelpers] Failed to delete Drive file ${fileId}:`, e);
        }
    }
    await DatabaseService.delete('dokumente', doc.id);
}

export async function deleteTeilsystemWithCascade(id: string) {
    const ts = await DatabaseService.get<any>('teilsysteme', id);
    const positions = await DatabaseService.list<any>('positionen', {
        must: [{ key: 'teilsystemId', match: { value: id } }]
    });

    // BUG-05 FIX: Delete Unterposition documents FIRST, before deleting unterpositionen rows.
    // Previously, docs linked to UntPos were never cleaned up — causing DB orphan rows
    // and uncleaned Google Drive files.
    for (const pos of positions) {
        const unterpositionen = await DatabaseService.list<any>('unterpositionen', {
            must: [{ key: 'positionId', match: { value: pos.id } }]
        });
        for (const untPos of unterpositionen) {
            const untPosDocs = await DatabaseService.list<any>('dokumente', {
                must: [{ key: 'entityId', match: { value: untPos.id } }]
            });
            for (const doc of untPosDocs) {
                await deleteDocAndDriveFile(doc);
            }
        }
        // Delete the unterpositionen rows for this position
        await DatabaseService.deleteByFilter('unterpositionen', {
            must: [{ key: 'positionId', match: { value: pos.id } }]
        });
        // NOTE: The 'material' table has no positionId column in the DB schema.
        // Do not attempt to delete by positionId here.
    }

    // Collect and delete documents: TS-level and Position-level
    const allDocs = await DatabaseService.list<any>('dokumente', {
        must: [{ key: 'entityId', match: { value: id } }]
    });
    for (const pos of positions) {
        const posDocs = await DatabaseService.list<any>('dokumente', {
            must: [{ key: 'entityId', match: { value: pos.id } }]
        });
        allDocs.push(...posDocs);
    }
    for (const doc of allDocs) {
        await deleteDocAndDriveFile(doc);
    }

    // Delete IFC file from Drive
    if (ts?.ifcUrl) {
        const ifcFileId = extractDriveFileId(ts.ifcUrl);
        if (ifcFileId) {
            try { await deleteFileFromDrive(ifcFileId); } catch (e) {
                console.error(`[deleteHelpers] Failed to delete IFC ${ifcFileId}:`, e);
            }
        }
    }

    // Delete positionen rows
    await DatabaseService.deleteByFilter('positionen', {
        must: [{ key: 'teilsystemId', match: { value: id } }]
    });

    // Finally delete the TS itself
    await DatabaseService.delete('teilsysteme', id);
}

export async function deletePositionWithCascade(id: string) {
    // BUG-05 FIX: Also clean up Unterposition documents before deleting UntPos rows
    const unterpositionen = await DatabaseService.list<any>('unterpositionen', {
        must: [{ key: 'positionId', match: { value: id } }]
    });
    for (const untPos of unterpositionen) {
        const untPosDocs = await DatabaseService.list<any>('dokumente', {
            must: [{ key: 'entityId', match: { value: untPos.id } }]
        });
        for (const doc of untPosDocs) {
            await deleteDocAndDriveFile(doc);
        }
    }

    // Delete all unterpositionen rows for this position
    await DatabaseService.deleteByFilter('unterpositionen', {
        must: [{ key: 'positionId', match: { value: id } }]
    });

    // NOTE: The 'material' table has no positionId column — do not filter by it.

    // Delete position-level documents
    const docs = await DatabaseService.list<any>('dokumente', {
        must: [{ key: 'entityId', match: { value: id } }]
    });
    for (const doc of docs) {
        await deleteDocAndDriveFile(doc);
    }

    await DatabaseService.delete('positionen', id);
}

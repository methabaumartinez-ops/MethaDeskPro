import { DatabaseService } from '@/lib/services/db';
import { deleteFileFromDrive } from '@/lib/services/googleDriveService';

export async function deleteTeilsystemWithCascade(id: string) {
    const ts = await DatabaseService.get<any>('teilsysteme', id);
    const positions = await DatabaseService.list<any>('positionen', { must: [{ key: 'teilsystemId', match: { value: id } }] });

    for (const pos of positions) {
        await DatabaseService.deleteByFilter('unterpositionen', {
            must: [{ key: 'positionId', match: { value: pos.id } }]
        });
        await DatabaseService.deleteByFilter('material', {
            must: [{ key: 'positionId', match: { value: pos.id } }]
        });
    }

    const allDocs = await DatabaseService.list<any>('dokumente', { must: [{ key: 'entityId', match: { value: id } }] });
    for (const pos of positions) {
        const posDocs = await DatabaseService.list<any>('dokumente', { must: [{ key: 'entityId', match: { value: pos.id } }] });
        allDocs.push(...posDocs);
    }

    for (const doc of allDocs) {
        if (doc.url && doc.url.includes('id=')) {
            const fileId = doc.url.split('id=')[1].split('&')[0];
            try { await deleteFileFromDrive(fileId); } catch (e) { console.error(`Failed to delete doc ${fileId}:`, e); }
        }
        await DatabaseService.delete('dokumente', doc.id);
    }

    if (ts?.ifcUrl && ts.ifcUrl.includes('id=')) {
        const ifcFileId = ts.ifcUrl.split('id=')[1].split('&')[0];
        try { await deleteFileFromDrive(ifcFileId); } catch (e) { console.error(`Failed to delete IFC ${ifcFileId}:`, e); }
    }

    await DatabaseService.deleteByFilter('positionen', {
        must: [{ key: 'teilsystemId', match: { value: id } }]
    });

    await DatabaseService.delete('teilsysteme', id);
}

export async function deletePositionWithCascade(id: string) {
    await DatabaseService.deleteByFilter('unterpositionen', {
        must: [{ key: 'positionId', match: { value: id } }]
    });

    await DatabaseService.deleteByFilter('material', {
        must: [{ key: 'positionId', match: { value: id } }]
    });

    const docs = await DatabaseService.list<any>('dokumente', { must: [{ key: 'entityId', match: { value: id } }] });
    for (const doc of docs) {
        if (doc.url && doc.url.includes('id=')) {
            const fileId = doc.url.split('id=')[1].split('&')[0];
            try { await deleteFileFromDrive(fileId); } catch (e) { console.error(`Failed to delete doc ${fileId}:`, e); }
        }
        await DatabaseService.delete('dokumente', doc.id);
    }

    await DatabaseService.delete('positionen', id);
}

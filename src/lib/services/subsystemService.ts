import { Teilsystem, Position, Material } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const SubsystemService = {
    // CRUD
    async getTeilsysteme(projektId?: string, abteilungId?: string): Promise<Teilsystem[]> {
        if (typeof window !== 'undefined') {
            try {
                let url = '/api/teilsysteme';
                const params = new URLSearchParams();
                if (projektId) params.append('projektId', projektId);
                if (abteilungId) params.append('abteilungId', abteilungId);

                const queryString = params.toString();
                if (queryString) url += `?${queryString}`;

                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch teilsysteme');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }

        const { DatabaseService } = await import('@/lib/services/db');
        let all = await DatabaseService.list<Teilsystem>('teilsysteme');
        if (projektId) {
            all = all.filter(t => t.projektId === projektId);
        }
        if (abteilungId) {
            all = all.filter(t => t.abteilung?.toLowerCase() === abteilungId.toLowerCase());
        }
        return all;
    },

    async getTeilsystemById(id: string): Promise<Teilsystem | null> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/teilsysteme/${id}`);
                if (res.status === 404) return null;
                if (!res.ok) throw new Error('Failed to fetch teilsystem');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        const { DatabaseService } = await import('@/lib/services/db');
        return DatabaseService.get<Teilsystem>('teilsysteme', id);
    },

    async createTeilsystem(teilsystem: Partial<Teilsystem>): Promise<Teilsystem> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch('/api/teilsysteme', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(teilsystem)
                });
                if (!res.ok) throw new Error('Failed to create teilsystem');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        const { DatabaseService } = await import('@/lib/services/db');
        const newSystem: Teilsystem = {
            ...teilsystem,
            id: teilsystem.id || uuidv4(),
        } as Teilsystem;
        return DatabaseService.upsert('teilsysteme', newSystem);
    },

    async updateTeilsystem(id: string, updates: Partial<Teilsystem>): Promise<Teilsystem> {
        if (typeof window !== 'undefined') {
            try {
                const res = await fetch(`/api/teilsysteme/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                if (!res.ok) throw new Error('Failed to update teilsystem');
                return await res.json();
            } catch (error) {
                console.error("Client fetch error:", error);
                throw error;
            }
        }
        const { DatabaseService } = await import('@/lib/services/db');
        const existing = await this.getTeilsystemById(id);
        if (!existing) throw new Error('Teilsystem not found');
        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('teilsysteme', updated);
    },

    async deleteTeilsystem(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/teilsysteme/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete teilsystem');
            return;
        }

        const { DatabaseService } = await import('@/lib/services/db');
        const { PositionService } = await import('./positionService');
        const { DokumentService } = await import('./dokumentService');
        const gDrive = eval('require')('./googleDriveService');

        const ts = await this.getTeilsystemById(id);
        const positions = await PositionService.getPositionenByTeilsystem(id);

        for (const pos of positions) {
            await DatabaseService.deleteByFilter('material', {
                must: [{ key: 'positionId', match: { value: pos.id } }]
            });
        }

        const allDocs = await DokumentService.getDokumente({ entityId: id });
        for (const pos of positions) {
            const posDocs = await DokumentService.getDokumente({ entityId: pos.id });
            allDocs.push(...posDocs);
        }

        for (const doc of allDocs) {
            if (doc.url && doc.url.includes('id=')) {
                const fileId = doc.url.split('id=')[1].split('&')[0];
                try { await gDrive.deleteFileFromDrive(fileId); } catch (e) { console.error(`Failed to delete doc ${fileId}:`, e); }
            }
            await DokumentService.deleteDokument(doc.id);
        }

        if (ts?.ifcUrl && ts.ifcUrl.includes('id=')) {
            const ifcFileId = ts.ifcUrl.split('id=')[1].split('&')[0];
            try { await gDrive.deleteFileFromDrive(ifcFileId); } catch (e) { console.error(`Failed to delete IFC ${ifcFileId}:`, e); }
        }

        await DatabaseService.deleteByFilter('positionen', {
            must: [{ key: 'teilsystemId', match: { value: id } }]
        });

        return DatabaseService.delete('teilsysteme', id);
    },

    async isSystemnummerUnique(projektId: string, nummer: string, excludeId?: string): Promise<boolean> {
        const systems = await this.getTeilsysteme(projektId);
        return !systems.some(s => s.teilsystemNummer === nummer && s.id !== excludeId);
    },

    async getTeilsystemCount(projektId: string): Promise<number> {
        if (!projektId || projektId === 'undefined' || projektId === 'null') return 0;
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/teilsysteme?projektId=${projektId}`);
            if (!res.ok) return 0;
            const data = await res.json();
            return Array.isArray(data) ? data.length : 0;
        }
        return (await this.getTeilsysteme(projektId)).length;
    },

    async getPositionCount(projektId: string): Promise<number> {
        if (!projektId || projektId === 'undefined' || projektId === 'null') return 0;
        if (typeof window !== 'undefined') {
            const teilsysteme = await this.getTeilsysteme(projektId);
            const tsIds = teilsysteme.map(t => t.id);
            const positionenRes = await fetch('/api/data/positionen');
            if (!positionenRes.ok) return 0;
            const positionen: Position[] = await positionenRes.json();
            return Array.isArray(positionen) ? positionen.filter(p => tsIds.includes(p.teilsystemId)).length : 0;
        }
        const { PositionService } = await import('./positionService');
        const teilsysteme = await this.getTeilsysteme(projektId);
        const tsIds = teilsysteme.map(t => t.id);
        const positionen = await PositionService.getPositionen();
        return positionen.filter(p => tsIds.includes(p.teilsystemId)).length;
    },

    async getMaterialCount(projektId: string): Promise<number> {
        if (!projektId || projektId === 'undefined' || projektId === 'null') return 0;
        if (typeof window !== 'undefined') {
            const teilsysteme = await this.getTeilsysteme(projektId);
            const tsIds = teilsysteme.map(t => t.id);
            const positionenRes = await fetch('/api/data/positionen');
            if (!positionenRes.ok) return 0;
            const positionen: Position[] = await positionenRes.json();
            const posIds = positionen.filter(p => tsIds.includes(p.teilsystemId)).map(p => p.id);
            const materialRes = await fetch('/api/data/material');
            if (!materialRes.ok) return 0;
            const material: Material[] = await materialRes.json();
            return Array.isArray(material) ? material.filter(m => m.positionId && posIds.includes(m.positionId)).length : 0;
        }
        const { PositionService } = await import('./positionService');
        const { MaterialService } = await import('./materialService');
        const teilsysteme = await this.getTeilsysteme(projektId);
        const tsIds = teilsysteme.map(t => t.id);
        const positionen = await PositionService.getPositionen();
        const posIds = positionen.filter(p => tsIds.includes(p.teilsystemId)).map(p => p.id);
        const material = await MaterialService.getMaterial();
        return material.filter(m => m.positionId && posIds.includes(m.positionId)).length;
    },

    async getRecentActivity(projektId: string) {
        if (!projektId || projektId === 'undefined' || projektId === 'null') return [];
        if (typeof window !== 'undefined') {
            try {
                const [teilsysteme, positionsRes, materialRes] = await Promise.all([
                    this.getTeilsysteme(projektId),
                    fetch('/api/data/positionen'),
                    fetch('/api/data/material')
                ]);
                if (!positionsRes.ok || !materialRes.ok) return [];
                const positionen: Position[] = await positionsRes.json();
                const material: Material[] = await materialRes.json();
                const tsIds = teilsysteme.map(t => t.id);
                const projectPositions = positionen.filter(p => tsIds.includes(p.teilsystemId));
                const posIds = projectPositions.map(p => p.id);
                const projectMaterial = material.filter(m => m.positionId && posIds.includes(m.positionId));
                const activities = [
                    ...teilsysteme.map((i: any) => ({ action: 'Teilsystem erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/teilsysteme` })),
                    ...projectPositions.map((i: any) => ({ action: 'Position erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/positionen` })),
                    ...projectMaterial.map((i: any) => ({ action: 'Material erfasst', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/material` }))
                ];
                return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
            } catch (error) {
                console.error("[SubsystemService] Error in getRecentActivity:", error);
                return [];
            }
        }
        const { PositionService } = await import('./positionService');
        const { MaterialService } = await import('./materialService');
        const teilsysteme = await this.getTeilsysteme(projektId);
        const tsIds = teilsysteme.map(t => t.id);
        const positionen = await PositionService.getPositionen();
        const projectPositions = positionen.filter(p => tsIds.includes(p.teilsystemId));
        const posIds = projectPositions.map(p => p.id);
        const material = await MaterialService.getMaterial();
        const projectMaterial = material.filter(m => m.positionId && posIds.includes(m.positionId));
        const activities = [
            ...teilsysteme.map((i: any) => ({ action: 'Teilsystem erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/teilsysteme` })),
            ...projectPositions.map((i: any) => ({ action: 'Position erstellt', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/positionen` })),
            ...projectMaterial.map((i: any) => ({ action: 'Material erfasst', target: i.name, time: i.created_at || new Date().toISOString(), link: `/${projektId}/material` }))
        ];
        return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
    }
};

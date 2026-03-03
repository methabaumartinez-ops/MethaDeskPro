import { DatabaseService } from '@/lib/services/db';
import { Worker } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const WorkerService = {
    async getActiveWorkers(projektId?: string): Promise<Worker[]> {
        const allWorkers = await DatabaseService.list<Worker>('workers');

        // Filtrar activos y por proyecto si aplica (incluiyendo trabajadores globales sin projektId)
        const activeWorkers = allWorkers.filter(w => w.active && (!projektId || !w.projektId || w.projektId === projektId));

        // Orden alfabético por fullName
        return activeWorkers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    },

    async getAllWorkers(projektId?: string): Promise<Worker[]> {
        const allWorkers = await DatabaseService.list<Worker>('workers');
        const workers = allWorkers.filter(w => (!projektId || !w.projektId || w.projektId === projektId));
        return workers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    },

    async getWorkerById(id: string): Promise<Worker | null> {
        return DatabaseService.get<Worker>('workers', id);
    },

    async createWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
        const newWorker: Worker = {
            ...data,
            id: uuidv4(),
        };
        return DatabaseService.upsert('workers', newWorker);
    },

    async updateWorker(id: string, updates: Partial<Worker>): Promise<Worker> {
        const existing = await this.getWorkerById(id);
        if (!existing) throw new Error('Worker not found');
        return DatabaseService.upsert('workers', { ...existing, ...updates });
    },

    async deleteWorker(id: string): Promise<void> {
        return DatabaseService.delete('workers', id);
    }
};

// Seed workers for testing
if (typeof window !== 'undefined') {
    (async () => {
        try {
            const workers = await DatabaseService.list<Worker>('workers');
            if (workers.length === 0) {
                const dummyWorkers = [
                    { fullName: 'Hans Meier', active: true, role: 'Polier' },
                    { fullName: 'Anna Schmidt', active: true, role: 'Bauleiter' },
                    { fullName: 'Peter Müller', active: true, role: 'Baufacharbeiter' },
                    { fullName: 'Lukas Weber', active: false, role: 'Praktikant' },
                    { fullName: 'Simon Keller', active: true, role: 'Kranführer' },
                    { fullName: 'Julia Wagner', active: true, role: 'Baufacharbeiter' },
                ];
                for (const w of dummyWorkers) {
                    await WorkerService.createWorker(w as any);
                }
            }
        } catch (e) {
            console.error('Error seeding workers', e);
        }
    })();
}

import { DatabaseService } from '@/lib/services/db';
import { Worker } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const WorkerService = {
    async getActiveWorkers(projektId?: string): Promise<Worker[]> {
        const allWorkers = await this.getAllWorkers(projektId);
        return allWorkers.filter(w => w.active);
    },

    async getAllWorkers(projektId?: string): Promise<Worker[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/workers');
            if (!res.ok) throw new Error('Failed to fetch workers');
            const allWorkers = await res.json() as Worker[];
            const workers = allWorkers.filter(w => (!projektId || !w.projektId || w.projektId === projektId));
            return workers.sort((a, b) => a.fullName.localeCompare(b.fullName));
        }

        const allWorkers = await DatabaseService.list<Worker>('workers');
        const workers = allWorkers.filter(w => (!projektId || !w.projektId || w.projektId === projektId));
        return workers.sort((a, b) => a.fullName.localeCompare(b.fullName));
    },

    async getWorkerById(id: string): Promise<Worker | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/workers?id=${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.length > 0 ? data[0] : null;
        }
        return DatabaseService.get<Worker>('workers', id);
    },

    async createWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/workers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create worker');
            return await res.json();
        }
        const newWorker: Worker = {
            ...data,
            id: uuidv4(),
        };
        return DatabaseService.upsert('workers', newWorker);
    },

    async updateWorker(id: string, updates: Partial<Worker>): Promise<Worker> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/workers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update worker');
            return await res.json();
        }
        const existing = await this.getWorkerById(id);
        if (!existing) throw new Error('Worker not found');
        return DatabaseService.upsert('workers', { ...existing, ...updates });
    },

    async deleteWorker(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/workers?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete worker');
            return;
        }
        return DatabaseService.delete('workers', id);
    }
};

// Seed workers for testing
if (typeof window !== 'undefined') {
    (async () => {
        try {
            const workers = await WorkerService.getAllWorkers();
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

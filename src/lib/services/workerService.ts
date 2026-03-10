import { Worker } from '@/types/ausfuehrung';
export const WorkerService = {
    async getActiveWorkers(projektId?: string): Promise<Worker[]> {
        const allWorkers = await this.getAllWorkers(projektId);
        return allWorkers.filter(w => w.active);
    },

    async getAllWorkers(projektId?: string): Promise<Worker[]> {
        const res = await fetch('/api/data/workers');
                    if (!res.ok) throw new Error('Failed to fetch workers');
                    const allWorkers = await res.json() as Worker[];
                    const workers = allWorkers.filter(w => (!projektId || !w.projektId || w.projektId === projektId));
                    return workers.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    },

    async getWorkerById(id: string): Promise<Worker | null> {
        const res = await fetch(`/api/data/workers?id=${id}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    return data.length > 0 ? data[0] : null;
    },

    async createWorker(data: Omit<Worker, 'id'>): Promise<Worker> {
        const res = await fetch('/api/data/workers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to create worker');
                    return await res.json();
    },

    async updateWorker(id: string, updates: Partial<Worker>): Promise<Worker> {
        const res = await fetch(`/api/data/workers/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update worker');
                    return await res.json();
    },

    async deleteWorker(id: string): Promise<void> {
        const res = await fetch(`/api/data/workers?id=${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete worker');
                    return;
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

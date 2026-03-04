import { Mitarbeiter } from '@/types';
export const EmployeeService = {
    async getMitarbeiter(): Promise<Mitarbeiter[]> {
        const res = await fetch('/api/data/mitarbeiter');
                    if (!res.ok) throw new Error('Failed to fetch employees');
                    return await res.json();
    },

    async getMitarbeiterById(id: string): Promise<Mitarbeiter | null> {
        const res = await fetch(`/api/data/mitarbeiter/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch employee');
                    return await res.json();
    },

    async createMitarbeiter(mitarbeiter: Partial<Mitarbeiter>): Promise<Mitarbeiter> {
        const res = await fetch('/api/data/mitarbeiter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(mitarbeiter)
                    });
                    if (!res.ok) throw new Error('Failed to create employee');
                    return await res.json();
    },

    async updateMitarbeiter(id: string, updates: Partial<Mitarbeiter>): Promise<Mitarbeiter> {
        const res = await fetch(`/api/data/mitarbeiter/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update employee');
                    return await res.json();
    },

    async deleteMitarbeiter(id: string): Promise<void> {
        const res = await fetch(`/api/data/mitarbeiter/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete employee');
                    return;
    }
};

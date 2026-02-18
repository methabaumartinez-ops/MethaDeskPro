import { DatabaseService } from '@/lib/services/db';
import { Mitarbeiter } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const EmployeeService = {
    async getMitarbeiter(): Promise<Mitarbeiter[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/mitarbeiter');
            if (!res.ok) throw new Error('Failed to fetch employees');
            return await res.json();
        }
        return DatabaseService.list<Mitarbeiter>('mitarbeiter'); // Collection 'mitarbeiter' for employees
    },

    async getMitarbeiterById(id: string): Promise<Mitarbeiter | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/mitarbeiter/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch employee');
            return await res.json();
        }
        return DatabaseService.get<Mitarbeiter>('mitarbeiter', id);
    },

    async createMitarbeiter(mitarbeiter: Partial<Mitarbeiter>): Promise<Mitarbeiter> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/mitarbeiter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mitarbeiter)
            });
            if (!res.ok) throw new Error('Failed to create employee');
            return await res.json();
        }

        const newEmployee: Mitarbeiter = {
            ...mitarbeiter,
            id: mitarbeiter.id || uuidv4(),
        } as Mitarbeiter;

        return DatabaseService.upsert('mitarbeiter', newEmployee);
    },

    async updateMitarbeiter(id: string, updates: Partial<Mitarbeiter>): Promise<Mitarbeiter> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/mitarbeiter/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update employee');
            return await res.json();
        }
        const existing = await this.getMitarbeiterById(id);
        if (!existing) throw new Error('Employee not found');

        const updated = { ...existing, ...updates };
        return DatabaseService.upsert('mitarbeiter', updated);
    },

    async deleteMitarbeiter(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/mitarbeiter/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete employee');
            return;
        }
        return DatabaseService.delete('mitarbeiter', id);
    }
};

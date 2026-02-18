import { DatabaseService } from '@/lib/services/db';
import { Fahrzeug, FahrzeugReservierung } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const FleetService = {
    async getFahrzeuge(): Promise<Fahrzeug[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/fahrzeuge');
            if (!res.ok) throw new Error('Failed to fetch vehicles');
            return await res.json();
        }
        return DatabaseService.list<Fahrzeug>('fahrzeuge');
    },

    async getFahrzeugById(id: string): Promise<Fahrzeug | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/fahrzeuge/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch vehicle');
            return await res.json();
        }
        return DatabaseService.get<Fahrzeug>('fahrzeuge', id);
    },

    async createFahrzeug(fahrzeug: Partial<Fahrzeug>): Promise<Fahrzeug> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/fahrzeuge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fahrzeug)
            });
            if (!res.ok) throw new Error('Failed to create vehicle');
            return await res.json();
        }
        const newVehicle: Fahrzeug = {
            ...fahrzeug,
            id: fahrzeug.id || uuidv4(),
        } as Fahrzeug;

        return DatabaseService.upsert('fahrzeuge', newVehicle);
    },

    async updateFahrzeug(id: string, updates: Partial<Fahrzeug>): Promise<Fahrzeug> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/fahrzeuge/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update vehicle');
            return await res.json();
        }
        const existing = await this.getFahrzeugById(id);
        if (!existing) throw new Error('Vehicle not found');

        const updatedVehicle = { ...existing, ...updates };
        return DatabaseService.upsert('fahrzeuge', updatedVehicle);
    },

    async deleteFahrzeug(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/fahrzeuge/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete vehicle');
            return;
        }
        return DatabaseService.delete('fahrzeuge', id);
    },

    // Reservations
    async getReservierungen(): Promise<FahrzeugReservierung[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/fahrzeug_reservierungen');
            if (!res.ok) throw new Error('Failed to fetch reservations');
            return await res.json();
        }
        return DatabaseService.list<FahrzeugReservierung>('fahrzeug_reservierungen');
    },

    async getReservierungenByFahrzeug(fahrzeugId: string): Promise<FahrzeugReservierung[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/fahrzeug_reservierungen?fahrzeugId=${fahrzeugId}`);
            if (!res.ok) throw new Error('Failed to fetch reservations');
            return await res.json();
        }
        const all = await this.getReservierungen();
        return all.filter(r => r.fahrzeugId === fahrzeugId);
    },

    async createReservierung(reservierung: Partial<FahrzeugReservierung>): Promise<FahrzeugReservierung> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/fahrzeug_reservierungen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservierung)
            });
            if (!res.ok) throw new Error('Failed to create reservation');
            return await res.json();
        }
        const newReservation: FahrzeugReservierung = {
            ...reservierung,
            id: reservierung.id || uuidv4(),
            createdAt: new Date().toISOString(),
        } as FahrzeugReservierung;

        return DatabaseService.upsert('fahrzeug_reservierungen', newReservation);
    },

    async deleteReservierung(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/fahrzeug_reservierungen/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete reservation');
            return;
        }
        return DatabaseService.delete('fahrzeug_reservierungen', id);
    }
};

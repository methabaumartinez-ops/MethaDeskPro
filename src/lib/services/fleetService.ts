import { Fahrzeug, FahrzeugReservierung } from '@/types';
export const FleetService = {
    async getFahrzeuge(): Promise<Fahrzeug[]> {
        const res = await fetch('/api/data/fahrzeuge');
                    if (!res.ok) throw new Error('Failed to fetch vehicles');
                    return await res.json();
    },

    async getFahrzeugById(id: string): Promise<Fahrzeug | null> {
        const res = await fetch(`/api/data/fahrzeuge/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch vehicle');
                    return await res.json();
    },

    async createFahrzeug(fahrzeug: Partial<Fahrzeug>): Promise<Fahrzeug> {
        const res = await fetch('/api/data/fahrzeuge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(fahrzeug)
                    });
                    if (!res.ok) throw new Error('Failed to create vehicle');
                    return await res.json();
    },

    async updateFahrzeug(id: string, updates: Partial<Fahrzeug>): Promise<Fahrzeug> {
        const res = await fetch(`/api/data/fahrzeuge/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update vehicle');
                    return await res.json();
    },

    async deleteFahrzeug(id: string): Promise<void> {
        const res = await fetch(`/api/data/fahrzeuge/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete vehicle');
                    return;
    },

    // Reservations
    async getReservierungen(): Promise<FahrzeugReservierung[]> {
        const res = await fetch('/api/data/fahrzeug_reservierungen');
                    if (!res.ok) throw new Error('Failed to fetch reservations');
                    return await res.json();
    },

    async getReservierungenByFahrzeug(fahrzeugId: string): Promise<FahrzeugReservierung[]> {
        const res = await fetch(`/api/data/fahrzeug_reservierungen?fahrzeugId=${fahrzeugId}`);
                    if (!res.ok) throw new Error('Failed to fetch reservations');
                    return await res.json();
    },

    async createReservierung(reservierung: Partial<FahrzeugReservierung>): Promise<FahrzeugReservierung> {
        const res = await fetch('/api/data/fahrzeug_reservierungen', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(reservierung)
                    });
                    if (!res.ok) throw new Error('Failed to create reservation');
                    return await res.json();
    },

    async deleteReservierung(id: string): Promise<void> {
        const res = await fetch(`/api/data/fahrzeug_reservierungen/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete reservation');
                    return;
    }
};

import { Teilsystem, Position } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { STATUS_DEFAULTS } from '@/lib/config/statusConfig';

export const SubsystemService = {
    async getTeilsysteme(projektId?: string, abteilungId?: string): Promise<Teilsystem[]> {
        let url = '/api/teilsysteme';
        const params = new URLSearchParams();
        if (projektId) params.append('projektId', projektId);
        if (abteilungId) params.append('abteilungId', abteilungId);

        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch teilsysteme');
        return await res.json();
    },

    async getTeilsystemById(id: string): Promise<Teilsystem | null> {
        if (!id || id === 'undefined') return null;
        try {
            const res = await fetch(`/api/teilsysteme/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch teilsystem');
            return await res.json();
        } catch (error) {
            console.error("Client fetch error:", error);
            return null;
        }
    },

    async createTeilsystem(item: Partial<Teilsystem>): Promise<Teilsystem> {
        // Enforce centralized defaults
        const defaultAbteilung = STATUS_DEFAULTS.TEILSYSTEM.abteilung(item.abteilung) as any;
        const payload = { 
            ...item, 
            id: item.id || uuidv4(),
            status: item.status || STATUS_DEFAULTS.TEILSYSTEM.status,
            abteilung: defaultAbteilung
        };
        const res = await fetch('/api/teilsysteme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to create teilsystem');
        }
        return await res.json();
    },

    async updateTeilsystem(id: string, updates: Partial<Teilsystem>): Promise<Teilsystem> {
        const res = await fetch(`/api/teilsysteme/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to update teilsystem');
        }
        return await res.json();
    },

    async deleteTeilsystem(id: string): Promise<void> {
        const res = await fetch(`/api/teilsysteme/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete teilsystem');
        }
        return;
    },

    async isSystemnummerUnique(projektId: string, nummer: string, excludeId?: string): Promise<boolean> {
        const systems = await this.getTeilsysteme(projektId);
        return !systems.some(s => s.teilsystemNummer === nummer && s.id !== excludeId);
    },

    async getTeilsystemCount(projektId: string): Promise<number> {
        if (!projektId || projektId === 'undefined' || projektId === 'null') return 0;
        const systems = await this.getTeilsysteme(projektId);
        return systems.length;
    },

    async determineNewTeilsystemNumber(projektId: string, customNumber?: string, generatedId?: string): Promise<string> {
        if (customNumber) {
            const isUnique = await this.isSystemnummerUnique(projektId, customNumber, generatedId);
            if (!isUnique) {
                throw new Error("Systemnummer existiert bereits in diesem Projekt.");
            }
            return customNumber;
        }
        const count = await this.getTeilsystemCount(projektId);
        return `TS-${String(count + 1).padStart(3, '0')}`;
    },

    async getPositionsCount(teilsystemId: string): Promise<number> {
        const res = await fetch(`/api/data/positionen?teilsystemId=${teilsystemId}`);
        if (!res.ok) return 0;
        const data = await res.json();
        return data.length;
    },

    async getUnterpositionsCount(teilsystemId: string): Promise<number> {
        const resPos = await fetch(`/api/data/positionen?teilsystemId=${teilsystemId}`);
        if (!resPos.ok) return 0;
        const positions: Position[] = await resPos.json();
        if (positions.length === 0) return 0;

        let totalUps = 0;
        for (const pos of positions) {
            const resUp = await fetch(`/api/data/unterpositionen?positionId=${pos.id}`);
            if (resUp.ok) {
                const ups = await resUp.json();
                totalUps += ups.length;
            }
        }
        return totalUps;
    },

    async getMaterialCountForTeilsystem(teilsystemId: string): Promise<number> {
        const resPos = await fetch(`/api/data/positionen?teilsystemId=${teilsystemId}`);
        if (!resPos.ok) return 0;
        const positions: Position[] = await resPos.json();
        if (positions.length === 0) return 0;

        let totalMat = 0;
        for (const pos of positions) {
            const resMat = await fetch(`/api/data/material?positionId=${pos.id}`);
            if (resMat.ok) {
                const mats = await resMat.json();
                totalMat += mats.length;
            }
        }
        return totalMat;
    }
};

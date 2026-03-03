import { DatabaseService } from '@/lib/services/db';
import { Team } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const TeamService = {
    async getTeams(projektId?: string): Promise<Team[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/teams');
            if (!res.ok) throw new Error('Failed to fetch teams');
            const teams = await res.json() as Team[];
            const normalized = teams.map(t => ({ ...t, members: t.members || [] }));
            if (projektId) {
                return normalized.filter(t => t.projektId === projektId);
            }
            return normalized;
        }

        const teams = await DatabaseService.list<Team>('teams');
        const normalized = teams.map(t => ({ ...t, members: t.members || [] }));
        if (projektId) {
            return normalized.filter(t => t.projektId === projektId);
        }
        return normalized;
    },

    async getTeamById(id: string): Promise<Team | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/teams?id=${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            const team = data.length > 0 ? data[0] : null;
            if (!team) return null;
            return { ...team, members: team.members || [] };
        }
        const team = await DatabaseService.get<Team>('teams', id);
        if (!team) return null;
        return { ...team, members: team.members || [] };
    },

    async createTeam(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create team');
            return await res.json();
        }
        const id = uuidv4();
        const now = new Date().toISOString();
        const newTeam: Team = {
            ...data,
            id,
            createdAt: now,
            updatedAt: now,
        };
        return DatabaseService.upsert('teams', newTeam);
    },

    async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/teams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update team');
            return await res.json();
        }
        const existing = await this.getTeamById(id);
        if (!existing) throw new Error('Team not found');
        return DatabaseService.upsert('teams', {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    async deleteTeam(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/teams?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete team');
            return;
        }
        return DatabaseService.delete('teams', id);
    }
};


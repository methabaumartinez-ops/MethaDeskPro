import { DatabaseService } from '@/lib/services/db';
import { Team } from '@/types/ausfuehrung';
import { v4 as uuidv4 } from 'uuid';

export const TeamService = {
    async getTeams(projektId?: string): Promise<Team[]> {
        const teams = await DatabaseService.list<Team>('teams');
        const normalized = teams.map(t => ({ ...t, members: t.members || [] }));
        if (projektId) {
            return normalized.filter(t => t.projektId === projektId);
        }
        return normalized;
    },

    async getTeamById(id: string): Promise<Team | null> {
        const team = await DatabaseService.get<Team>('teams', id);
        if (!team) return null;
        return { ...team, members: team.members || [] };
    },

    async createTeam(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
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
        const existing = await this.getTeamById(id);
        if (!existing) throw new Error('Team not found');
        return DatabaseService.upsert('teams', {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        });
    },

    async deleteTeam(id: string): Promise<void> {
        return DatabaseService.delete('teams', id);
    }
};


import { Team } from '@/types/ausfuehrung';
export const TeamService = {
    async getTeams(projektId?: string): Promise<Team[]> {
        const res = await fetch('/api/data/teams');
                    if (!res.ok) throw new Error('Failed to fetch teams');
                    const teams = await res.json() as Team[];
                    const normalized = teams.map(t => ({ ...t, members: t.members || [] }));
                    if (projektId) {
                        return normalized.filter(t => t.projektId === projektId);
                    }
                    return normalized;
    },

    async getTeamById(id: string): Promise<Team | null> {
        const res = await fetch(`/api/data/teams?id=${id}`);
                    if (!res.ok) return null;
                    const data = await res.json();
                    const team = data.length > 0 ? data[0] : null;
                    if (!team) return null;
                    return { ...team, members: team.members || [] };
    },

    async createTeam(data: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<Team> {
        const res = await fetch('/api/data/teams', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    if (!res.ok) throw new Error('Failed to create team');
                    return await res.json();
    },

    async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
        const res = await fetch(`/api/data/teams/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updates)
                    });
                    if (!res.ok) throw new Error('Failed to update team');
                    return await res.json();
    },

    async deleteTeam(id: string): Promise<void> {
        const res = await fetch(`/api/data/teams?id=${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete team');
                    return;
    }
};


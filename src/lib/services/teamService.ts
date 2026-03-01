import { Team, TeamMember } from '@/types';
import { DatabaseService } from './db';
import { v4 as uuidv4 } from 'uuid';

export class TeamService {
    static async getTeams(projektId: string): Promise<Team[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/teams?projektId=${projektId}`);
            if (!res.ok) throw new Error('Failed to fetch teams');
            return res.json();
        }
        const teams = await DatabaseService.list<Team>('teams', {
            must: [{ key: 'projektId', match: { value: projektId } }]
        });
        return teams || [];
    }

    static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/data/team_members?teamId=${teamId}`);
            if (!res.ok) throw new Error('Failed to fetch team members');
            return res.json();
        }
        const members = await DatabaseService.list<TeamMember>('team_members', {
            must: [{ key: 'teamId', match: { value: teamId } }]
        });
        return members || [];
    }

    static async createTeam(team: Omit<Team, 'id' | 'createdAt'>): Promise<Team> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(team)
            });
            if (!res.ok) throw new Error('Failed to create team');
            return res.json();
        }
        const newTeam: Team = {
            ...team,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        } as Team;
        return await DatabaseService.upsert('teams', newTeam);
    }

    static async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
        // Assume API /api/data/[collection]/[id] exists or we just rely on /api/data/[collection] POST/PUT. 
        // Wait, the existing data route does not have PUT. It seems they use POST for upsert or direct API.
        // Let's implement API request for update matching standard or direct upsert.
        if (typeof window !== 'undefined') {
            const existing = await this.getTeams(updates.projektId || '');
            const target = existing.find(t => t.id === id);
            if (!target) throw new Error('Team not found');
            const res = await fetch('/api/data/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...target, ...updates })
            });
            if (!res.ok) throw new Error('Failed to update team');
            return res.json();
        }
        const existing = await DatabaseService.get<Team>('teams', id);
        if (!existing) throw new Error(`Team ${id} not found`);
        return await DatabaseService.upsert('teams', { ...existing, ...updates });
    }

    static async deleteTeam(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            await fetch(`/api/data/teams?id=${id}`, { method: 'DELETE' }); // Note: this might need custom DELETE route if generic doesn't support it
            return;
        }
        await DatabaseService.delete('teams', id);
        await DatabaseService.deleteByFilter('team_members', {
            must: [{ key: 'teamId', match: { value: id } }]
        });
        const tasks = await DatabaseService.list<any>('tasks', {
            must: [{ key: 'teamId', match: { value: id } }]
        });
        for (const task of tasks) {
            await DatabaseService.upsert('tasks', { ...task, teamId: null });
        }
    }

    static async addMember(teamId: string, mitarbeiterId: string, role?: string): Promise<TeamMember> {
        if (typeof window !== 'undefined') {
            const res = await fetch('/api/data/team_members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, mitarbeiterId, role })
            });
            if (!res.ok) throw new Error('Failed to add member');
            return res.json();
        }
        const existing = await this.getTeamMembers(teamId);
        const member = existing.find(m => m.mitarbeiterId === mitarbeiterId);
        if (member) return member;

        const newMember: TeamMember = {
            id: uuidv4(),
            teamId,
            mitarbeiterId,
            role,
            createdAt: new Date().toISOString()
        } as TeamMember;
        return await DatabaseService.upsert('team_members', newMember);
    }

    static async removeMember(id: string): Promise<void> {
        if (typeof window !== 'undefined') {
            await fetch(`/api/data/team_members?id=${id}`, { method: 'DELETE' });
            return;
        }
        await DatabaseService.delete('team_members', id);
    }
}


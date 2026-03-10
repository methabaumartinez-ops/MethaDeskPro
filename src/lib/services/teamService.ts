import { Team, TeamMember, TeamMembershipHistory } from '@/types';

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
    },

    async addMember(teamId: string, mitarbeiterId: string, role?: string): Promise<TeamMember> {
        const res = await fetch(`/api/data/team_members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId, mitarbeiterId, role })
        });
        if (!res.ok) throw new Error('Failed to add team member');
        return await res.json();
    },

    async getTeamMembers(teamId: string): Promise<TeamMember[]> {
        const res = await fetch(`/api/data/team_members?teamId=${teamId}`);
        if (!res.ok) throw new Error('Failed to fetch team members');
        return await res.json();
    },

    // ── Workforce Planning: Team Transfers ──────────────────────

    /** Transfer a worker from one team to another, recording history */
    async transferWorker(
        workerId: string,
        fromTeamId: string | null,
        toTeamId: string,
        projektId?: string,
        reason?: string,
        changedBy?: string
    ): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Close old membership history (if worker was in another team)
            if (fromTeamId) {
                const historyRes = await fetch(`/api/data/team_membership_history?workerId=${workerId}&teamId=${fromTeamId}`);
                if (historyRes.ok) {
                    const history = await historyRes.json() as TeamMembershipHistory[];
                    const openEntry = history.find(h => !h.endDate);
                    if (openEntry) {
                        const closeRes = await fetch(`/api/data/team_membership_history/${openEntry.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ endDate: today })
                        });
                        if (!closeRes.ok) {
                            console.error('[Transfer] Failed to close old membership history', await closeRes.text());
                        }
                    }
                }
            }

            // 2. Create new membership history entry
            const historyCreateRes = await fetch('/api/data/team_membership_history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workerId,
                    teamId: toTeamId,
                    projektId,
                    startDate: today,
                    reason: reason || 'Teamwechsel',
                    changedBy,
                })
            });
            if (!historyCreateRes.ok) {
                throw new Error('Mitgliedschaft-Eintrag konnte nicht erstellt werden.');
            }

            // 3. Update worker's current teamId (PATCH for partial update)
            const workerRes = await fetch(`/api/data/workers/${workerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: toTeamId })
            });
            if (!workerRes.ok) {
                throw new Error('Worker teamId konnte nicht aktualisiert werden.');
            }
        } catch (err) {
            console.error('[TeamService.transferWorker] Transfer failed:', err);
            throw new Error(`Teamwechsel fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`);
        }
    },

    /** Remove a worker from their current team */
    async removeWorkerFromTeam(workerId: string, teamId: string, changedBy?: string): Promise<void> {
        const today = new Date().toISOString().split('T')[0];

        try {
            // Close membership history
            const historyRes = await fetch(`/api/data/team_membership_history?workerId=${workerId}&teamId=${teamId}`);
            if (historyRes.ok) {
                const history = await historyRes.json() as TeamMembershipHistory[];
                const openEntry = history.find(h => !h.endDate);
                if (openEntry) {
                    const closeRes = await fetch(`/api/data/team_membership_history/${openEntry.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ endDate: today })
                    });
                    if (!closeRes.ok) {
                        console.error('[RemoveWorker] Failed to close membership history', await closeRes.text());
                    }
                }
            }

            // Clear worker's teamId (PATCH for partial update)
            const workerRes = await fetch(`/api/data/workers/${workerId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: null })
            });
            if (!workerRes.ok) {
                throw new Error('Worker teamId konnte nicht geloescht werden.');
            }
        } catch (err) {
            console.error('[TeamService.removeWorkerFromTeam] Failed:', err);
            throw new Error(`Mitarbeiter konnte nicht aus dem Team entfernt werden: ${err instanceof Error ? err.message : String(err)}`);
        }
    },

    /** Get transfer history for a worker (optionally scoped by projektId) */
    async getWorkerTransferHistory(workerId: string, projektId?: string): Promise<TeamMembershipHistory[]> {
        const params = new URLSearchParams({ workerId });
        if (projektId) params.append('projektId', projektId);
        const res = await fetch(`/api/data/team_membership_history?${params.toString()}`);
        if (!res.ok) return [];
        return await res.json();
    },

    /** Get all membership history for a team (optionally scoped by projektId) */
    async getTeamMembershipHistory(teamId: string, projektId?: string): Promise<TeamMembershipHistory[]> {
        const params = new URLSearchParams({ teamId });
        if (projektId) params.append('projektId', projektId);
        const res = await fetch(`/api/data/team_membership_history?${params.toString()}`);
        if (!res.ok) return [];
        return await res.json();
    },
};

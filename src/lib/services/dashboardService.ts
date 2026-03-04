import { DashboardRequest, AIConversationLog } from '@/types';
export const DashboardService = {
    async getRequests(userId?: string): Promise<DashboardRequest[]> {
        const url = userId ? `/api/dashboard-requests?userId=${userId}` : '/api/dashboard-requests';
                    const res = await fetch(url);
                    if (!res.ok) throw new Error('Failed to fetch dashboard requests');
                    return await res.json();
    },

    async getRequestById(id: string): Promise<DashboardRequest | null> {
        const res = await fetch(`/api/dashboard-requests/${id}`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch dashboard request');
                    return await res.json();
    },

    async upsertRequest(request: Partial<DashboardRequest>): Promise<DashboardRequest> {
        const res = await fetch('/api/dashboard-requests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error('Failed to save dashboard request');
                    return await res.json();
    },

    async getConversationLog(requestId: string): Promise<AIConversationLog | null> {
        const res = await fetch(`/api/dashboard-requests/${requestId}/log`);
                    if (res.status === 404) return null;
                    if (!res.ok) throw new Error('Failed to fetch conversation log');
                    return await res.json();
    },

    async saveConversationLog(log: Partial<AIConversationLog>): Promise<AIConversationLog> {
        const res = await fetch(`/api/dashboard-requests/${log.requestId}/log`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) throw new Error('Failed to save conversation log');
                    return await res.json();
    }
};

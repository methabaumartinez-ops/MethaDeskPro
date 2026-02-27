import { DatabaseService } from '@/lib/services/db';
import { DashboardRequest, AIConversationLog } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export const DashboardService = {
    async getRequests(userId?: string): Promise<DashboardRequest[]> {
        if (typeof window !== 'undefined') {
            const url = userId ? `/api/dashboard-requests?userId=${userId}` : '/api/dashboard-requests';
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch dashboard requests');
            return await res.json();
        }
        return DatabaseService.list<DashboardRequest>('dashboard_requests', userId ? {
            must: [{ key: 'userId', match: userId }]
        } : undefined);
    },

    async getRequestById(id: string): Promise<DashboardRequest | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/dashboard-requests/${id}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch dashboard request');
            return await res.json();
        }
        return DatabaseService.get<DashboardRequest>('dashboard_requests', id);
    },

    async upsertRequest(request: Partial<DashboardRequest>): Promise<DashboardRequest> {
        const id = request.id || uuidv4();
        const now = new Date().toISOString();
        const payload = {
            ...request,
            id,
            createdAt: request.createdAt || now,
            updatedAt: now,
            status: request.status || 'pending'
        } as DashboardRequest;

        if (typeof window !== 'undefined') {
            const res = await fetch('/api/dashboard-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save dashboard request');
            return await res.json();
        }
        return DatabaseService.upsert<DashboardRequest>('dashboard_requests', payload);
    },

    async getConversationLog(requestId: string): Promise<AIConversationLog | null> {
        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/dashboard-requests/${requestId}/log`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch conversation log');
            return await res.json();
        }
        const logs = await DatabaseService.list<AIConversationLog>('conversation_logs', {
            must: [{ key: 'requestId', match: requestId }]
        });
        return logs.length > 0 ? logs[0] : null;
    },

    async saveConversationLog(log: Partial<AIConversationLog>): Promise<AIConversationLog> {
        const id = log.id || uuidv4();
        const payload = { ...log, id } as AIConversationLog;

        if (typeof window !== 'undefined') {
            const res = await fetch(`/api/dashboard-requests/${log.requestId}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save conversation log');
            return await res.json();
        }
        return DatabaseService.upsert<AIConversationLog>('conversation_logs', payload);
    }
};

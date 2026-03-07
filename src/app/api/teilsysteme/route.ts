import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { getCreationDefaults } from '@/lib/workflow/workflowEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // SECURITY: Require authentication for all reads.
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);
        const projektId = searchParams.get('projektId');
        const abteilungId = searchParams.get('abteilungId');

        let data = await DatabaseService.list('teilsysteme');

        if (projektId) {
            data = (data as any[]).filter(t => t.projektId === projektId);
        }

        if (abteilungId) {
            data = (data as any[]).filter(t => t.abteilung?.toLowerCase() === abteilungId.toLowerCase());
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API Error fetching teilsysteme:', error);
        return NextResponse.json(
            { error: 'Failed to fetch teilsysteme' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    // SECURITY: Allow planners and baufuehrer to create Teilsysteme (not only admins).
    const { user, error } = await requireAuth([
        'admin', 'projektleiter', 'bauprojektleiter', 'baufuhrer', 'planer'
    ]);
    if (error) return error;

    try {
        const body = await req.json();

        // Apply workflow-driven defaults based on creator's role.
        // Server enforces this regardless of what the client sends.
        const workflowDefaults = getCreationDefaults('TEILSYSTEM', user?.role);

        // Client may override abteilung explicitly (e.g., from URL param) — respect that.
        // But status is always determined by the workflow if the user is a planner role.
        const { PLANNER_ROLES } = await import('@/lib/config/statusConfig');
        const isPlanner = PLANNER_ROLES.includes(user?.role as any);

        const newItem = {
            ...body,
            id: body.id || uuidv4(),
            // Enforce status from workflow when creator is a planner
            status: isPlanner ? workflowDefaults.status : (body.status || workflowDefaults.status),
            // Default abteilung to Planung for planners unless client explicitly sent one
            abteilung: (isPlanner && !body.abteilung)
                ? workflowDefaults.abteilung
                : (body.abteilung || workflowDefaults.abteilung),
        };

        const result = await DatabaseService.upsert('teilsysteme', newItem);
        return NextResponse.json(result);
    } catch (error) {
        console.error('API Error creating teilsystem:', error);
        return NextResponse.json(
            { error: 'Failed to create teilsystem' },
            { status: 500 }
        );
    }
}


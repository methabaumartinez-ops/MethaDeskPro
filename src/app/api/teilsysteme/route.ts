import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { getCreationDefaults } from '@/lib/workflow/workflowEngine';
import { getKSFromAbteilung } from '@/lib/config/ksConfig';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // SECURITY: Require authentication for all reads.
    const { error } = await requireAuth();
    if (error) return error;

    try {
        const { searchParams } = new URL(req.url);
        const projektId = searchParams.get('projektId');
        const abteilungId = searchParams.get('abteilungId');

        // BUG-02 FIX: projektId is required to prevent leaking all Teilsysteme across projects.
        // Only superadmins may query without a projektId scope.
        if (!projektId) {
            return NextResponse.json(
                { error: 'projektId ist erforderlich.' },
                { status: 400 }
            );
        }

        // Push filter down to the DB — do NOT load the full table and filter in memory.
        const filter: any = {
            must: [{ key: 'projektId', match: { value: projektId } }],
        };

        let data = await DatabaseService.list<any>('teilsysteme', filter);

        // Secondary in-memory filter only for optional abteilung (low cardinality, same project scope)
        if (abteilungId) {
            data = data.filter((t: any) => t.abteilung?.toLowerCase() === abteilungId.toLowerCase());
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

        // Derive KS from the finalized abteilung — only if no explicit KS was sent by the client
        if (newItem.abteilung && (newItem.ks === undefined || newItem.ks === null || newItem.ks === '')) {
            (newItem as any).ks = getKSFromAbteilung(newItem.abteilung);
        }

        // Always INSERT (never upsert) for new TS creation — guarantees a fresh row
        const result = await DatabaseService.insert('teilsysteme', newItem);

        // Defensive: ensure we got a valid id back before returning
        if (!result?.id) {
            console.error('[API] teilsysteme POST: insert returned no id. Result:', result);
            return NextResponse.json({ error: 'Teilsystem wurde nicht erstellt — kein ID zurückgegeben.' }, { status: 500 });
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('API Error creating teilsystem:', error);
        const message = error?.message || 'Failed to create teilsystem';
        
        // BUG-08 FIX: Catch underlying DB constraint violation for TS numbers
        if (message.includes('23505') || message.toLowerCase().includes('duplicate key value')) {
            return NextResponse.json(
                { error: 'DUPLICATE_TS_NUMMER' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}


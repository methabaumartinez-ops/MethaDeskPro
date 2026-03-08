import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

/**
 * GET /api/debug/supabase
 *
 * Health-check endpoint for the self-hosted Supabase connection.
 * Only accessible to superadmin users (or in development mode).
 *
 * Returns a deterministic report:
 *   - env vars presence
 *   - URL reachability
 *   - service role key acceptance
 *   - table read result
 */
export async function GET() {
    // ── Auth gate: superadmin or dev only ──────────────────────
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Nicht authentifiziert.' }, { status: 401 });
        }
        const user = await getUserFromToken(token);
        if (!user || user.role !== 'superadmin') {
            return NextResponse.json({ error: 'Nur Superadmin.' }, { status: 403 });
        }
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const useSupabase = process.env.USE_SUPABASE === 'true';

    const report: Record<string, any> = {
        timestamp: new Date().toISOString(),
        useSupabase,
        urlPresent: !!url,
        urlValue: url ? `${url.slice(0, 30)}...` : null,
        keyPresent: !!key,
        keyLength: key?.length ?? 0,
        keyPrefix: key ? key.slice(0, 12) + '...' : null,
    };

    if (!url || !key) {
        report.verdict = 'PHASE-1: Env vars missing — app will fall back to Qdrant';
        return NextResponse.json(report, { status: 200 });
    }

    // ── Test 1: URL reachability ────────────────────────────────
    try {
        const pingRes = await fetch(`${url}/rest/v1/`, {
            method: 'HEAD',
            headers: { apikey: key, Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(5000),
        });
        report.urlReachable = pingRes.ok || pingRes.status < 500;
        report.urlStatus = pingRes.status;
    } catch (e: any) {
        report.urlReachable = false;
        report.urlError = e.message;
    }

    // ── Test 2: Service role auth — read users table ────────────
    try {
        const res = await fetch(`${url}/rest/v1/users?select=id,email,role&limit=5`, {
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
            const data = await res.json();
            report.usersTableRead = 'ok';
            report.userCount = Array.isArray(data) ? data.length : 0;
            report.verdict = 'OK — Supabase connection working correctly';
        } else {
            const errBody = await res.text();
            report.usersTableRead = 'error';
            report.authStatus = res.status;
            report.authError = errBody.slice(0, 200);
            if (res.status === 401) {
                report.verdict = 'PHASE-2: Service role key rejected by Kong — check apikey header wiring';
            } else {
                report.verdict = `PHASE-2: Unexpected ${res.status} from Supabase REST`;
            }
        }
    } catch (e: any) {
        report.usersTableRead = 'exception';
        report.tableError = e.message;
        report.verdict = 'PHASE-2: Exception reading users table';
    }

    return NextResponse.json(report, { status: 200 });
}

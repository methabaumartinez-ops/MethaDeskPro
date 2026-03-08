import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase Admin Client — Self-Hosted on Easypanel/VPS
// ============================================================
//
// Self-hosted Supabase uses Kong as the API gateway.
// Kong requires BOTH headers on every request:
//   - Authorization: Bearer <service_role_key>
//   - apikey: <service_role_key>         ← REQUIRED by Kong key-auth plugin
//
// Without the 'apikey' header, Kong rejects with:
//   "Invalid authentication credentials"
//
// SUPABASE_URL:
//   External: https://methadesk-supabase.ph2gu6.easypanel.host
//   Internal: http://supabase_kong:8000  (if same Easypanel network)
//
// SUPABASE_SERVICE_ROLE_KEY:
//   The service_role JWT from your Supabase self-hosted stack.
//   Hardcoded in kong.yml — must match exactly.
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Phase 1 diagnostics (env missing) ────────────────────────
if (!supabaseUrl) {
    console.error(
        '[Supabase] PHASE-1: SUPABASE_URL is not set. ' +
        'Set it in Easypanel env vars for the app service. ' +
        'External: https://methadesk-supabase.ph2gu6.easypanel.host'
    );
} else {
    console.log(`[Supabase] URL configured: ${supabaseUrl}`);
}

if (!supabaseServiceKey) {
    console.error(
        '[Supabase] PHASE-1: SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Use the service_role JWT from your Supabase Easypanel stack.'
    );
} else {
    // Log first+last 8 chars only — never log full keys
    const k = supabaseServiceKey;
    console.log(`[Supabase] Service key present (${k.length} chars): ${k.slice(0, 8)}...${k.slice(-8)}`);
}

// ── Create admin client ───────────────────────────────────────
// Kong self-hosted requires 'apikey' header in addition to Authorization.
// The supabase-js client sends Authorization automatically from the key arg,
// but does NOT send 'apikey' unless we add it via global.headers.
export const supabaseAdmin = createClient(
    supabaseUrl || 'http://localhost:8000',
    supabaseServiceKey || 'missing-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            headers: {
                // Required by Kong key-auth plugin on self-hosted Supabase.
                // Without this, Kong returns "Invalid authentication credentials".
                'apikey': supabaseServiceKey || 'missing-key',
            },
        },
    }
);

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

// ── Normalize the service key ─────────────────────────────────
// Kong self-hosted only accepts the SPECIFIC key literal it was configured with.
// The standard Supabase demo stack configures Kong with the "formatted" (pretty-printed)
// service_role JWT. If Easypanel is set to the "compact" variant, Kong returns 401.
//
// Known accepted key (formatted payload, same signature):
const KNOWN_FORMATTED_SERVICE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ' +
    '.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

// Compact variant (same claims but condensed — NOT accepted by this Kong instance)
const COMPACT_SERVICE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ' +
    '.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

function resolveServiceKey(raw: string | undefined): string {
    if (!raw) return 'missing-key';
    // If Easypanel was configured with the compact key, swap to the formatted one
    if (raw.trim() === COMPACT_SERVICE_KEY) {
        console.warn(
            '[Supabase] Compact service_role key detected — auto-normalizing to formatted key that Kong accepts.\n' +
            '  → To fix permanently: update SUPABASE_SERVICE_ROLE_KEY in Easypanel to the formatted key.'
        );
        return KNOWN_FORMATTED_SERVICE_KEY;
    }
    return raw.trim();
}

const resolvedServiceKey = resolveServiceKey(supabaseServiceKey);

// ── Create admin client ───────────────────────────────────────
// Uses resolvedServiceKey which auto-normalizes the compact → formatted key.
// Kong requires both Authorization: Bearer <key> AND apikey: <key> headers.
export const supabaseAdmin = createClient(
    supabaseUrl || 'http://localhost:8000',
    resolvedServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        global: {
            headers: {
                // Required by Kong key-auth plugin on self-hosted Supabase.
                'apikey': resolvedServiceKey,
            },
        },
    }
);

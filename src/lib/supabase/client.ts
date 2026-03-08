import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase Admin Client — Self-Hosted on Easypanel/VPS
// ============================================================
//
// Architecture: custom auth (JWT + passwordHash in users table).
// Supabase is used as relational DB only — NOT for auth credentials.
//
// Kong gateway (self-hosted) requires BOTH headers on every request:
//   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//   apikey:        <SUPABASE_SERVICE_ROLE_KEY>
//
// Without 'apikey' header → Kong returns "No API key found in request"
// With wrong key value    → Kong returns "Invalid authentication credentials"
//
// ── EASYPANEL ENV VARS (app service) ─────────────────────────
//   SUPABASE_URL=http://methadesk_supabase_kong:8000
//   SUPABASE_SERVICE_ROLE_KEY=<exact key from kong.yml consumers>
//   USE_SUPABASE=true
//
// The SERVICE_ROLE_KEY must be the EXACT string configured as the
// consumer credential in the Kong stack — byte-for-byte identical.
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Startup diagnostics (safe — no secret values logged) ──────
if (!supabaseUrl) {
    console.error(
        '[Supabase] MISSING: SUPABASE_URL not set in Easypanel env vars.\n' +
        '  → Set it to: http://methadesk_supabase_kong:8000 (internal) or the external Kong URL.'
    );
} else {
    console.log(`[Supabase] URL: ${supabaseUrl}`);
}

if (!supabaseServiceKey) {
    console.error(
        '[Supabase] MISSING: SUPABASE_SERVICE_ROLE_KEY not set in Easypanel env vars.\n' +
        '  → Must be the exact service_role JWT configured in the Kong consumers.'
    );
} else {
    const k = supabaseServiceKey;
    // Safe log: length + masked prefix/suffix only
    console.log(`[Supabase] Service key: ${k.length} chars — ${k.slice(0, 10)}...${k.slice(-6)}`);
}

// ── Create admin client ───────────────────────────────────────
// The key must be set correctly in Easypanel. There is no code-level
// fallback or normalization — the env var is the single source of truth.
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
                // Kong key-auth: must match EXACTLY the value in kong.yml consumers
                'apikey': supabaseServiceKey || 'missing-key',
            },
        },
    }
);

import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Supabase Client — Self-Hosted on Easypanel/VPS
// ============================================================
//
// Connection model for self-hosted Supabase:
//
// SUPABASE_URL:
//   - Internal (same VPS/Easypanel): http://<kong-service>:8000
//     Example: http://supabase-kong:8000
//   - External (via domain): https://supabase.yourdomain.com
//   The app uses this to reach the Supabase API (Kong gateway).
//
// SUPABASE_SERVICE_ROLE_KEY:
//   - Self-hosted service_role JWT from your Supabase stack.
//   - Generated during Supabase self-hosted setup using JWT_SECRET.
//   - Has full DB access, bypasses RLS.
//
// Set these in Easypanel environment variables for the app service.
// Do NOT hardcode or commit them.
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    console.error(
        '[Supabase] SUPABASE_URL is not set. ' +
        'For self-hosted Easypanel: use the internal Kong URL (e.g. http://supabase-kong:8000) ' +
        'or external domain (e.g. https://supabase.yourdomain.com). ' +
        'Set it in Easypanel environment variables for the app service.'
    );
}

if (!supabaseServiceKey) {
    console.warn(
        '[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Use the service_role JWT from your self-hosted Supabase stack. ' +
        'This key is found in your Supabase Easypanel service environment.'
    );
}

export const supabaseAdmin = createClient(
    supabaseUrl || 'http://localhost:8000',
    supabaseServiceKey || 'missing-key',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
        // Self-hosted does not need custom headers for Supabase Cloud
    }
);

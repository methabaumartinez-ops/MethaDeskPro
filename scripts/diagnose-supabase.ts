/**
 * Diagnóstico exhaustivo de la conexión Supabase self-hosted
 * Prueba: URL correcta, formato de headers, endpoints, JS client
 */

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzI5MDYyNTcsImV4cCI6MTkzMDU4NjI1N30.A5S_4Wqr7tic2TtlEfPjP_I3YL2nuHrnOLOLcmIyeZo';
const BASE = 'https://methadesk-supabase.ph2gu6.easypanel.host';

async function req(label: string, url: string, headers: Record<string, string>) {
    try {
        const r = await fetch(url, { headers, signal: AbortSignal.timeout(7000) });
        let body = '';
        try { body = await r.text(); } catch {}
        const preview = body.substring(0, 200).replace(/\n/g, ' ');
        console.log(`[${r.status}] ${label}\n        ${preview}\n`);
        return r.status;
    } catch (e: any) {
        console.log(`[ERR] ${label}\n        ${e.message}\n`);
        return 0;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('SUPABASE SELF-HOSTED DIAGNOSTIC');
    console.log('='.repeat(60));

    // 1. Decode JWT to verify payload
    const parts = KEY.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    console.log('\n[JWT PAYLOAD]', JSON.stringify(payload, null, 2));
    console.log(`  iss: "${payload.iss}" — should be "supabase"`);
    console.log(`  role: "${payload.role}" — should be "service_role"`);
    const now = Math.floor(Date.now() / 1000);
    console.log(`  exp: ${payload.exp} — expires in ${Math.round((payload.exp - now) / 86400)} days`);
    console.log('');

    // 2. Test different endpoints with SERVICE_ROLE_KEY
    const headers_sr = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` };

    console.log('[TEST SUITE 1] Standard Supabase headers (apikey + Authorization)');
    await req('GET /rest/v1/projekte',  `${BASE}/rest/v1/projekte?select=id,name&limit=1`, headers_sr);
    await req('GET /rest/v1/',          `${BASE}/rest/v1/`, headers_sr);
    await req('GET /rest/v1/health',    `${BASE}/rest/v1/health`, headers_sr);
    await req('GET /auth/v1/health',    `${BASE}/auth/v1/health`, headers_sr);

    // 3. Test WITHOUT Authorization header (only apikey)
    console.log('[TEST SUITE 2] Only apikey, no Authorization header');
    await req('GET /rest/v1/projekte (only apikey)', `${BASE}/rest/v1/projekte?select=id&limit=1`, { 'apikey': KEY });

    // 4. Test with different header names
    console.log('[TEST SUITE 3] Alternative header formats');
    await req('GET /rest/v1/ (x-supabase-key)', `${BASE}/rest/v1/`, { 'x-supabase-key': KEY });
    await req('GET /rest/v1/ (Authorization only)', `${BASE}/rest/v1/projekte?select=id&limit=1`, { 'Authorization': `Bearer ${KEY}` });

    // 5. Check what headers kong returns on root
    console.log('[TEST SUITE 4] Kong root endpoints (no auth)');
    await req('GET / (no auth)', `${BASE}/`, {});
    await req('GET /rest (no auth)', `${BASE}/rest`, {});
    await req('GET /health (no auth)', `${BASE}/health`, {});
    await req('GET /pg-meta/v1/tables (no auth)', `${BASE}/pg-meta/v1/tables`, {});

    // 6. Try Supabase JS client
    console.log('[TEST SUITE 5] Supabase JS Client (@supabase/supabase-js)');
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const client = createClient(BASE, KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        console.log('  JS client created, querying projekte table...');
        const { data, error, status, statusText } = await client.from('projekte').select('id, name').limit(1);

        if (error) {
            console.log(`  [FAIL] JS Client error: ${status} ${statusText}`);
            console.log(`         message: ${error.message}`);
            console.log(`         hint: ${error.hint || 'none'}`);
            console.log(`         code: ${error.code || 'none'}`);
        } else {
            console.log(`  [OK] JS Client responded with ${data?.length} row(s)`);
            if (data && data.length > 0) {
                console.log('  First result:', JSON.stringify(data[0]));
            }
        }
    } catch (e: any) {
        console.log(`  [ERR] JS Client failed to init: ${e.message}`);
    }

    // 7. Check if Studio is exposed (usually port 3000)
    console.log('\n[TEST SUITE 6] Looking for Studio endpoint');
    await req('GET /studio or similar', `${BASE}/studio`, {});

    // 8. Test with malformed key to see kong error message
    console.log('[TEST SUITE 7] Request with bad key (to see Kong error message)');
    await req('GET /rest/v1/projekte (bad key)', `${BASE}/rest/v1/projekte?select=id&limit=1`,
        { 'apikey': 'bad_key', 'Authorization': 'Bearer bad_key' });

    console.log('='.repeat(60));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(60));
}

main().catch(console.error);

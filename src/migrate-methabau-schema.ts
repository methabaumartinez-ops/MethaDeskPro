import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runQuery(label: string, query: string) {
    console.log(`\n[${label}]`, query);
    const res = await fetch(`${url}/pg/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'apikey': key!,
        },
        body: JSON.stringify({ query }),
    });
    const txt = await res.text();
    const ok = res.status >= 200 && res.status < 300;
    console.log(`  → Status: ${res.status} ${ok ? '✓' : '✗'}`, txt.length > 200 ? txt.slice(0, 200) + '...' : txt);
    return ok;
}

async function run() {
    console.log('=== METHABAU Schema Migration ===');
    console.log('URL:', url);

    const migrations: [string, string][] = [
        // ── teilsysteme ──────────────────────────────────────────────────────────
        [
            'TS: add teileart',
            `ALTER TABLE "public"."teilsysteme" ADD COLUMN IF NOT EXISTS "teileart" TEXT;`
        ],
        [
            'TS: add gewicht (IFC global weight)',
            `ALTER TABLE "public"."teilsysteme" ADD COLUMN IF NOT EXISTS "gewicht" NUMERIC;`
        ],

        // ── positionen ───────────────────────────────────────────────────────────
        [
            'POS: add teileart',
            `ALTER TABLE "public"."positionen" ADD COLUMN IF NOT EXISTS "teileart" TEXT;`
        ],
        [
            'POS: add materialProp (Werkstoff from METHABAU)',
            `ALTER TABLE "public"."positionen" ADD COLUMN IF NOT EXISTS "materialProp" TEXT;`
        ],

        // ── unterpositionen ──────────────────────────────────────────────────────
        [
            'UNTPOS: add teileart (if not exists)',
            `ALTER TABLE "public"."unterpositionen" ADD COLUMN IF NOT EXISTS "teileart" TEXT;`
        ],
        [
            'UNTPOS: add dimensions JSONB (Länge, Breite, Höhe, Blechdicke, Oberfläche gesamt)',
            `ALTER TABLE "public"."unterpositionen" ADD COLUMN IF NOT EXISTS "dimensions" JSONB;`
        ],

        // ── PostgREST schema reload ───────────────────────────────────────────────
        [
            'PGRST: reload schema cache',
            `NOTIFY pgrst, 'reload schema';`
        ],
    ];

    let errors = 0;
    for (const [label, query] of migrations) {
        const ok = await runQuery(label, query);
        if (!ok) errors++;
    }

    console.log(`\n=== Migration complete. Errors: ${errors}/${migrations.length} ===`);
}

run();

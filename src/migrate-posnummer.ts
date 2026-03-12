import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
    console.log("URL:", url);
    const queries = [
        `ALTER TABLE "public"."positionen" ADD COLUMN IF NOT EXISTS "posNummer" TEXT;`,
        `ALTER TABLE "public"."unterpositionen" ADD COLUMN IF NOT EXISTS "posNummer" TEXT;`,
        `NOTIFY pgrst, 'reload schema';` 
    ];
    for (const query of queries) {
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
        console.log("Query:", query, "\nStatus:", res.status, txt);
    }
}
run();

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { requireAuth } from '@/lib/helpers/requireAuth';

export async function POST(req: NextRequest) {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    try {
        const body = await req.json();
        const { projektId, positionen, unterpositionen } = body;
        const log: string[] = [];

        if (!projektId || !positionen || !unterpositionen) {
            return NextResponse.json({ error: 'Missing required payload fields' }, { status: 400 });
        }

        // 1. Resolver/Crear Teilsysteme
        const tsGroups = Array.from(new Set(positionen.map((p: any) => p.teilsystemNummer)));
        const tsIdMap = new Map<string, string>(); // Prefix -> TS UUID

        for (const prefix of tsGroups) {
            const { data: existingTS } = await supabaseAdmin
                .from('teilsysteme')
                .select('id')
                .eq('projektId', projektId)
                .eq('teilsystemNummer', prefix)
                .single();

            if (existingTS) {
                tsIdMap.set(prefix as string, existingTS.id);
            } else {
                const { data: newTs, error: tsErr } = await supabaseAdmin
                    .from('teilsysteme')
                    .insert({
                        projektId,
                        teilsystemNummer: prefix,
                        name: `System ${prefix}`,
                        ks: '1',
                        status: 'offen'
                    })
                    .select('id')
                    .single();
                
                if (tsErr) throw new Error(`TS Creation Failed: ${tsErr.message}`);
                tsIdMap.set(prefix as string, newTs.id);
                log.push(`[TS] Creado nuevo: ${prefix}`);
            }
        }

        // 2. Insertar / Actualizar Positionen (Idempotencia)
        const posPayloads = positionen.map((p: any) => ({
            projektId,
            teilsystemId: tsIdMap.get(p.teilsystemNummer),
            nummer: p.positionsNummer,
            name: p.name,
            menge: p.menge,
            einheit: p.einheit,
            gewicht: p.gewichtTotal,
            status: 'offen',
            groupingMethod: p.groupingMethod,
            ifcMeta: p.ifcMeta,
            updated_at: new Date().toISOString()
        }));

        const { data: upsertedPos, error: posErr } = await supabaseAdmin
            .from('positionen')
            .upsert(posPayloads, { onConflict: 'teilsystemId, nummer' })
            .select('id, nummer, teilsystemId');

        if (posErr) throw new Error(`Position Upsert Failed: ${posErr.message}`);
        log.push(`[POS] Insertadas/Actualizadas: ${upsertedPos.length}`);

        // Mapa inverso temporal combinando tsId y nummer para encontrar el UUID del pos
        const posUUIDMap = new Map<string, string>(); 
        for (const up of upsertedPos) {
            const prefixArr = [...tsIdMap.entries()].find(([k, v]) => v === up.teilsystemId);
            if (prefixArr) {
                const key = `${prefixArr[0]}_${up.nummer}`; // "1121_100"
                posUUIDMap.set(key, up.id);
            }
        }

        // 3. Insertar / Actualizar Unterpositionen (Idempotencia)
        const uposPayloads = unterpositionen
            .map((u: any) => {
                const parentPos = positionen.find((p: any) => p.tempId === u.parentTempId);
                if (!parentPos) return null;
                
                const realParentId = posUUIDMap.get(`${parentPos.teilsystemNummer}_${parentPos.positionsNummer}`);
                if (!realParentId) return null;

                return {
                    projektId,
                    positionId: realParentId,
                    nummer: u.unterpositionsNummer,
                    name: u.name,
                    menge: u.menge,
                    einheit: u.einheit,
                    material: u.material,
                    gewicht: u.gewichtGesamt,
                    status: 'offen',
                    groupHash: u.groupHash,
                    ifcMeta: u.ifcMeta,
                    updated_at: new Date().toISOString()
                };
            })
            .filter((x: any) => x !== null);

        const { data: upsertedUPos, error: uposErr } = await supabaseAdmin
            .from('unterpositionen')
            .upsert(uposPayloads, { onConflict: 'positionId, groupHash' })
            .select('id');

        if (uposErr) throw new Error(`UPOS Upsert Failed: ${uposErr.message}`);
        log.push(`[UPOS] Insertadas/Actualizadas: ${upsertedUPos.length}`);

        return NextResponse.json({ success: true, log });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

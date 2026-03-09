import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/db';
import { v4 as uuidv4 } from 'uuid';

async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 600000,
            hash: 'SHA-256',
        },
        keyMaterial,
        64 * 8
    );
    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

export async function GET() {
    try {
        const users = await DatabaseService.list('users', {
            must: [{ key: 'email', match: { value: 'admin@methabau.ch' } }]
        });

        const newPassword = '343.Methabau.343';
        const adminPasswordHash = await hashPassword(newPassword);

        if (users.length > 0) {
            const adminUser = users[0] as Record<string, any>;
            adminUser.passwordHash = adminPasswordHash;
            adminUser.confirmed = true;
            await DatabaseService.upsert('users', adminUser as any);
            return NextResponse.json({ message: `Admin reset to ${newPassword}` });
        } else {
            const adminUser = {
                id: uuidv4(),
                vorname: 'Admin',
                nachname: 'Methabau',
                email: 'admin@methabau.ch',
                passwordHash: adminPasswordHash,
                role: 'admin',
                createdAt: new Date().toISOString(),
                confirmed: true,
            };
            await DatabaseService.upsert('users', adminUser);
            return NextResponse.json({ message: `Admin created with ${newPassword}` });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

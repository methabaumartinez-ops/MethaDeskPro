import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken, generateToken, verifyToken } from '@/lib/services/authService';

const SEVEN_DAYS_S = 7 * 24 * 3600;
const TWO_DAYS_S   = 2 * 24 * 3600;

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('methabau_token')?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const user = await getUserFromToken(token);
        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const res = NextResponse.json({ user });

        // ── Auto-refresh: si el token expira en < 2 días, emitir uno nuevo ──
        try {
            const payload = await verifyToken(token);
            if (payload?.exp) {
                const remaining = payload.exp - Math.floor(Date.now() / 1000);
                if (remaining < TWO_DAYS_S) {
                    const newToken = await generateToken({
                        userId: user.id,
                        email:  user.email,
                        role:   user.role,
                    });
                    res.cookies.set('methabau_token', newToken, {
                        httpOnly: true,
                        secure:   process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge:   SEVEN_DAYS_S,
                        path:     '/',
                    });
                }
            }
        } catch {
            // No bloquear la respuesta si el refresh falla
        }

        return res;
    } catch (error) {
        console.error('Auth/me error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}

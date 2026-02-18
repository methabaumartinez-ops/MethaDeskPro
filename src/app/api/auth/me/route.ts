import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromToken } from '@/lib/services/authService';

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

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Auth/me error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}

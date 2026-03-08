import { cookies } from 'next/headers';
import { getUserFromToken, SafeUser } from '@/lib/services/authService';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';

type AuthResult =
    | { user: SafeUser; error: null }
    | { user: null; error: NextResponse };

/**
 * Shared auth helper for API route handlers.
 * Validates the methabau_token cookie and optionally enforces role-based access.
 *
 * Usage:
 *   const { user, error } = await requireAuth();
 *   if (error) return error;
 *   // user is guaranteed to be SafeUser here
 *
 * With role restriction:
 *   const { user, error } = await requireAuth(['admin', 'projektleiter']);
 *   if (error) return error;
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthResult> {
    const cookieStore = await cookies();
    const token = cookieStore.get('methabau_token')?.value;

    if (!token) {
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Nicht authentifiziert. Bitte melden Sie sich an.' },
                { status: 401 }
            ),
        };
    }

    const user = await getUserFromToken(token);

    if (!user) {
        return {
            user: null,
            error: NextResponse.json(
                { error: 'Ungültiger oder abgelaufener Token. Bitte erneut anmelden.' },
                { status: 401 }
            ),
        };
    }

    if (allowedRoles && allowedRoles.length > 0 && user.role !== 'superadmin' && !allowedRoles.includes(user.role)) {

        return {
            user: null,
            error: NextResponse.json(
                { error: 'Keine Berechtigung für diese Aktion.' },
                { status: 403 }
            ),
        };
    }

    return { user, error: null };
}

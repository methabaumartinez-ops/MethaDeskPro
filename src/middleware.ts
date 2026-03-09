import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/services/authService';

// Security Headers Helper
function addSecurityHeaders(response: NextResponse) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    return response;
}

// Rutas públicas que NO requieren autenticación
const PUBLIC_PATHS = ['/', '/login', '/register', '/confirm'];
// SECURITY: Only truly public prefixes. All /api/* routes are protected by default.
// Route handlers perform additional fine-grained RBAC checks as defense-in-depth.
const PUBLIC_PREFIXES = ['/api/auth/', '/api/public/', '/_next/', '/favicon.ico', '/share/'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir rutas públicas
    if (PUBLIC_PATHS.includes(pathname)) {
        return addSecurityHeaders(NextResponse.next());
    }

    // Permitir prefijos públicos (assets, API auth, etc.)
    if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return addSecurityHeaders(NextResponse.next());
    }

    // Permitir archivos estáticos
    if (pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2|ttf)$/)) {
        return addSecurityHeaders(NextResponse.next());
    }

    // Cookie-Token überprüfen
    const token = request.cookies.get('methabau_token')?.value;

    // SECURITY FIX: API routes must NEVER redirect to /login.
    // A redirect returns HTML, which client fetch() cannot parse as JSON,
    // causing opaque "Failed to fetch" errors instead of clean 401 responses.
    const isApiRoute = pathname.startsWith('/api/');

    if (!token) {
        if (isApiRoute) {
            return NextResponse.json(
                { error: 'Nicht authentifiziert.' },
                { status: 401 }
            );
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
        if (isApiRoute) {
            const response = NextResponse.json(
                { error: 'Ungültiger oder abgelaufener Token.' },
                { status: 401 }
            );
            response.cookies.set('methabau_token', '', { maxAge: 0, path: '/' });
            return response;
        }
        // For page routes: clear cookie and redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('methabau_token', '', { maxAge: 0, path: '/' });
        return response;
    }

    return addSecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

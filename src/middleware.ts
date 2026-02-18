import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/services/authService';

// Rutas públicas que NO requieren autenticación
const PUBLIC_PATHS = ['/', '/login', '/register'];
const PUBLIC_PREFIXES = ['/api/auth/', '/_next/', '/favicon.ico'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir rutas públicas
    if (PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.next();
    }

    // Permitir prefijos públicos (assets, API auth, etc.)
    if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Permitir archivos estáticos
    if (pathname.match(/\.(svg|png|jpg|jpeg|gif|ico|css|js|woff|woff2|ttf)$/)) {
        return NextResponse.next();
    }

    // Verificar token de la cookie
    const token = request.cookies.get('methabau_token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);
    if (!payload) {
        // Token inválido o expirado → limpiar cookie y redirigir
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.set('methabau_token', '', { maxAge: 0, path: '/' });
        return response;
    }

    return NextResponse.next();
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

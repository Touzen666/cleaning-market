import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Upewnij się, że ta ścieżka jest poprawna

export function middleware(request: NextRequest) {
    console.log('[Middleware] Running for path:', request.nextUrl.pathname);

    // Handle guest dashboard authentication separately
    if (request.nextUrl.pathname.startsWith('/guest-dashboard/')) {
        console.log('[Middleware] Guest dashboard route detected');

        // Check for guest session cookie
        const guestSession = request.cookies.get('guest-session');
        console.log('[Middleware] Guest session cookie:', guestSession?.value);
        console.log('[Middleware] All cookies:', request.cookies.getAll().map(c => `${c.name}=${c.value}`));

        if (!guestSession) {
            console.log('[Middleware] No guest session found, redirecting to guest login');
            const apartmentSlug = request.nextUrl.pathname.split('/')[2];
            const redirectUrl = new URL(`/guest-login/${apartmentSlug}`, request.url);
            return NextResponse.redirect(redirectUrl);
        }

        console.log('[Middleware] Guest session found, allowing access to dashboard');
        return NextResponse.next();
    }

    // For all other routes, let NextAuth handle it
    return NextResponse.next();
}

// Export NextAuth middleware for protected routes (excluding guest routes)
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
export default NextAuth(authConfig as any).auth;

// Konfiguracja middleware - definiujemy, które trasy mają być chronione
export const config = {
    matcher: [
        /* Trasy wymagające zalogowania: */
        '/apartments/:path*', // Chroni /apartments i wszystkie jego podścieżki
        '/admin/:path*',      // Chroni /admin i wszystkie jego podścieżki (tylko dla adminów)
        // Removed /guest-dashboard/:path* - handled by custom middleware above

        /* Trasy publiczne jak '/login', '/guest-login/:path*' i '/check-in-card/:path*' 
           NIE są tutaj wymienione, więc middleware ich nie dotknie i pozostaną dostępne dla wszystkich. */
    ],
}; 
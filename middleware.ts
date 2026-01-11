import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Do NOT import NextAuth here — middleware runs on Edge and cannot use Prisma.

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

    // Protect admin and apartments routes by checking presence of Auth.js/NextAuth session cookie.
    const isProtected =
        request.nextUrl.pathname.startsWith('/admin/') ||
        request.nextUrl.pathname.startsWith('/apartments/');

    if (isProtected) {
        // Accept any of the possible session cookie names (secure/non-secure)
        const hasSessionCookie = request.cookies.has('__Secure-authjs.session-token')
            || request.cookies.has('authjs.session-token')
            || request.cookies.has('__Secure-next-auth.session-token')
            || request.cookies.has('next-auth.session-token');

        if (!hasSessionCookie) {
            const redirectUrl = new URL('/login', request.url);
            const path =
                request.nextUrl.pathname === '/admin' ? '/admin/owners' : request.nextUrl.pathname;
            redirectUrl.searchParams.set('callbackUrl', path);
            return NextResponse.redirect(redirectUrl);
        }
    }

    // Allow request to proceed
    return NextResponse.next();
}

// Default export must be the middleware function (no NextAuth on Edge)
export default middleware;

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
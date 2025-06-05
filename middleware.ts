import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from './auth.config'; // Upewnij się, że ta ścieżka jest poprawna

export function middleware(request: NextRequest) {
    // Ten log powinien pojawić się w KONSOLI SERWERA (terminalu) przy każdym żądaniu
    console.log('[Middleware Diagnosis] Running for path:', request.nextUrl.pathname);
    return NextResponse.next(); // Na razie tylko przepuszczamy żądanie dalej
}

// Wyeksportuj domyślną funkcję middleware 'auth' z NextAuth.js
// Używamy `as any` dla authConfig z powodu nierozwiązanych problemów z typowaniem w środowisku
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
export default NextAuth(authConfig as any).auth;

// Konfiguracja middleware - definiujemy, które trasy mają być chronione
export const config = {
    matcher: [
        /* Trasy wymagające zalogowania: */
        '/apartments/:path*', // Chroni /apartments i wszystkie jego podścieżki
        '/guest-dashboard/:path*', // Chroni dashboard gości
        // Dodaj tutaj inne trasy, które chcesz chronić, np.:
        // '/profile/:path*',
        // '/dashboard',

        /* Trasa główna '/' jest już obsługiwana przez src/app/page.tsx,
           więc nie musimy jej tutaj dodawać, chyba że chcemy nadpisać tamtą logikę */

        /* Trasy publiczne jak '/login', '/guest-login/:path*' i '/check-in-card/:path*' 
           NIE są tutaj wymienione, więc middleware ich nie dotknie i pozostaną dostępne dla wszystkich. */
    ],
}; 
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

/**
 * Protect /admin routes.
 * - If user is not authenticated, redirect to /login with callbackUrl.
 * - Otherwise, allow the request through.
 */
export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const isAdminPath = nextUrl.pathname.startsWith("/admin");

    if (isAdminPath && !session?.user) {
        const redirectUrl = new URL("/login", nextUrl);
        // Preserve intended destination after successful login
        const intended =
            nextUrl.pathname + (nextUrl.search ? nextUrl.search : "");
        redirectUrl.searchParams.set("callbackUrl", intended);
        return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
});

// Run only on admin pages
export const config = {
    matcher: ["/admin/:path*"],
};



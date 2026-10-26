"use client";

import "@/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { TRPCReactProvider } from "@/trpc/react";
import Header, {
  HeaderAdmin,
  HeaderOwner,
} from "@/app/_components/shared/Header";
import Footer from "@/app/_components/shared/Footer";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");
  const isOwner = pathname.startsWith("/apartamentsOwner");
  const isCleaning = pathname === "/cleaningService" || pathname.startsWith("/cleaningService/");

  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={`${GeistSans.variable}`}
    >
      {/*<Head>*/}
      {/*    <title>Sprzątanie app</title>*/}
      {/*</Head>*/}

      <body
        suppressHydrationWarning={true}
        className="flex min-h-screen flex-col"
      >
        <SessionProvider>
          <TRPCReactProvider>
            {!isHomePage && !isCleaning &&
              (isAdmin ? (
                <HeaderAdmin />
              ) : isOwner ? (
                <HeaderOwner />
              ) : (
                <Header />
              ))}
            <main className="flex-grow">{children}</main>
            {!isHomePage && !isCleaning && <Footer />}
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

"use client";

import "@/styles/globals.css";
import { GeistSans } from "geist/font/sans";
import { TRPCReactProvider } from "@/trpc/react";
import Header from "@/app/_components/shared/Header";
import Footer from "@/app/_components/shared/Footer";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
      className={`${GeistSans.variable}`}
    >
      {/*<Head>*/}
      {/*    <title>Sprzątanie app</title>*/}
      {/*</Head>*/}

      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <TRPCReactProvider>
            {!isHomePage && <Header />}
            <main>{children}</main>
            {!isHomePage && <Footer />}
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

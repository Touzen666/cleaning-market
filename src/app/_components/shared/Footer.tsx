"use client"; // Required for hooks and event handlers

import { useSession, signOut } from "next-auth/react";

export default function Footer() {
  const { data: session, status } = useSession(); // Get session status

  return (
    <footer className="relative flex h-16 items-center justify-center bg-black text-white">
      {/* Footer content can go here */}

      {/* Conditionally render logout button */}
      {status === "authenticated" && (
        <button
          onClick={() => signOut({ callbackUrl: "/login" })} // Sign out and redirect to login
          className="absolute right-4 rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-700"
        >
          Wyloguj ({session?.user?.name ?? session?.user?.email})
        </button>
      )}
    </footer>
  );
}

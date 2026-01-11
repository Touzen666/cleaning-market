"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react"; // Import icons

// Reusable hook for body scroll lock
const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "visible";
    }
    return () => {
      document.body.style.overflow = "visible";
    };
  }, [isLocked]);
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useBodyScrollLock(isMenuOpen);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = (
    <>
      <Link
        href="/admin/apartments"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Lista apartamentów
      </Link>
      <Link
        href="/check-in-card"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Karta meldunkowa
      </Link>
    </>
  );

  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex-shrink-0">
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Złote Wynajmy logo"
              width={360}
              height={96}
              style={{ objectFit: "contain", width: "auto", height: "58px" }} // Adjusted height
              priority
            />
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden items-center space-x-6 md:flex">{navLinks}</div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMenu}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`fixed right-0 top-0 z-50 h-full w-64 transform bg-black/90 p-5 backdrop-blur-sm transition-transform duration-300 ease-in-out md:hidden ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex justify-end">
            <button onClick={toggleMenu}>
              <X size={28} />
            </button>
          </div>
          <div className="mt-8 flex flex-col space-y-4">{navLinks}</div>
        </div>

        {/* Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleMenu}
          ></div>
        )}
      </nav>
    </header>
  );
}

export function HeaderAdmin() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useBodyScrollLock(isMenuOpen);
  const { data: session } = useSession();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = (
    <>
      <Link
        href="/admin"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Panel admina
      </Link>
      {session?.user?.type === "ADMIN" && (
        <Link
          href="/admin/dashboard"
          prefetch={false}
          className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Dashboard Admina
        </Link>
      )}
      {session?.user?.type === "ADMIN" && (
        <Link
          href="/admin/cleaning"
          prefetch={false}
          className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
          onClick={() => setIsMenuOpen(false)}
        >
          Sprzątanie
        </Link>
      )}
      <Link
        href="/admin/reports"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Raporty
      </Link>
      <Link
        href="/admin/owners"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Właściciele
      </Link>
      <Link
        href="/admin/apartments"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Apartamenty
      </Link>
      <Link
        href="/admin/reservations-list"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Rezerwacje
      </Link>
      <Link
        href="/"
        prefetch={false}
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Strona główna
      </Link>
    </>
  );

  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex-shrink-0">
          <Link href="/admin">
            <Image
              src="/logo.png"
              alt="Złote Wynajmy logo"
              width={360}
              height={96}
              style={{ objectFit: "contain", width: "auto", height: "58px" }} // Adjusted height
              priority
            />
          </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden items-center space-x-6 md:flex">{navLinks}</div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMenu}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Sidebar */}
        <div
          className={`fixed right-0 top-0 z-50 h-full w-64 transform bg-black/90 p-5 backdrop-blur-sm transition-transform duration-300 ease-in-out md:hidden ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex justify-end">
            <button onClick={toggleMenu}>
              <X size={28} />
            </button>
          </div>
          <div className="mt-8 flex flex-col space-y-4">{navLinks}</div>
        </div>

        {/* Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleMenu}
          ></div>
        )}
      </nav>
    </header>
  );
}

export function HeaderOwner() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useBodyScrollLock(isMenuOpen);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  useEffect(() => {
    const token = localStorage.getItem("ownerSessionToken");
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("ownerSessionToken");
    localStorage.removeItem("ownerEmail");
    setIsLoggedIn(false);
    setIsMenuOpen(false);
    router.push("/apartamentsOwner/login");
  };

  const navLinks = (
    <>
      <Link
        href="/apartamentsOwner/dashboard"
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Panel właściciela
      </Link>
      <Link
        href="/apartamentsOwner/reports"
        className="block px-4 py-2 hover:text-gray-300 md:px-0 md:py-0"
        onClick={() => setIsMenuOpen(false)}
      >
        Moje raporty
      </Link>
      <button
        onClick={handleLogout}
        className="w-full rounded bg-red-600 px-3 py-2 text-left font-medium hover:bg-red-700 md:w-auto md:text-sm"
      >
        Wyloguj
      </button>
    </>
  );

  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex-shrink-0">
          <Link href="/apartamentsOwner/dashboard">
            <Image
              src="/logo.png"
              alt="Złote Wynajmy logo"
              width={360}
              height={96}
              style={{ objectFit: "contain", width: "auto", height: "58px" }} // Adjusted height
              priority
            />
          </Link>
        </div>

        {/* Desktop Nav */}
        {isLoggedIn && (
          <div className="hidden items-center space-x-6 md:flex">
            {navLinks}
          </div>
        )}

        {/* Mobile Menu Button */}
        {isLoggedIn && (
          <div className="md:hidden">
            <button onClick={toggleMenu}>
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        )}

        {/* Mobile Sidebar */}
        {isLoggedIn && (
          <div
            className={`fixed right-0 top-0 z-50 h-full w-64 transform bg-black/90 p-5 backdrop-blur-sm transition-transform duration-300 ease-in-out md:hidden ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex justify-end">
              <button onClick={toggleMenu}>
                <X size={28} />
              </button>
            </div>
            <div className="mt-8 flex flex-col space-y-4">{navLinks}</div>
          </div>
        )}

        {/* Overlay */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={toggleMenu}
          ></div>
        )}
      </nav>
    </header>
  );
}

import Link from "next/link";
import { useState, useEffect } from "react";

interface ApartmentInfo {
  name: string;
  slug: string;
}

interface ApiResponse {
  success: boolean;
  apartments: ApartmentInfo[];
  error?: string;
  details?: string;
}

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [apartments, setApartments] = useState<ApartmentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApartments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/apartments");
        if (!response.ok) {
          let apiError = `Failed to fetch apartments: ${response.status}`;
          try {
            const errorData = (await response.json()) as ApiResponse;
            if (errorData.error) apiError = errorData.error;
          } catch (e) {
            /* Ignore parsing error, use status code error */
          }
          throw new Error(apiError);
        } else {
          const data = (await response.json()) as ApiResponse;
          if (data.success && data.apartments) {
            setApartments(data.apartments);
          } else {
            console.warn(
              "Header: API call for apartments did not return expected data.",
              data,
            );
            setApartments([]);
          }
        }
      } catch (err) {
        console.error("Header: Error fetching apartments:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
        setApartments([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchApartments(); // Mark promise as intentionally not awaited here
  }, []);

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex space-x-4">
          <Link href="/apartments" className="hover:text-gray-300">
            Lista apartamentów
          </Link>
          <Link href="/check-in-card" className="hover:text-gray-300">
            Karta meldunkowa
          </Link>
        </div>

        {/* Dropdown for Apartments */}
        {!isLoading && !error && apartments.length > 0 && (
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="hover:text-gray-300 focus:outline-none"
            >
              Apartamenty ({apartments.length})
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-64 rounded-md bg-white text-black shadow-lg">
                <ul className="py-1">
                  {apartments.map((apartment, index) => (
                    <li key={index}>
                      <Link
                        href={`/check-in-card/${apartment.slug}`}
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        {apartment.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {isLoading && <div className="text-sm">Ładowanie apartamentów...</div>}
        {error && (
          <div className="text-sm text-red-400">
            Błąd ładowania apartamentów
          </div>
        )}
      </nav>
    </header>
  );
}

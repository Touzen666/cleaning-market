# Dokumentacja Bookmarket i iDoBooking

Przygotowano 24.10.2026 dla projektu `C:\React Workspace\book-market`.

- [Jak działa Bookmarket](bookmarket/architektura.md)
- [Integracja: endpointy, uwierzytelnienie, mapowanie i punkty wejścia](bookmarket/integracja-idobooking.md)
- [Maszynowy spis wykorzystywanych endpointów](bookmarket/endpoints-idobooking.json)
- [Dokumentacja iDoBooking — przeszukiwalny spis HTML](idobooking/index.html)
- [Dokumentacja iDoBooking — spis Markdown i zasady archiwum](idobooking/README.md)
- [Raport kompletności archiwum i sumy kontrolne](idobooking/coverage.json)
- [Weryfikacja plików, odnośników i zrzutów](verification.json)

Materiały Bookmarket opisują lokalny kod; materiały iDoBooking zachowują dokumentację dostawcy, przykłady PHP, ilustracje i pełne zrzuty stron. Archiwizacja z 24.10 nie zmieniała kodu. Aktualizację backendu cleaning z 25.10 opisano poniżej; nie zmieniono danych produkcyjnych.


## Panel cleaning i kandydaci do sprzątania

- [Pracownicy cleaning — role, przydziały, realizacja, saldo i API workforce](bookmarket/cleaning-pracownicy.md)
- [Mapa procesu Figma i 10 grupowych zrzutów](cleaning-ui/figma/README.md)
- [Nowy workforce — oczekująca weryfikacja i plan dowodów](bookmarket/cleaning-pracownicy-weryfikacja.md)
- [Izolowane QA na danych w pamięci — serwer i asercje API](../scripts/cleaning-qa/README.md)
- [Lista i kalendarz — bieżący endpoint, mapowanie, porównanie z iDoBooking](bookmarket/cleaning-kalendarz.md)
- [Potwierdzone mapowanie i rezerwacje — bezpieczny raport](bookmarket/cleaning-live-mapping.json)

- [Działający panel cleaning — interfejs, rzeczywisty odczyt i testy](bookmarket/cleaning-ui-etap-2.md)
- [Bieżący raport weryfikacji backendu i UI](bookmarket/cleaning-ui-verification.json)
- [Wdrożony lokalnie backend cleaning — etap 1, kontrakt i testy](bookmarket/cleaning-backend-etap-1.md)
- [Przegląd kodu i kontrakt: przyjęte i oczekujące rezerwacje, okna 10–15](bookmarket/endpoint-kandydatow-sprzatania.md)
- [Przykładowa odpowiedź JSON z fikcyjnymi danymi](bookmarket/cleaning-candidates.example.json)
- [Syntetyczne przykłady zachowania obecnego modułu](bookmarket/cleaning-review-evidence.json)

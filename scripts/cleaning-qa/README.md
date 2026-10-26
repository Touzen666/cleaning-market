# Izolowane QA panelu cleaning

Ten katalog umożliwia sprawdzanie operacji `cleaning.workforce` i interfejsu `/cleaningService` na **fikcyjnych danych w pamięci procesu**. Służy do tworzenia kont testowych, przyjmowania i odmawiania zadań, korekt godzin, zdjęć, punktów oraz wniosków bez wykonywania tych operacji na produkcyjnej bazie.

Wyniki wykonanej rundy są zapisane w [dokumencie weryfikacji](../../docs/bookmarket/cleaning-pracownicy-weryfikacja.md).

## Sposób izolacji

- `cleaning-memory-db.mjs` zastępuje bazę tablicami obiektów i serializowanymi transakcjami w pamięci. Restart procesu usuwa konta i zmiany tej sesji testowej.
- `cleaning-qa-source.mjs` zastępuje snapshot iDoBooking, katalog oraz liczby gości stałymi fikcyjnymi rekordami. Synchronizacja w UI dotyczy tego źródła.
- `cleaning-qa-trpc.mjs` dostarcza lokalny kontekst tRPC, a `cleaning-qa-env.mjs` testowy sekret uwierzytelnienia.
- `cleaning-qa-loader.mjs` rozwiązuje aliasy `@/`, transpiluje TypeScript i kieruje wskazane importy do zamienników. Te podmiany wymagają uruchomienia z loaderem.
- Serwer tworzy losowy sekret JWT działający tylko w procesie QA oraz ustawia adres bazy na nieużywany lokalny port. Next może wczytać standardową konfigurację projektu, lecz API testowe otrzymuje pamięciową bazę i fikcyjne źródło. Nie należy zastępować zamienników produkcyjnym klientem Prisma.
- HTTP jest dostępne wyłącznie jako `127.0.0.1:3101`. Kontekst testowego API nie posiada sesji administratora aplikacji. Trasy API spoza zdefiniowanego routera QA są blokowane.
- WhatsApp pozostaje wyłączony. Wnioski wypłaty i wymiany punktów są wpisami testowej ewidencji, bez przelewów i komunikacji z zewnętrznym systemem płatniczym.

Harness używa rzeczywistych procedur domeny, lecz nie jest pełnym emulatorem PostgreSQL, Prisma ani platformy wdrożeniowej. Poprawny wynik nie zastępuje sprawdzenia migracji i konfiguracji docelowego środowiska. Next w obecnej konfiguracji projektu zapisuje także `.next`, mimo osobnego `distDir` przekazanego przez harness. Nie uruchamiaj równocześnie standardowego serwera 3100 i QA 3101: współdzielona pamięć kompilacji i generowane typy tras mogą się nadpisywać. Zatrzymaj jeden proces przed uruchomieniem drugiego. Nie jest to zapis do bazy produkcyjnej.

## Wymagania

Uruchamiaj polecenia z katalogu głównego repozytorium. Potrzebny jest Node.js zgodny z projektem, zainstalowane zależności oraz wygenerowany klient Prisma. Skrypty nie wykonują migracji, seedowania ani synchronizacji finansowej.

Nie używaj zwykłego `npm run dev` jako zamiennika tej sesji QA: uruchamia on standardowe ścieżki aplikacji. Poniższy serwer ma osobny router i pamięciowy stan.

## Serwer i weryfikacja UI

```powershell
node --loader ./scripts/cleaning-qa/cleaning-qa-loader.mjs ./scripts/cleaning-qa/cleaning-workforce-qa.mjs
```

Po przygotowaniu Next serwer wypisuje `WORKFORCE_QA_URL=...`. Otwórz dokładnie ten lokalny adres, zachowując host `127.0.0.1`. Losowa część ścieżki zmienia się po restarcie. Strona startowa ma przyciski koordynatora i dwóch fikcyjnych pracownic; pozwalają wejść do panelu bez tworzenia kont w rzeczywistej bazie. Testowy token działa tylko w tej sesji procesu i wygasa po dwóch godzinach.

Strona startowa udostępnia zmianę testowego czasu pracy pomiędzy 10:00 a 14:00. Wykorzystaj ją przy sprawdzaniu rozpoczęcia i ukończenia zadań. Loader zastępuje domyślny czas domenowej funkcji `localNow`; nie jest to symulacja wszystkich zegarów JavaScript ani zewnętrznych usług. Data źródła pozostaje bieżącą datą Warszawy.

Nie zapisuj tokenów sesji w raportach, dokumentacji ani zrzutach. Do dowodów wystarczają ekran, fikcyjna rola, godzina testowa i opis wykonanych kroków. Zamknięcie procesu przez `Ctrl+C` kończy sesję; restart tworzy nowy stan i nowy adres startowy.

## Weryfikacja API bez przeglądarki

```powershell
node --loader ./scripts/cleaning-qa/cleaning-qa-loader.mjs ./scripts/cleaning-qa/verify-cleaning-workforce-api.mjs
```

Skrypt tworzy własną pamięciową bazę i wywołuje procedury przez `createCaller`. Nie wymaga uruchomionego serwera HTTP. Ma odrębny stan od sesji UI.

Scenariusze obejmują m.in. odrzucenie użytkownika anonimowego, rozdzielenie uprawnień pracownika i koordynatora, automatyczną ofertę, odmowę i kolejnego pracownika, przydział wymuszony, lokalne korekty, checklistę i zdjęcia, jednorazowe naliczenie, punkty, współbieżne wnioski o wypłatę, zmiany profilu i unieważnianie sesji po zmianie hasła. Zakończenie bez wyjątku wypisuje zestaw zaliczonych scenariuszy; błąd asercji oznacza niezaliczony przebieg. Do raportu należy przenieść dopiero wynik faktycznie wykonanego polecenia, wraz z datą i wersją kodu.

## Pliki

| Plik                                | Funkcja                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `cleaning-workforce-qa.mjs`         | Lokalny serwer Next i testowego API; strona wyboru roli i czasu. |
| `verify-cleaning-workforce-api.mjs` | Sekwencja asercji API na pamięciowym stanie.                     |
| `cleaning-memory-db.mjs`            | Dane kont, profili, zadań, zdjęć, audytu i kolejki w pamięci.    |
| `cleaning-qa-source.mjs`            | Fikcyjny katalog i rezerwacje oraz liczby gości.                 |
| `cleaning-qa-loader.mjs`            | Przekierowanie importów i transpilacja domeny TypeScript.        |
| `cleaning-qa-trpc.mjs`              | Konfiguracja tRPC dla lokalnych wywołań.                         |
| `cleaning-qa-env.mjs`               | Udostępnienie sekretu utworzonego wyłącznie dla procesu QA.      |

Zakres funkcji produkcyjnych opisuje [cleaning-pracownicy.md](../../docs/bookmarket/cleaning-pracownicy.md), a materiał projektowy — [archiwum Figma](../../docs/cleaning-ui/figma/README.md).

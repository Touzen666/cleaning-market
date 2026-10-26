# Cleaning — wykonana weryfikacja

Data: 26.10.2026, Europe/Warsaw. Sprawdzenie dotyczy bieżących, niezacommitowanych plików projektu. Sumy sześciu głównych plików i wyniki: [workforce-verification.json](../cleaning-ui/workforce-verification.json).

## Testy automatyczne

- **225/225 testów, 20 plików — zaliczone.** Cleaning, kalendarz, kandydaci, liczby gości, cron oraz istniejące procedury iDoBooking. [Pełny raport Vitest](../cleaning-ui/workforce-unit-tests.json).
- **31/31 scenariuszy API — zaliczone.** Rzeczywiste procedury z pamięciową bazą i fikcyjnym źródłem: role i prywatność, przydział, odmowy, force, claim, limity i reguły, zmiany godzin, zdjęcia, jednorazowe naliczenia, współbieżne wypłaty, profil, rollback i unieważnianie sesji po zmianie hasła. Zero produkcyjnych zapisów i wysłanych wiadomości w tych testach.
- **TypeScript i ESLint — zaliczone.** Cały projekt sprawdzony przez tsc; lint dla modułu cleaning, routera, crona i zmienionej autoryzacji.
- **Build produkcyjny — zaliczony.** Polecenie: node node_modules/next/dist/bin/next build, bez skryptu podbijającego wersję. Istniejące ostrzeżenie o nieużywanej zmiennej w monthly-reports.ts nie blokuje kompilacji.

Polecenia z katalogu głównego repozytorium:

```powershell
node node_modules/vitest/vitest.mjs run src/server/cleaning src/app/cleaningService src/app/api/cron/cleaning-workforce src/server/idobooking
node --loader ./scripts/cleaning-qa/cleaning-qa-loader.mjs ./scripts/cleaning-qa/verify-cleaning-workforce-api.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Nie uruchamiano zapisującego testu src/test/idobooking.spec.ts. Stan pamięciowy nie odtwarza wszystkich właściwości PostgreSQL; nie jest dowodem zewnętrznego wdrożenia. [Instrukcja QA](../../scripts/cleaning-qa/README.md).

## Sprawdzenie w przeglądarce

Interfejs działał na rzeczywistym kodzie Next i routerach. Operacje testowe miały lokalny serwer 127.0.0.1:3101, fikcyjne apartamenty i pamięciowy stan. Przesyłanie plików sprawdzono w przeglądarce w aplikacji; pozostałe przebiegi obejmowały również Chrome.

| Przebieg                                                                                                                         | Wynik                                                         |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Tworzenie cleaner, logowanie nowym kontem, limit dzienny, zdjęcie profilowe i avatar u koordynatora                              | Zaliczone                                                     |
| Dziś, Grafik, Dostępne, Profil; mobilna nawigacja i brak poziomego przepełnienia dokumentu                                       | Zaliczone                                                     |
| Akceptacja, odmowa, kolejna osoba, dwie odmowy, alert koordynatora i force z uzasadnieniem                                       | Zaliczone                                                     |
| Lokalna zmiana wymeldowania o 30 minut, aktualizacja szczegółów pracownika, ponowna oferta                                       | Zaliczone                                                     |
| Claim wolnego zadania przez pracownika dodanego po przygotowaniu puli                                                            | Zaliczone                                                     |
| Rezerwacja oczekująca: odrzucony start bez zgody, zgoda koordynatora, udany start w terminie                                     | Zaliczone                                                     |
| Start, zapis 13 pozycji i dodatkowego zadania bez zamykania szczegółów                                                           | Zaliczone                                                     |
| Kompresja, trzy kategorie zdjęć, podgląd, blokada niekompletnego zakończenia, ukończenie                                         | Zaliczone                                                     |
| Nagroda 50 zł i 250 punktów, wymiana 200 punktów na 10 zł, wniosek 40 zł, zatwierdzenie i odrzucenie ze zwrotem rezerwacji salda | Zaliczone na danych fikcyjnych, bez przelewu                  |
| Zdjęcie i wniosek zmiany nazwy, zatwierdzenie u koordynatora, zachowanie awatara                                                 | Zaliczone                                                     |
| Zgłoszenie problemu z hasłem i ogólny komunikat, bez wysyłki e-mail                                                              | Zaliczone; właściwy reset i wersje sesji sprawdzone przez API |

Podczas testów poprawiono m.in. zbędne zmiany wersji wolnego zadania, wyścig claim z automatycznym przydziałem, utratę szczegółów przy zapisie checklisty, blokadę operacji podczas kompresji, atomowość zdjęcia z wnioskiem i obsługę odmowy dostępu. Brak metody update w atrapie bazy wykryty w UI został uzupełniony; powtórzony zapis zdjęcia z wnioskiem przeszedł.

Dowody:

- [Widok telefonu](../cleaning-ui/cleaner-mobile-today.jpg)
- [Dokumentacja wykonania](../cleaning-ui/cleaner-mobile-completion-evidence.jpg)
- [Pobrane zadanie](../cleaning-ui/cleaner-mobile-claimed.jpg)
- [Oczekujący pobyt po zgodzie na wejście](../cleaning-ui/cleaner-mobile-pending-approved.jpg)
- [Formularz koordynatora](../cleaning-ui/workforce-create-employee-desktop.jpg)
- [10 grup ekranów Figma i mapa wdrożonego flow](../cleaning-ui/figma/README.md)

## Baza, prawdziwe źródło i wdrożenie

Pięć nowych tabel cleaning i klient Prisma zostały przygotowane w bazie używanej lokalnie przez aplikację; wcześniejsza synchronizacja przygotowała 69 zadań. Końcowe otwarcie zwykłego panelu na 127.0.0.1:3100 i świeża synchronizacja z iDoBooking: **zaliczone**, odczyt 26.10.2026 o 13:44 czasu Warszawy. W bieżącym zakresie interfejs pokazał 65 kart. Dodano [zrzut prawdziwego panelu](../cleaning-ui/workforce-real-coordinator.jpg). Potwierdzono także odczyt zespołu i otwarcie formularza bez tworzenia próbnego pracownika w rzeczywistej bazie. Stan schematu i liczności potwierdza [odczyt bazy](../cleaning-ui/workforce-real-schema.json). Testowi pracownicy i realizacje z powyższych scenariuszy nie zostali zapisani w tej bazie.

Nie wykonano wdrożenia zdalnego. Cron 05:00/17:00 UTC ma kod i konfigurację, lecz jego wykonanie na platformie docelowej wymaga wdrożenia i CRON_SECRET. Testy trasy potwierdziły 401 dla braku/złego sekretu (także Unicode), właściwy zakres i 503 bez wycieku szczegółów przy błędzie źródła. WhatsApp pozostaje kolejką bez wykonawcy wysyłki. Wnioski wypłaty pozostają ewidencją bez integracji bankowej.

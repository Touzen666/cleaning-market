# Odczyt rezerwacji do planowania prac i sprzątania

Sprawdzone na rzeczywistym koncie 15.10.2026: `objects/getAll` zwracał 13 obiektów, a `reservations/get` 83 rezerwacje dla 15.10–15.11, łącznie z anulowanymi. Odczyty w wersjach 34 i 36 zwróciły te same identyfikatory. Nowy moduł domyślnie używa 36; dotychczasowej synchronizacji finansowej nie zmieniono.

## Obecna integracja

- `src/server/api/routers/idobooking.ts`: pobranie rezerwacji i zapis do bazy; domyślnie od 18 miesięcy wstecz do 2100 roku, filtrowanie po dacie przyjazdu.
- `src/server/api/routers/idobooking-router.ts`: synchronizacja tRPC.
- `src/app/api/cron/idobooking/route.ts`, `vercel.json`: istniejące wywołanie co 20 minut.
- Jedna rezerwacja może mieć kilka pozycji. Klucz operacyjny to para `reservationId + objectItemId`. `objectId` identyfikuje grupę, a `object.items[].id` konkretny egzemplarz.
- Nie uruchamiać pełnej synchronizacji finansowej tylko po to, aby zapytać o okno na naprawę.

## Uruchomienie lokalne

Wymagany Node >=22.18, z natywnym odczytem TypeScript. W lokalnym `.env.local` skonfigurowano zmienne na podstawie istniejącego połączenia aplikacji. Ich wartości nie są częścią kodu ani dokumentacji:

```dotenv
IDOBOOKING_BASE_URL=https://zlote-wynajmy.pl
IDOBOOKING_API_VERSION=36
IDOBOOKING_LOGIN=<login istniejącego konta>
IDOBOOKING_PASSWORD=<hasło istniejącego konta>
IDOBOOKING_TIME_ZONE=Europe/Warsaw
OPERATIONS_API_TOKEN=<osobny losowy token, minimum 32 znaki>
```

Skrypt wczytuje `.env.local`, a potem `.env`; już ustawione zmienne procesu mają pierwszeństwo. Nie wypisuje uwierzytelnienia ani surowej odpowiedzi IdoBooking. Nie odczytuje dokumentów rezerwacji ani nie zmienia statusów, cen, powiadomień lub przypisań sprzątaczek.

```powershell
npm run operations:idobooking -- --from 2026-10-16 --to 2026-10-17
npm run operations:idobooking -- --from 2026-10-16 --to 2026-10-17 --unit-id 48
npm run operations:idobooking -- --from 2026-10-16 --to 2026-10-17 --view reservations
```

`to` jest wyłączne; maksymalny zakres to 31 dni, domyślnie 7 dni. Godziny są lokalnym czasem panelu, wskazanym w `timeZone`, a nie datami UTC. `--cleaning-minutes 90` i `--arrival-buffer-minutes 30` to jawne, konfigurowalne założenia planu. Nie są zmierzonym czasem sprzątania danego lokalu.

Pierwszy odczyt zwraca `changes.upsert` dla wszystkich wybranych obiektów. Kolejne zwracają wyłącznie zmienione obiekty i usunięte ID. Bez zmian nie ma całej listy. Cache znajduje się w ignorowanym przez Git `.cache/idobooking-operations`; w ciągu 60 sekund skrypt używa go bez kolejnego żądania. `--refresh` wymusza ponowny odczyt. Błąd pobierania nie nadpisuje poprawnego poprzedniego pliku i nie publikuje nowej dostępności.

## Endpoint aplikacji

```http
GET /api/operations/reservations?from=2026-10-16&to=2026-10-17&view=plan&unitId=48
Authorization: Bearer <OPERATIONS_API_TOKEN>
If-None-Match: "<poprzednia rewizja>"
```

Obsługiwany jest wyłącznie odczyt GET. Bez prawidłowego tokenu endpoint zwraca 401. Parametry są sprawdzane przed odczytem upstream. Domyślne `view=plan` pomija listę rezerwacji; `view=reservations` dodaje wyłącznie ID, unitId, daty i status. Nie ma danych kontaktowych gości, płatności, notatek ani kodów dostępu.

Katalog obiektów jest cache'owany w Next Data Cache przez 24 godziny; rezerwacje dla danego okna przez 60 sekund. Nie ma procesu, który niepotrzebnie odpytuje API, gdy nikt nie korzysta z endpointu. Nowe nieznane ID rezerwacji wymusza ponowny odczyt katalogu. Jeśli odświeżenie cache nie działa i dane mają ponad 5 minut, endpoint zwraca 503 zamiast podawać stare okna jako aktualne. `fetchedAt` i nagłówki `X-Snapshot-*` ujawniają rzeczywistą świeżość danych.

Identyczny stan operacyjny daje HTTP 304, bez treści. Rewizja obejmuje dane, filtry i założenia planu, lecz nie zegar pobrania. Dane mapowania aplikacji są czytane przy każdym autoryzowanym żądaniu; ich zmiana wpływa na ETag. Nie wdrożono nowego endpointu na produkcję. Przed wdrożeniem trzeba ustawić powyższe zmienne w środowisku serwera. Lokalny token nie jest automatycznie przekazywany do Vercel.

Skrypt może korzystać z endpointu zamiast bezpośredniego API:

```powershell
npm run operations:idobooking -- --app-url https://adres-aplikacji --from 2026-10-16 --to 2026-10-17 --unit-id 48
```

Token jest pobierany ze środowiska i przekazywany w nagłówku, nigdy w URL ani argumentach polecenia. `--refresh` pomija cache CLI, ale nadal respektuje świeżość cache endpointu.

## Planowanie i granice danych

- API jest odpytywane przez `betweenDateRange`, żeby uwzględnić pobyty rozpoczęte przed początkiem zapytania. Czytane są wszystkie strony, po 100 rekordów; błędne metadane, niepełna odpowiedź lub duplikaty przerywają odczyt.
- Anulowane i wycofane rezerwacje nie blokują prac. Niepotwierdzone oraz nieznane statusy blokują je zachowawczo.
- Okna na prace są liczone w godzinach 10–15, po odjęciu pobytów, proponowanego czasu sprzątania oraz bufora przed kolejnym przyjazdem. Krótsze niż 30 minut są pomijane.
- Propozycja sprzątania powstaje po wyjeździe z rezerwacji przyjętej, potwierdzonej, trwającej lub zakończonej. Nakładający się pobyt lub za krótka przerwa oznacza konflikt. `nextArrival: null` oznacza brak następnego przyjazdu w pobranym oknie, nie gwarancję bezterminowej dostępności.
- Nieznane lub niejednoznaczne mapowanie nieruchomości blokuje publikację okien na prace. Wycofanie obiektu oraz zakres `reservationsDisabled` w aplikacji również je blokują.
- W rzeczywistej bazie 15.10 wszystkie 33 pola `Apartment.idobookingId` były puste. Aktualny katalog 13 obiektów udało się połączyć po jednoznacznych nazwach; każdy taki wynik ma `mapping: unique-name`. To nie jest zapis potwierdzonego mapowania do bazy. Przed automatycznym zlecaniem prac należy potwierdzić i zapisać ID.
- Osobno czytane są blokady `availabilitylocks/get/36/json` z opisami `note`. Rzeczywiste API zaczyna od strony 1, mimo opisu startu od 0; strona 0 zwróciła błąd 3. Brakuje metadanych paginacji, dlatego odczyt trwa do pustej strony końcowej, również po stronie krótszej niż 100. Powtórzone ID lub błąd odczytu przerywa publikację dostępności. Filtr dat stosowany jest lokalnie po pełnym odczycie, żeby nie zgubić długich blokad rozpoczętych wcześniej.
- Blokady odejmowane są od okien prac i oznaczają konflikt sprzątania po rezerwacji. API podaje wyłącznie daty: końcowy dzień blokady pozostaje zachowawczo zajęty w całości (`lockEndBoundary: conservative-inclusive-day`), do potwierdzenia semantyki i godziny dostępu. Opis przeniesienia trafia do `lockOccupancyReviews` z ID blokady, datami i oryginalną notatką. To wskazanie do sprawdzenia faktycznego pobytu i sprzątania, bez tworzenia drugiej rezerwacji ani automatycznego zadania.
- Wszystkie opisy blokad pozostają w `availabilityLocks`; dopasowanie słów kluczowych jedynie wyróżnia kandydatów i nie zastępuje analizy pozostałych opisów. Źródło i cel przeniesienia wymagają powiązania z rezerwacją oraz korespondencją. Nie wolno automatycznie kasować ani anulować rezerwacji źródłowej na podstawie notatki.
- Wynik ma `basis: reservations-and-availability-locks`, `lockCoverage: complete-read` i `entryRequiresConfirmation: true`. Brak odczytu blokad nie jest równoważny pustej liście. Nadal nie potwierdza to stanu posprzątania ani zgody na wejście. Niczego nie przydziela pracownikom ani nie wysyła klientom. Zmiany lokalne wymagają wdrożenia endpointu; CLI odrzuci starszy endpoint bez informacji o blokadach.
- Dodatkowy jawny odczyt `readClient().reservationNotes(from,to)` zwraca wyłącznie `internalNote` i `apiNote`, daty i ID rezerwacji/lokalu. Rutynowy kalendarz nie pobiera do modelu całych notatek OTA. W próbie październikowej 109 rezerwacji miało notatki API, brak było niepustych `internalNote`; informacje o przeniesieniach znaleziono w blokadach.

## Najmniejszy koszt tokenów

1. Harmonogram aplikacji lub zwykły skrypt wykonuje synchronizację deterministycznie, bez modelu językowego. Dla obecnych 13 obiektów zawężony odczyt zwykle mieści się na jednej stronie; nie potrzeba oddzielnego żądania na mieszkanie.
2. Agent uruchamia CLI dla konkretnego lokalu i okresu. Na co dzień używa `view=plan`, a listę `view=reservations` pobiera tylko przy wyjaśnianiu konkretnej sprawy.
3. Model otrzymuje tylko zmiany. Rzeczywista próba dla 31 dni: pierwszy odczyt 38 520 bajtów, powtórzenie bez zmian 388 bajtów. Końcowy test CLI przez lokalny endpoint dla jednego dnia i 13 obiektów: 6 587 bajtów za pierwszym razem i 173 bajty bez zmian, czyli około 97% mniej. To pomiar bajtów, nie dokładny pomiar tokenów.
4. Jeżeli katalog i liczba rezerwacji wzrosną, kolejnym krokiem jest trwały snapshot i cursor w bazie oraz `modificationDateRange` z zakładką czasową, obejmującą nowe rezerwacje, anulacje, zmianę dat i przenoszenie między lokalami. Cursor wolno przesunąć dopiero po pełnej paginacji i atomowym zapisie. Raz na dobę należy uzgadniać pełne okno pobytów. Ten tryb przyrostowego pobierania z IdoBooking nie jest jeszcze wdrożony; obecne delty dotyczą odpowiedzi dla agenta.

## Weryfikacja

Testy: `node node_modules/vitest/vitest.mjs run src/server/idobooking`.

Sprawdzono: paginację, wielopozycyjne rezerwacje, brak danych gości w wyniku, datę klucza w strefie panelu, niepełne odpowiedzi, statusy, rotację tego samego dnia, bufor sprzątania, konflikt, mapowanie i wycofanie obiektu, autoryzację, 304 i odrzucenie starych danych. Test HTTP na lokalnej aplikacji z rzeczywistym API: 401 bez tokenu, 200 z tokenem, 304 przy ponownym odczycie bez zmian. Nie uruchamiano testu `src/test/idobooking.spec.ts`, ponieważ zapisuje dane w bazie.

Źródła: dostarczone zrzuty dokumentacji metod `reservations/get/36` i `objects/getAll/36`, rzeczywiste odpowiedzi konta oraz [oficjalne FAQ API IdoBooking](https://pomoc.idobooking.com/dodatkowe-moduly/api). Przykłady `editStatus` i `getDocuments` ze zrzutów nie są potrzebne do odczytu kalendarza i nie zostały użyte.

Przykład praktyczny odczytu na 16.10.2026: dla ID 44 (Kopisto 11/220) brak wolnego okna w godzinach 10–15, mimo zapowiedzi pracy na WhatsApp. Dla ID 48 (Langiewicza 79 w adresie aplikacji, lokal 37/79 w WhatsApp) wyjazd o 10:00 i kolejny przyjazd o 15:00 dały propozycję prac 11:30–14:30 po odjęciu sprzątania i bufora. To wynik chwilowego stanu rezerwacji i przyjętych założeń; przed wejściem trzeba odświeżyć odczyt oraz potwierdzić dostęp z koordynatorem. Nie wysłano żadnych zleceń.

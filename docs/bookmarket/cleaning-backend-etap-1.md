# Cleaning — backend kandydatów do sprzątania

Stan lokalnego kodu: **25.10.2026**, backend z natywnym katalogiem cleaning. Procedura `cleaning.listCandidates` dostarcza bazowy, niezależny feed kandydatów; panel `/cleaningService` używa jej rozszerzonej projekcji `listOverview`. Nie tworzy grafiku, trwałych zadań ani przydziałów. Niniejszy plik opisuje bazowy kontrakt listCandidates; nowy panel listy i kalendarza używa [listOverview](cleaning-kalendarz.md) z odczytem aktywnego katalogu lokalnego. Pierwotny etap 1 został rozszerzony o niezależną tożsamość jednostek z iDoBooking i dane lokalizacji.

## Kontrakt

Procedura jest zapytaniem tRPC w istniejącym routerze `cleaning`. Implementacja: `src/server/api/routers/cleaning-candidates.ts`; reguły: `src/server/cleaning/candidates.ts`; odczyt źródła: `src/server/cleaning/snapshot.ts`.

```ts
const result = await api.cleaning.listCandidates.query({
  from: "2026-10-26",
  to: "2026-11-02",
  // unitId: 701,
  includeReviews: true,
});
```

Powyższy przykład dotyczy klienta tRPC z metodą `query`; komponent React może użyć `api.cleaning.listCandidates.useQuery(...)` zgodnie z istniejącym klientem projektu. Poświadczenia przekazuje obecny mechanizm sesji / tokenu cleaning.

| Parametr | Znaczenie |
| --- | --- |
| `from`, `to` | Daty lokalne `YYYY-MM-DD`, zakres 1–31 dni, `to` wyłączne. Wybór po dniu **wyjazdu**, również dla pobytów zaczętych wcześniej. |
| `unitId` | Opcjonalne ID rezerwowalnej jednostki iDoBooking (`objectItemId`). Filtrowanie wyniku następuje po uwzględnieniu całej zajętości. |
| `includeReviews` | Domyślnie `true`. Wyłączenie szczegółów nie usuwa liczby pozycji do sprawdzenia. |
| `forceRefresh` | Domyślnie `false`. `true` wykonuje nowy odczyt katalogu, rezerwacji i blokad z pominięciem obu cache cleaning. Nie uruchamia starej synchronizacji i nie zapisuje danych. |

Niedozwolone są dowolne nadpisania polityki przez parametry. Nieznane pola wejścia powodują `BAD_REQUEST`.

Wynik zawiera `schemaVersion`, `from`, `to`, `timeZone`, `policy`, `candidates`, `reviews`, `excluded`, `counts`, `source`, `revision` i `fetchedAt`. [Pełny przykład JSON](cleaning-candidates.example.json) zawiera wyłącznie fikcyjne dane i został wygenerowany przez funkcję kwalifikacji.

`candidates` obejmuje gotowe do planowania sprzątania przyjęte (`certainty: accepted`) i oczekujące (`provisional`). `reviews` zawiera pozycje wymagające sprawdzenia; `excluded` jawnie wskazuje nieaktywne rezerwacje. Każda pozycja ma stabilny klucz `checkout:<konto>:<reservationId>:<objectItemId>` oraz rewizję. Zmiana statusu lub dat nie zmienia jej ID. Osobne pokoje jednej rezerwacji mają osobne ID.

`windows` podaje ISO z offsetem Warszawy. `afterReservation.checkoutLocal` i `beforeReservation.checkinLocal` zachowują lokalne godziny panelu; należy interpretować je w `timeZone`, bez dopisywania `Z`. `nextArrivalKnownThrough` określa koniec znanego zakresu: brak następnego przyjazdu nie oznacza nieograniczonej dostępności.

Jednostka natywna ma `unit.mapping: "source-id"`, `unit.identitySource: "idobooking"` i `unit.apartmentId: null`. `unitId` jest identyfikatorem `objectItemId` z rezerwacji i `items[].id` z pełnego katalogu `objects/getAll`, a `objectId` jego obiektem nadrzędnym. Nie jest to dopasowanie po nazwie ani powiązanie z rekordem administratora. Dodatnie, bezpieczne ID i brak duplikatów są sprawdzane przed publikacją.

`unit.locationStatus` przyjmuje `known`, `missing` albo `ambiguous`; `unit.locationId` oraz `unit.address` są dostępne przy jednoznacznej lokalizacji źródłowej. Brak lub niejednoznaczność adresu nie usuwa kandydata i nie skraca jego okna — interfejs powinien pokazać tę informację. Przygotowanie listy do sprzątania nie potwierdza fizycznego dostępu ani danych potrzebnych do późniejszego wyznaczenia dojazdów.

## Reguły

- Sprzątanie trwa **60 minut**, a cały dostępny przedział mieści się między **10:00 a 15:00 Europe/Warsaw**, z uwzględnieniem zmiany czasu. Rzeczywista późniejsza godzina wyjazdu lub wcześniejsza przyjazdu zawęża ten przedział.
- `accepted`, `confirmed`, `inProgress`, `completed` kwalifikują się jako przyjęte; `waitingForPayment`, `paymentInProgress`, `unconfirmed`, `toClarify` jako wstępne. Obsługiwane są też lokalne etykiety. Brak wpłaty nie oznacza anulowania.
- Nieznane statusy nadal blokują zajętość, a własny kandydat o takim statusie trafia do `reviews`. Anulowane i odrzucone rezerwacje nie tworzą nowych prognoz.
- Brak kolejnej rezerwacji nie usuwa sprzątania po wyjeździe. Puste dni nie tworzą codziennie nowych sprzątań.
- Bieżąca kwalifikacja wymaga natywnego `objectItemId` obecnego w kompletnym katalogu iDoBooking. Nie wymaga rekordu `Apartment` ani lokalnego mapowania administratora. Nazwa obiektu służy do prezentacji, nie do ustalenia tożsamości.
- Nakładające się pobyty, blokady obiektu/jednostki oraz okno krótsze niż 60 minut wymagają sprawdzenia. Blokady dzienne zachowawczo obejmują cały ostatni dzień. Kontrakt `objects/getAll` nie dokumentuje archiwizacji i aktywności obiektu; `categories[].isActive` określa wyłącznie kategorię.
- Kolizja pobytów wymaga sprawdzenia także wtedy, gdy obie rezerwacje kończą się o tej samej godzinie. Nie powstają wtedy dwa gotowe sprzątania tego samego lokalu. Daty źródłowe są normalizowane do minut przed porównywaniem.
- Polityka przekazuje przyszły limit preferowanych 3 i maksymalnych 4 sprzątań na osobę. Ten odczyt nie sprawdza obciążenia konkretnej osoby, przejazdów ani przerw.

Przy kodach `INSUFFICIENT_WINDOW`, `OUTSIDE_WORK_HOURS`, `OCCUPANCY_OVERLAP`, `AVAILABILITY_LOCK` i `UNKNOWN_STATUS` należy pokazać koordynatorowi powód weryfikacji. `entryRequiresConfirmation: true` przypomina, że możliwość planowania nie potwierdza faktycznego wejścia do lokalu.

Funkcja domenowa zachowuje zgodność z jawnymi snapshotami starszego rodzaju: `identitySource: "legacy-mapping"`. Wyłącznie dla nich dotychczasowe mapowanie `id` i lokalne flagi mogą skutkować `UNVERIFIED_UNIT_MAPPING` lub `PROPERTY_DISABLED`. Bieżąca procedura nie tworzy takich powiązań i nie odczytuje ich z bazy. Polityka ma wersję `cleaning-candidates-v3-pending-60min`; przejście na natywne jednostki nie zmienia stabilnych ID kandydatów.

## Izolacja od panelu administratora

Nowe procedury w routerze `cleaning` to `access`, `listCandidates` oraz `listOverview`. Opisana poniżej całkowita niezależność od bazy dotyczy bazowej `listCandidates`; `listOverview` dodatkowo czyta aktywne nazwy, zdjęcia i mapowanie, bez zapisów do admina. Nie zmieniono znaczenia `listJobs`, `calendar`, `syncNow`, `assignCleaner`, trasy `/api/operations/reservations`, ekranów `/admin/*` ani schematu bazy.

Nowa procedura nie wykonuje żadnych odczytów ani zapisów bazy. Nie czyta `Reservation` ani `Apartment`, nie pobiera finansów i nie uruchamia starej synchronizacji. Katalog, lokalizacje i rezerwacje pochodzą z odczytów iDoBooking oraz osobnego cache cleaning. Nie zapisuje się automatycznie żadnych powiązań administratora.

Metody dostawcy, JSON, wersja z `IDOBOOKING_API_VERSION` (domyślnie 36):

| Metoda iDoBooking | Użycie |
| --- | --- |
| [objects/getAll](../idobooking/api/objects/getAll.md) | Pełny katalog obiektów i jednostek. |
| [objects/getLocation](../idobooking/api/objects/getLocation.md) | Lokalizacja, adres i identyfikator lokalizacji powiązane źródłowym `objectId`; brak lub niejednoznaczność są jawnie oznaczane. |
| [reservations/get](../idobooking/api/reservations/get.md) | Wszystkie statusy, wszystkie strony, `betweenDateRange`, `returnElements: ["reservationDetails", "items"]`. |
| [availabilitylocks/get](../idobooking/api/availabilitylocks/get.md) | Wszystkie strony blokad; filtrowanie zakresu po odczycie, aby zachować długie blokady. |

Współdzielony klient dostawcy oraz moduł lokalizacji cleaning wykonują wyłącznie powyższe odczyty. Cleaning ma osobne przestrzenie cache `cleaning-catalog-v2` (24 h) i `cleaning-snapshot-v2` (60 s), rozdzielone według konta, wersji API, strefy i zakresu. Nowa jednostka w rezerwacji wymusza odświeżenie katalogu. Login i hasło nie trafiają do odpowiedzi ani jawnych kluczy cache.

Odczyt wymaga istniejącej sesji `ADMIN` albo zweryfikowanego JWT cleaning z rolą `CLEANING_ADMIN`, `MANAGER` lub `ADMIN`. Zwykła rola `CLEANER` nie ma dostępu do pełnej listy kandydatów. Wynik nie zawiera nazwisk, kontaktów, płatności, kodów wejścia ani prywatnych notatek.

Nowa procedura `cleaning.access` odczytuje wyłącznie zweryfikowany kontekst bieżącego żądania. Zwraca `{ canPlan: boolean, role: string, authSource: "session" | "cleaning" }`, bez odczytów bazy i iDoBooking. Niezalogowany użytkownik otrzymuje `UNAUTHORIZED`, zwykły `CLEANER` — `canPlan: false`. Ta sama reguła uprawnień zabezpiecza listę kandydatów; informacja o dostępie w interfejsie nie zastępuje zabezpieczenia serwera.

Jeżeli żądanie zawiera zweryfikowany token cleaning, to ta tożsamość ma pierwszeństwo przed sesją aplikacji. Zalogowany `CLEANER` nie otrzyma uprawnień koordynatora przez pozostawioną w tej samej przeglądarce sesję administratora. Sesja aplikacji `ADMIN` umożliwia planowanie, gdy nie ma aktywnej tożsamości cleaning. Dotyczy to wyłącznie nowych procedur cleaning.

## Odświeżanie i błędy

`revision` i `candidateRevision` są hashami danych; czas pobrania nie powoduje zmiany rewizji. Nie dodano REST, ETag, trwałego cursora ani procesu uruchamianego dwa razy dziennie. Przyszły proces może porównywać pełne wyniki dla tego samego konta, zakresu i polityki.

Niekompletne dane lub błąd źródła zwracają `BAD_GATEWAY`; snapshot starszy niż 5 minut — `SERVICE_UNAVAILABLE`. Błędy uprawnień to `UNAUTHORIZED` / `FORBIDDEN`, niepoprawne wejście — `BAD_REQUEST`, a nieznana jednostka — `NOT_FOUND`. Komunikaty nie ujawniają surowych błędów źródła. Błąd nigdy nie udaje pustej, poprawnie odczytanej listy.

`fetchedAt` oznacza początek odczytu, więc wolna odpowiedź źródła nie odmładza pobranych wcześniej danych. Zmiana konfiguracji konta w trakcie odczytu przerywa wynik. Jawne `forceRefresh: true` omija cache serwera, a po sukcesie unieważnia wyłącznie tagi `cleaning:catalog:v2` i `cleaning:snapshot:v2` przez `revalidateTag` z Next 15. Kolejne zwykłe zapytania i powrót do wcześniejszego zakresu nie przywracają wtedy starych wpisów. Cache panelu administratora i operacji nie są unieważniane. Nieudany odczyt wymuszony nie czyści wcześniejszych wpisów; interfejs musi jawnie pokazać błąd. Zwykłe zapytania nadal korzystają z cache 60 s.

Bez lokalnej historii zadań nie można rozstrzygnąć faktycznego pobytu po anulowaniu ani wykorzystania lokali po przeniesieniu. Procedura zwraca anulowanie jako `RESERVATION_INACTIVE` w `excluded`; nie usuwa żadnego istniejącego zadania. Flagi przeniesienia zapisane w rezerwacjach admina nie są odczytywane. Funkcja domenowa ma opcjonalne wejście do oznaczenia przeniesień, ale bieżąca procedura go nie zasila. Te przypadki trzeba uwzględnić w osobnym modelu zadań przed automatycznymi przydziałami.

## Weryfikacja

25.10.2026 po rozbudowie natywnego backendu przeszło **118 testów w 10 plikach** z `src/server/cleaning` i `src/server/idobooking`, pełne sprawdzenie TypeScript oraz ESLint nowych plików. Testy wykorzystują atrapy, bez sieci i produkcyjnej bazy. Sprawdzają m.in. natywny katalog i dane lokalizacji, brak zależności od `Apartment`, rezerwacje oczekujące, stabilność ID/rewizji, 60 minut, 10–15, zmianę czasu, blokady i konflikty (również identyczne godziny wyjazdu), kompletność danych, uprawnienia i `cleaning.access`, pierwszeństwo tokenu cleaning, brak odczytu rezerwacji admina, osobne klucze cache cleaning, pomijanie prywatnych notatek również w cache oraz wymuszenie świeżego odczytu. Razem z testami UI przeszły **144 testy w 14 plikach**. [Bieżący raport](cleaning-ui-verification.json) obejmuje także rzeczywistą weryfikację w przeglądarce; [raport etapu 1](cleaning-verification.json) zachowuje historyczny zestaw 56 testów.

Panel koordynatora korzysta z tych danych do prezentacji kandydatów i powodów sprawdzenia. Trwałe zadania, przydziały pracowników i dwukrotne dzienne uzgadnianie pozostają późniejszym etapem.

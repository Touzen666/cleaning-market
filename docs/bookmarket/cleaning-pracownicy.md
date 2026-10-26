# Cleaning: pracownicy, przydziały i realizacja sprzątań

Stan opisu: **26.10.2026**, na podstawie aktualnego kodu. Dokument opisuje implementację, a nie potwierdzenie wdrożenia migracji, uruchomienia harmonogramu lub wykonania testów.

Panel działa pod `/cleaningService`, a logowanie pod `/cleaningService/login`. Koordynator przełącza obszary „Rezerwacje i okna” oraz „Sprzątania i zespół”. Pracownik korzysta z widoków „Dziś”, „Grafik”, „Dostępne” i „Profil”.

## Granice modułu

Nowe operacje należą do osobnego routera **`cleaning.workforce`**. Zadania, przydziały, lokalne korekty pobytów, zdjęcia, historia punktów i kolejka powiadomień mają własny stan cleaning. Moduł nie zapisuje przydziałów w `Reservation.cleanerUserId`, nie uruchamia synchronizacji finansowej i nie modyfikuje rezerwacji w iDoBooking.

Odczyt źródłowy wykorzystuje istniejący katalog iDoBooking, rezerwacje i blokady dostępności. Aktywny katalog `Apartment` jest odczytywany do prezentacji lokali, zdjęć i powiązań katalogowych. Kwoty i punkty opisane poniżej są lokalną ewidencją pracy cleaning, niezależną od rozliczeń pobytów.

Dotychczasowe metody `cleaning.listJobs`, `calendar`, `syncNow` i `assignCleaner` nie są API nowych przydziałów. Dalszy rozwój panelu pracowników powinien używać `cleaning.workforce.*`.

## Dostęp i role

| Tożsamość                              | Dostęp do workforce                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `CLEANER` w `CleaningUser`             | Własne zadania, dostępne nieprzydzielone zadania, realizacja pracy, profil i własna ewidencja.                    |
| `MANAGER` lub `ADMIN` w `CleaningUser` | Funkcje koordynatora: zespół, synchronizacja, korekty, przydziały, potwierdzanie wejścia, rozpatrywanie wniosków. |
| Token `CLEANING_ADMIN`                 | Funkcje koordynatora, bez własnego identyfikatora pracownika.                                                     |
| Sesja aplikacji `ADMIN`                | Funkcje koordynatora, gdy nie jest używana tożsamość cleaning.                                                    |

Dla zwykłego tokenu cleaning uprawnienia workforce są sprawdzane na podstawie aktualnego rekordu `CleaningUser`, aktywności profilu oraz wersji poświadczeń. Nieaktywny profil jest blokowany. Token cleaning ma pierwszeństwo przed sesją aplikacji; sesja administratora nie zastępuje odrzuconego tokenu cleaning.

`board` ogranicza zadania i historię ewidencji pracownika do jego identyfikatora. Zwykły pracownik nie otrzymuje w tej odpowiedzi całego źródłowego kalendarza, zespołu, reguł innych osób ani numerów telefonów kolejki powiadomień. Wyjątkiem funkcjonalnym jest osobna lista `available`: pokazuje dostępne, nieprzydzielone zadania, które można zgłosić do przyjęcia. Ostateczna kontrola dostępności następuje podczas `claim`.

Koordynator działający wyłącznie przez sesję aplikacji lub `CLEANING_ADMIN` nie ma własnego profilu pracownika. Operacje wymagające własnego zadania, salda lub zmiany własnego hasła wymagają konta `CleaningUser`.

## Modele i zapis danych

Migracja: [`20261025194000_cleaning_workforce`](../../prisma/migrations/20261025194000_cleaning_workforce/migration.sql). Definicje znajdują się w [`schema.prisma`](../../prisma/schema.prisma).

| Model                  | Przeznaczenie                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CleaningUser`         | Istniejące konto logowania: e-mail, skrót hasła i rola.                                                                                                                |
| `CleaningProfile`      | Nazwa pracownika, telefon, zdjęcie, aktywność, dzienny limit i reguły dostępności. Relacja 1:1 z kontem.                                                               |
| `CleaningWorkspace`    | Stan JSON dla konta źródłowego iDoBooking: zadania, korekty, ewidencja, wnioski profilowe, zgłoszenia odzyskania hasła i wersje poświadczeń. Osobna liczba `revision`. |
| `CleaningAsset`        | Zdjęcia wykonanej pracy, przypisane do workspace, zadania, pracownika i kategorii. Dane obrazu są przechowywane jako Data URL.                                         |
| `CleaningAuditEvent`   | Rejestr operacji: wykonawca, typ zdarzenia, zadanie i jego wersja. Nie zapisuje jawnych haseł.                                                                         |
| `CleaningNotification` | Kolejka planowanych powiadomień, telefon odbiorcy, dane zadania i klucz eliminujący duplikaty.                                                                         |

Identyfikator workspace jest wyliczany z konfiguracji konta iDoBooking. Zadanie zachowuje identyfikator kandydata oparty na koncie, rezerwacji i jednostce źródłowej. Zmiana daty lub statusu nie tworzy automatycznie nowej tożsamości zadania.

Zmiany stanu, reguł i ewidencji wykonuje `changeWorkforce` w transakcji `Serializable`, z ponowieniem konfliktu maksymalnie w czterech próbach. Operacje na zadaniu przekazują `taskId` oraz aktualny `version`. Nieaktualna wersja daje `CONFLICT`; klient powinien odświeżyć dane. Po zmianie zapisywany jest audyt i aktualizowana kolejka powiadomień.

## Reguły planowania

- Jedno sprzątanie zajmuje **60 minut**.
- Przydział musi mieścić się w pełnym bezpiecznym oknie i w godzinach **10:00–15:00, Europe/Warsaw**.
- Początek jest wybierany w odstępach co 30 minut. Nie jest przydzielany termin, którego początek już minął.
- Limit pracownika wynosi od 1 do **4 sprzątań dziennie**, domyślnie 4. Koordynator może ustawić np. 3.
- Liczą się także złożone oferty, przyjęte lub wymuszone zadania, praca w toku i zadania ukończone w tym dniu.
- Nie można nałożyć dwóch zadań jednej osoby. Uwzględniane są jej wyłączone dni, dni tygodnia i jednostki.
- Reguły nie obliczają czasu przejazdu między lokalami. Rzeczywisty układ przydziałów wymaga oceny koordynatora.

Profil dostępności ma `unavailableDates` jako listę dat ISO, `unavailableWeekdays` od 0 — niedziela do 6 — sobota, `excludedUnitIds` jako natywne identyfikatory jednostek iDoBooking oraz `note`. To ostatnie pole jest opisem dla koordynatora; algorytm nie interpretuje dowolnego tekstu jako reguły. API ogranicza listy odpowiednio do 366 dat, 7 dni tygodnia i 200 jednostek, a notatkę do 1000 znaków.

Automatyczny wybór porządkuje pracowników według liczby aktywnych zadań danego dnia, a następnie ID. Oferuje zadanie pierwszej osobie, dla której istnieje poprawny termin. W trakcie synchronizacji automatyczne oferty dotyczą bieżących **5 dni**, czyli zakresu od dziś do dziś + 5 dni z wyłącznym końcem. Sam odczyt `board` nie generuje nowych przydziałów.

## Lokalne korekty godzin pobytu

Koordynator może zapisać dla pary `reservationId` / `unitId`:

| Pole           | Znaczenie                                                                       | Wartości                                    |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| `earlyMinutes` | O ile wcześniej gość może przyjechać. Odejmowane od źródłowego początku pobytu. | 0, 30, 60, 90, 120, 150, 180 lub 210 minut. |
| `lateMinutes`  | O ile później gość może wyjechać. Dodawane do źródłowego końca pobytu.          | Ten sam zakres 0–210 co 30 minut.           |

Wartości `0` oznaczają brak korekty. Obie poprawki **wydłużają zajętość**, więc mogą zmniejszyć lub usunąć okno sprzątania. Bazą są faktyczne godziny rezerwacji — np. 21:00 nie jest zamieniane na domyślne 10:00. Kolejny zapis zastępuje poprzednią korektę danej pary, zamiast wielokrotnie dodawać przesunięcie.

`adjustStay` sprawdza istnienie rezerwacji i jednostki w aktualnym źródle, zapisuje korektę wyłącznie w workspace i przelicza zadania. `listOverview` oraz synchronizacja workforce stosują `effectiveStays`; nie wysyłają zmiany do iDoBooking. Późne wymeldowanie może przejść przez północ, dlatego odczyt operacyjny uwzględnia wtedy poprzedni dzień źródłowy.

Przykład wejścia mutacji:

```ts
await api.cleaning.workforce.adjustStay.mutate({
  reservationId: 123,
  unitId: 50,
  earlyMinutes: 30,
  lateMinutes: 60,
  from: "2026-11-01",
  to: "2026-11-08", // koniec wyłączny
});
```

Przykładowe identyfikatory służą pokazaniu kontraktu. W komponencie React odpowiednikiem jest `useMutation().mutateAsync(...)`.

## Cykl przydziału i aktualizacje rezerwacji

| Status zadania | Znaczenie                                                                                |
| -------------- | ---------------------------------------------------------------------------------------- |
| `UNASSIGNED`   | Brak aktualnego przydziału. Brak dostępnej osoby lub odmowy wymagają uwagi koordynatora. |
| `OFFERED`      | Zadanie zaoferowane konkretnej osobie i oczekujące na potwierdzenie.                     |
| `ACCEPTED`     | Pracownik przyjął ofertę albo sam przyjął dostępne zadanie przez `claim`.                |
| `FORCED`       | Koordynator przydzielił zadanie wskazanej osobie z uzasadnieniem.                        |
| `IN_PROGRESS`  | Pracownik rozpoczął realizację.                                                          |
| `DONE`         | Praca ukończona z wymaganą checklistą i dokumentacją zdjęciową.                          |
| `REVIEW`       | Zmiana źródła, konflikt albo inna przeszkoda wymagająca wyjaśnienia.                     |
| `CANCELLED`    | Rezerwacja została jednoznacznie wyłączona przez kwalifikację aktualnego źródła.         |

Pracownik może przyjąć lub odmówić oferty przed początkiem terminu. Odmowa zapamiętuje jego ID i uruchamia próbę zaoferowania zadania kolejnej dostępnej osobie. Dotyczy to statusów `OFFERED` i `ACCEPTED`; `FORCED` nie przechodzi przez zwykłą odpowiedź pracownika. Brak kolejnej osoby pozostawia zadanie bez przydziału z komunikatem dla koordynatora.

Koordynator może wybrać osobę ręcznie albo pozostawić wybór algorytmowi. `force:true` wymaga konkretnego `userId` i uzasadnienia co najmniej 5 znaków. Pozwala ponownie wybrać osobę, która wcześniej odmówiła. Nadal obowiązują jej aktywność, reguły, limit dzienny, wolny termin, pełne 60 minut i godziny 10:00–15:00. Nie można w ten sposób ominąć statusu `REVIEW`, `CANCELLED`, rozpoczętej lub zakończonej pracy.

Rezerwacje przyjęte i oczekujące tworzą potrzeby sprzątania. `toClarify`, odpowiadające obserwowanemu w iDoBooking statusowi „Oczekująca”, jest kwalifikowane jako wstępne. Dla takiego zadania koordynator musi wykonać `confirmEntry` przed rozpoczęciem pracy. Samo przyjęcie oferty przez pracownika nie wystarcza do wejścia.

Synchronizacja zachowuje ukończone zadania i ich ewidencję. Gdy zmienia się źródłowa rewizja poprawnego, nierozpoczętego przydziału, zadanie wraca do `OFFERED`, wymaga ponownego potwierdzenia i traci wcześniejszą zgodę na wejście. Termin, który przestał pasować, jest ponownie rozdzielany. Konflikt podczas pracy kieruje zadanie do `REVIEW` z komunikatem o kontakcie z pracownikiem.

Brak rekordu w nowym odczycie nie jest dowodem anulowania: zadanie trafia do sprawdzenia. `CANCELLED` jest używane przy jednoznacznym wykluczeniu rezerwacji. Zmiany poza zakresem aktualnej synchronizacji nie są interpretowane jako usunięcie.

## Realizacja, checklista i zdjęcia

Rozpoczęcie jest dostępne właścicielowi zadania w statusie `ACCEPTED` lub `FORCED`, w jego przydzielonym terminie. Dla rezerwacji wstępnej dodatkowo sprawdzana jest zgoda koordynatora na wejście. `start` zapisuje czas rozpoczęcia i zwiększa wersję zadania.

W trakcie pracy pracownik zapisuje checklistę w grupach „Przygotowanie”, „Kuchnia”, „Pokój” i „Łazienka”. Obecna lista ma 13 pozycji. Koordynator może przed rozpoczęciem dodać do 30 dodatkowych pozycji oraz ustawić lokalne wynagrodzenie i liczbę punktów. Kwota jest całkowitą liczbą groszy, nie wartością pobraną z rozliczenia rezerwacji; nowe zadania mają domyślnie 0 groszy i 0 punktów.

Ukończenie wymaga zaznaczenia wszystkich standardowych i dodatkowych pozycji oraz przynajmniej jednego zdjęcia w każdej kategorii: `kitchen`, `room`, `bathroom`. Można dodać kategorię `extra`; łącznie zadanie przyjmuje do 12 zdjęć. Zdjęcia można dodawać tylko podczas `IN_PROGRESS`.

Backend akceptuje JPEG, PNG i WebP do 200 kB po dekodowaniu, sprawdza typ Data URL i sygnaturę pliku. Interfejs przyjmuje plik do 15 MB i przed wysłaniem zmniejsza go do maksymalnie 960 pikseli na dłuższym boku oraz kompresuje. Podgląd `photo` jest ograniczony do właściwego workspace i koordynatora lub uprawnionego autora realizującego dane zadanie.

`complete` działa dla właściciela zadania w toku, w dniu sprzątania między 10:00 a 15:00. Godzina planowanego slotu i czas rzeczywistego zakończenia są odrębnymi danymi: backend nie wymaga odczekania pełnych 60 minut przed zgłoszeniem końca. Po pomyślnej weryfikacji zapisuje `DONE`, czas ukończenia i jeden wpis naliczenia nagrody dla zadania.

## Saldo, punkty i wnioski

Ewidencja w workspace obejmuje wpisy `EARN`, `PAYOUT` i `REDEEM`. Saldo sumuje kwoty, punkty i gwiazdki wpisów innych niż `REJECTED`. Pracownik widzi własne saldo i historię; koordynator może rozpatrywać wnioski o wypłatę.

- `EARN`: jednorazowe naliczenie skonfigurowanej kwoty i punktów po ukończeniu pracy.
- `PAYOUT`: pracownik wnioskuje o dodatnią kwotę groszy nieprzekraczającą salda. Wpis ma ujemną wartość i od razu rezerwuje tę część salda.
- Wniosek przechodzi `REQUESTED → APPROVED → COMPLETED`. Odrzucenie jest możliwe z `REQUESTED` lub `APPROVED`; odrzucony wpis nie obniża salda.
- `REDEEM`: wymiana punktów jest zapisywana lokalnie jako zakończona operacja ewidencyjna.

| Wariant wymiany | Koszt        | Efekt ewidencyjny | Limit obecnej implementacji       |
| --------------- | ------------ | ----------------- | --------------------------------- |
| `cash10`        | 200 punktów  | +10 zł do salda   | Raz na miesiąc dla tego wariantu. |
| `cash50`        | 600 punktów  | +50 zł            | Raz na miesiąc dla tego wariantu. |
| `cash100`       | 1000 punktów | +100 zł           | Raz na miesiąc dla tego wariantu. |
| `star`          | 1450 punktów | +0,5 gwiazdki     | Raz na rok.                       |

Okres jest liczony według czasu Warszawy. Limity dotyczą osobno poszczególnych wariantów. Gwiazdki są lokalną wartością profilu, bez integracji z ocenami zewnętrznymi.

**Żadna z tych metod nie wykonuje przelewu.** Status `COMPLETED` wypłaty jest zapisem koordynatora w aplikacji, a nie potwierdzeniem banku lub operatora płatniczego. Kod nie zawiera integracji bankowej ani wysyłki środków.

## Profil, zatwierdzanie zmian i hasła

Koordynator tworzy konta z rolą `CLEANER`, ustawia profil, limit i reguły. Nowe hasło w tym API ma 10–128 znaków. Telefon jest opcjonalny i ma format międzynarodowy, np. `+48123456789`. Aktualizacja zasad pracownika oznacza jego nierozpoczęte oferty i przydziały do ponownego sprawdzenia.

Pracownik może zapisać zdjęcie profilu bez zmiany dotychczasowej nazwy i telefonu. Zmiana nazwy, telefonu lub e-maila przechodzi przez `requestProfileChange`, z uzasadnieniem 5–500 znaków. Może istnieć jeden nierozpatrzony wniosek pracownika. `reviewProfileChange` pozwala koordynatorowi przyjąć lub odrzucić wniosek; dopiero akceptacja zmienia dane. Brakujący profil utworzony samodzielnie lub podczas takiej akceptacji ma `active:false`, więc wymaga aktywacji przez koordynatora.

Pracownik zmienia własne hasło przez `changePassword`, podając obecne hasło. Operacja zwiększa wersję poświadczeń i zwraca nowy token dla bieżącej sesji. Starsze tokeny są odrzucane przez autoryzację workforce po porównaniu wersji.

Formularz logowania ma zgłoszenie „Nie pamiętam hasła”. Publiczna metoda `requestPasswordHelp` zwraca ten sam komunikat niezależnie od istnienia konta. Istniejący pracownik otrzymuje lokalne zgłoszenie dla koordynatora; ponowne nierozwiązane zgłoszenie w ciągu 24 godzin jest pomijane. Nie jest wysyłany e-mail, SMS ani link resetujący.

Koordynator ustawia nowe hasło konkretnego pracownika przez `resetEmployeePassword`, po potwierdzeniu jego tożsamości i przekazuje je bezpiecznym kanałem. Metoda dotyczy kont `CLEANER`, oznacza zgłoszenia pomocy jako rozwiązane i zwiększa wersję poświadczeń. Nie resetuje w ten sposób haseł kont koordynatorskich.

## Kolejka WhatsApp

Obecna implementacja **przygotowuje kolejkę, lecz nie wysyła wiadomości**. Nie ma aktywnego wykonawcy transportu WhatsApp.

Po zmianie workspace `maintainOutbox` rozpatruje przyszłe przydziały `OFFERED`, `ACCEPTED` i `FORCED` na bieżące 5 dni. Wpis zawiera lokal, datę i godziny, a payload deklaruje `transport:"whatsapp-mcp"` oraz `deliveryEnabled:false`.

| Status kolejki  | Znaczenie                                                   |
| --------------- | ----------------------------------------------------------- |
| `QUEUED`        | Wpis przygotowany i dostępny telefon. Nie oznacza wysłania. |
| `MISSING_PHONE` | Brak telefonu w profilu pracownika.                         |
| `SUPERSEDED`    | Poprzednia oferta lub przydział nie jest już aktualny.      |

Klucz deduplikacji łączy zadanie z numerem kolejnej oferty. Ponowny zapis checklisty lub inna operacja nie tworzy nowej wiadomości tej samej oferty. Zmiana numeru telefonu aktualizuje oczekujące wpisy. Przyszłe włączenie wysyłki wymaga osobnego transportu, obsługi potwierdzenia dostarczenia i świadomego uruchomienia tej funkcji.

## API `cleaning.workforce`

Metody są procedurami tRPC w istniejącym `/api/trpc`; korzystają z dotychczasowego mechanizmu Bearer cleaning lub sesji aplikacji. Poniżej `task` oznacza `{taskId, version}`, a `range` — `{from, to}` w formacie `YYYY-MM-DD`, **1–31 dni, koniec wyłączny**. `Profil` oznacza `{displayName, phone, photo}`. Każda mutacja ma własną autoryzację backendu niezależnie od widoczności przycisku w UI.

| Metoda                  | Typ / dostęp                    | Główne wejście i efekt                                                                                                                                             |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `board`                 | Query / zalogowany              | `range`; zadania, profile przypisanych osób, ewidencja, rewizja i czas synchronizacji. Zakres odpowiedzi zależy od roli.                                           |
| `team`                  | Query / koordynator             | Konta `CLEANER` i ich profile, bez skrótów haseł.                                                                                                                  |
| `profile`               | Query / zalogowany              | Własny profil; dla administratora bez konta pracownika `null`.                                                                                                     |
| `available`             | Query / zalogowany              | Przyszłe zadania `UNASSIGNED`, z pominięciem odmów tej osoby; profil, reguły, limit dzienny, kolizje i pełne 60 minut są sprawdzane przez `slotFor`.               |
| `synchronize`           | Mutation / koordynator          | `range`; świeży odczyt iDoBooking, przeliczenie stanu i ofert.                                                                                                     |
| `adjustStay`            | Mutation / koordynator          | `reservationId, unitId, earlyMinutes, lateMinutes, from, to` i opcjonalne `expectedAdjustment:{earlyMinutes,lateMinutes}`; korekta z kontrolą równoczesnej zmiany. |
| `assign`                | Mutation / koordynator          | `task` i opcjonalnie `userId`, `force`, `reason`; oferta lub uzasadniony przydział wymuszony.                                                                      |
| `claim`                 | Mutation / zalogowany pracownik | `task`; samodzielne przyjęcie dostępnego zadania po kontroli terminu i limitów.                                                                                    |
| `respond`               | Mutation / właściciel zadania   | `task, accept`; przyjęcie lub odmowa.                                                                                                                              |
| `confirmEntry`          | Mutation / koordynator          | `task`; zatwierdzenie wejścia do lokalu.                                                                                                                           |
| `start`                 | Mutation / właściciel zadania   | `task`; rozpoczęcie przyjętej lub wymuszonej pracy w jej terminie.                                                                                                 |
| `saveChecklist`         | Mutation / właściciel zadania   | `task, checks`; zapis poprawnych kluczy pozycji checklisty.                                                                                                        |
| `addPhoto`              | Mutation / właściciel zadania   | `task, category, photo`; zapis zdjęcia w trakcie pracy.                                                                                                            |
| `photo`                 | Query / uprawniony do zdjęcia   | `id`; chroniony odczyt Data URL obrazu.                                                                                                                            |
| `complete`              | Mutation / właściciel zadania   | `task`; ukończenie po kontroli checklisty i zdjęć, jednorazowe naliczenie.                                                                                         |
| `configureTask`         | Mutation / koordynator          | `task, rewardCents, rewardPoints, extraItems`; konfiguracja przed rozpoczęciem.                                                                                    |
| `createEmployee`        | Mutation / koordynator          | `Profil, email, password, dailyLimit, rules`; konto `CLEANER` i profil.                                                                                            |
| `updateEmployee`        | Mutation / koordynator          | `Profil, userId, active, dailyLimit, rules`; profil i zasady konta `CLEANER`.                                                                                      |
| `saveProfile`           | Mutation / własne konto         | `Profil`; zapis zdjęcia, bez samodzielnej podmiany istniejących danych kontaktowych.                                                                               |
| `requestProfileChange`  | Mutation / własne konto         | `displayName, phone, email, reason` i opcjonalne `photo`; atomowy zapis zdjęcia i wniosku, dane kontaktowe dopiero po akceptacji.                                  |
| `reviewProfileChange`   | Mutation / koordynator          | `id, approve`; decyzja dotycząca oczekującego wniosku.                                                                                                             |
| `changePassword`        | Mutation / własne konto         | `oldPassword, newPassword`; nowe hasło, wersja poświadczeń i token.                                                                                                |
| `requestPasswordHelp`   | Mutation / publiczna            | `email`; nieujawniające istnienia konta zgłoszenie do koordynatora.                                                                                                |
| `resetEmployeePassword` | Mutation / koordynator          | `userId, password`; reset konta `CLEANER` i unieważnienie poprzedniej wersji poświadczeń.                                                                          |
| `requestPayout`         | Mutation / własne konto         | `cents`; wniosek rezerwujący środki w lokalnej ewidencji.                                                                                                          |
| `redeem`                | Mutation / własne konto         | `option`; lokalna wymiana punktów według tabeli nagród.                                                                                                            |
| `payoutStatus`          | Mutation / koordynator          | `id, status`; dopuszczalna zmiana statusu wniosku.                                                                                                                 |

`claim`, `assign`, `respond` i `start` zawsze wykonują świeży odczyt 31 dni od dnia danego zadania. Pozwala to zachować informacje o kolejnym pobycie, również gdy jest później niż następnego dnia. Uzgodnienie przed decyzją używa `autoOffer:false`: aktualizuje kwalifikację i kontroluje wersję, lecz nie rozdaje wolnej puli przed atomowym `claim`. Zwykła synchronizacja i cron nadal automatycznie oferują zadania z najbliższych 5 dni. Rzeczywista zmiana danych może zwiększyć wersję i wymagać ponowienia operacji po odświeżeniu. `sourceCoverage` chroni osobno daty zakresu przed nadpisaniem nowszego odczytu starszym. Błąd źródła pozostaje błędem, a nie pustą listą.

## Synchronizacja dwa razy dziennie i wdrożenie

Nowa trasa **`GET /api/cron/cleaning-workforce`** synchronizuje zakres 30 dni od bieżącej daty Warszawy, z wymuszeniem świeżego źródła. Nie jest to finansowy cron `daily-sync`. Kod trasy wymaga `Authorization: Bearer <CRON_SECRET>` i zwraca `401`, jeśli sekret nie jest ustawiony albo nagłówek jest niepoprawny. Nieudane przeliczenie zwraca `503`; poprzedni zapisany stan pozostaje dostępny.

`vercel.json` zawiera `0 5,17 * * *`, czyli **05:00 i 17:00 UTC**. W Warszawie jest to 06:00 i 18:00 zimą oraz 07:00 i 19:00 latem. Wpis w pliku nie potwierdza, że zadanie już działa na środowisku docelowym. Wymagane są wdrożenie, obsługa tego harmonogramu przez platformę i poprawnie skonfigurowany `CRON_SECRET`.

Wydzielona migracja `20261025194000_cleaning_workforce` dodaje tylko pięć tabel cleaning oraz relację profilu do istniejącego konta. Skrypt [apply-cleaning-workforce.mjs](../../scripts/apply-cleaning-workforce.mjs) stosuje wyłącznie ten plik SQL, odmawia nadpisania częściowego schematu i rejestruje sumę migracji. Nie uruchamia starszych zaległych migracji projektu. Wymaga właściwych zmiennych połączenia wybranego środowiska; po zmianie schematu należy wygenerować klienta Prisma. Lokalna baza używana przez aplikację otrzymała tę migrację w tej sesji. Nie wykonano wdrożenia zdalnego ani zmian panelu admina.

Odczyt tablicy w UI jest odświeżany co 60 sekund. Nie zastępuje to synchronizacji źródła ani crona. Ręczny przycisk synchronizacji w obszarze workforce zapisuje wynik przeliczenia w lokalnych tabelach cleaning, więc nie jest wyłącznie odczytem podglądu.

## Pliki implementacji

- [`cleaning-workforce.ts`](../../src/server/api/routers/cleaning-workforce.ts) — router, autoryzacja i walidacja operacji.
- [`workforce-domain.ts`](../../src/server/cleaning/workforce-domain.ts) — terminy, przydziały, statusy, korekty i naliczenia.
- [`workforce-store.ts`](../../src/server/cleaning/workforce-store.ts) — transakcje, odczyt źródła, uzgadnianie stanu i kolejka.
- [`cleaning-workforce.ts` w lib](../../src/lib/cleaning-workforce.ts) — wspólna checklista, grupy zdjęć i warianty nagród.
- [`workforce-panel.tsx`](../../src/app/cleaningService/_components/workforce-panel.tsx) — widoki koordynatora i pracownika.
- [`cleaning-workforce/route.ts`](../../src/app/api/cron/cleaning-workforce/route.ts) oraz [`vercel.json`](../../vercel.json) — chroniony harmonogram synchronizacji.

Opis rezerwacji i kalendarza: [cleaning-kalendarz.md](cleaning-kalendarz.md). Źródłowy odczyt i kontrakt kandydatów: [cleaning-backend-etap-1.md](cleaning-backend-etap-1.md).

Wyniki i ograniczenia sprawdzenia: [cleaning-pracownicy-weryfikacja.md](cleaning-pracownicy-weryfikacja.md).

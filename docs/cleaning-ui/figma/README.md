# Materiał Figma: przepływ pracy cleanera

Źródło: [Portfolio — ekrany cleanera, node 908-20692](https://www.figma.com/design/igqcmmKYvRpOe1fUaXtLBa/Portfolio?node-id=908-20692&p=f).

Do dokumentacji dołączono **10 grupowych zrzutów JPG** płótna Figma. Pokazują kolejne obszary i warianty ekranów widoczne podczas przeglądu źródła; nie są zestawem osobnych eksportów każdej ramki. Część sąsiednich ekranów występuje w więcej niż jednej grupie. Zrzuty zachowano bez przekształcania, a nazwy opisują główny fragment procesu.

Plik [manifest.json](manifest.json) podaje rozmiar i SHA-256 każdej kopii. Przy kopiowaniu potwierdzono zgodność 10 z 10 plików ze zrzutami roboczymi. Jest to kontrola archiwum obrazów, bez deklaracji zakończenia testów aplikacji.

## Mapa ekranów i implementacji

| Grupa                                                                     | Co pokazuje materiał źródłowy                                                                           | Odpowiednik w aktualnej aplikacji                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [01 — checklista, zdjęcia, profil](01-checklist-photos-profile.jpg)       | Przejście przez pozycje sprzątania, kategorie zdjęć, profil i historię.                                 | Szczegóły zadania, `saveChecklist`, `addPhoto`, `photo`, widok „Profil”.                                          |
| [02 — szczegóły i wnioski wypłaty](02-details-payout-requests.jpg)        | Opis lokalu i pracy oraz stany zlecenia wypłaty i historii.                                             | Szczegóły przydziału; `requestPayout`, `payoutStatus`, saldo i historia ewidencji.                                |
| [03 — logowanie i rozpoczęcie korzystania](03-login-onboarding.jpg)       | Logowanie, odzyskanie hasła, profil i przejście do listy mieszkań.                                      | `/cleaningService/login`, zgłoszenie pomocy z hasłem, profil pracownika i wejście do własnego panelu.             |
| [04 — szczegóły lokalu i przyjęcie](04-apartment-details-claim.jpg)       | Lista lokali, opis standardowych i dodatkowych czynności, galeria oraz decyzja o rezerwacji sprzątania. | „Dostępne”, szczegóły zadania, `claim`; dla zadania zaoferowanego `respond`.                                      |
| [05 — przyjęcie, rozpoczęcie i ukończenie](05-reserve-start-complete.jpg) | Potwierdzenie przyjęcia pracy, rozpoczęcie, wykonywanie checklisty i przejście do zdjęć.                | `claim` lub `respond`, następnie `start`, `saveChecklist`, `addPhoto` i `complete`.                               |
| [06 — dodatkowa checklista](06-extra-checklist.jpg)                       | Dodatkowe czynności i blokada końca pracy do ich wykonania.                                             | Koordynator ustawia `extraItems` przez `configureTask`; pracownik musi zaznaczyć je obok standardowej checklisty. |
| [07 — dowody ukończenia](07-completion-proof.jpg)                         | Brak wymaganych dowodów, dodawanie zdjęć, odblokowanie końca i potwierdzenie nagrody.                   | Wymagane zdjęcia kuchni, pokoju i łazienki oraz komplet checklisty; `complete` nalicza nagrodę jeden raz.         |
| [08 — profil i historia](08-profile-history.jpg)                          | Saldo, zlecenia, historia oraz wejście do wymiany punktów.                                              | „Profil”: własne dane, kwota, punkty, gwiazdki i historia wpisów ewidencyjnych.                                   |
| [09 — wymiana punktów](09-points-redemption.jpg)                          | Warianty wymiany punktów i komunikaty o ograniczeniach.                                                 | `redeem`: 200/600/1000 punktów na 10/50/100 zł oraz 1450 punktów na 0,5 gwiazdki, z limitami okresu.              |
| [10 — wniosek zmiany profilu](10-profile-edit-request.jpg)                | Edycja danych, uzasadnienie wniosku, komunikat złożenia i historia.                                     | `requestProfileChange`; koordynator rozpatruje go przez `reviewProfileChange`.                                    |

## Przepływ funkcjonalny

1. Koordynator tworzy konto pracownika, jego profil, limit dzienny i reguły dostępności. Pracownik loguje się w osobnym panelu cleaning.
2. Synchronizacja odczytuje rezerwacje i wyznacza zadania. Koordynator widzi także lokalne korekty godzin, konflikty i przydziały.
3. Pracownik przyjmuje ofertę lub sam wybiera dostępne zadanie. Odmowa oferty kieruje je do kolejnej dostępnej osoby; brak osoby wymaga reakcji koordynatora.
4. Przyjęta praca trafia do własnego widoku dnia i grafiku. Wstępna rezerwacja wymaga zgody koordynatora na wejście.
5. Pracownik rozpoczyna zadanie w wyznaczonym terminie, wykonuje standardowe i dodatkowe czynności oraz dodaje wymagane zdjęcia.
6. Ukończenie zapisuje historię pracy, lokalne wynagrodzenie i punkty. Profil pozwala złożyć wniosek o wypłatę, wymienić punkty lub poprosić o zmianę danych.

Podział nawigacji w kodzie to „Dziś”, „Grafik”, „Dostępne” i „Profil”; koordynator ma dodatkowo „Rezerwacje i okna” oraz „Sprzątania i zespół”. Nazwy w prototypie, np. „Lista mieszkań” i „Twoje rezerwacje”, opisują te same etapy z perspektywy pracownika. Szczegółowy kontrakt i statusy opisuje [dokumentacja workforce](../../bookmarket/cleaning-pracownicy.md).

## Świadome różnice między prototypem a kodem

| Obszar                  | Zachowanie implementacji                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zdjęcie profilu         | Jest opcjonalne. Brak zdjęcia zastępują inicjały; nie blokuje on przejścia do pracy. To odrębna zasada od obowiązkowych zdjęć wykonanej pracy.                                                             |
| Odzyskanie hasła        | Zgłoszenie trafia do koordynatora w aplikacji. Koordynator potwierdza tożsamość, ustawia nowe hasło i przekazuje je bezpiecznym kanałem. Nie jest wysyłany automatyczny e-mail ani link resetujący.        |
| Dane kontaktowe         | Zmiana nazwy, telefonu i e-maila wymaga wniosku z uzasadnieniem i ręcznej decyzji koordynatora. Zdjęcie profilu można zmienić osobno.                                                                      |
| Przydział i terminy     | Obowiązuje 60 minut, godziny 10:00–15:00 Warszawy i maksymalnie 4 zadania dziennie, z uwzględnieniem kolizji oraz dostępności. Przykładowe godziny na makietach nie zastępują tych reguł.                  |
| Przydział wymuszony     | Koordynator wskazuje osobę i uzasadnienie. `force` nie omija limitu, niedostępności ani konfliktów godzin.                                                                                                 |
| Wynagrodzenie i wypłata | Kwota i punkty należą do lokalnej ewidencji cleaning. Wniosek oraz jego status nie wykonują przelewu i nie potwierdzają operacji bankowej.                                                                 |
| Powiadomienia WhatsApp  | Powstaje kolejka `QUEUED` / `MISSING_PHONE` / `SUPERSEDED` z `deliveryEnabled:false`. Implementacja nie wysyła wiadomości.                                                                                 |
| Warstwa wizualna        | Kod używa obecnego stylu Bookmarket, układu dla telefonu i komputera oraz jednoznacznych stanów dostępu, błędu i oczekiwania. Zrzuty Figma stanowią materiał procesu, nie dowód zgodności piksel w piksel. |

## Weryfikacja

Końcowy przegląd UI i API nowego workforce pozostaje **oczekujący**. Plan i miejsce na wyniki znajdują się w [osobnym dokumencie weryfikacji](../../bookmarket/cleaning-pracownicy-weryfikacja.md). Zrzuty Figma pokazują projekt procesu; zrzuty działającej aplikacji powinny być dodawane oddzielnie po wykonaniu scenariuszy.

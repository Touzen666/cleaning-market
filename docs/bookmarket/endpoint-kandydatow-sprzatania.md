# Kandydaci do sprzątania — aktualny kontrakt

Stan: **25.10.2026**. Backend i panel koordynatora `/cleaningService` korzystają z nowych metod `cleaning.access` oraz `cleaning.listOverview` (lista i kalendarz); bazowa `cleaning.listCandidates` pozostaje dostępna. Wynik to przygotowana lista sprzątań i pozycji wymagających sprawdzenia. Nie tworzy grafiku, zadań ani przydziałów pracowników.

Pełny opis implementacji: [backend](cleaning-backend-etap-1.md), [panel i weryfikacja w przeglądarce](cleaning-ui-etap-2.md), [przykładowy JSON](cleaning-candidates.example.json). Wcześniejszy przegląd i propozycje zachowano w [historycznym projekcie](endpoint-kandydatow-sprzatania-historyczny-projekt.md).

## Reguła biznesowa

Sprzątanie powstaje jako kandydat po wyjeździe z rezerwowalnej jednostki iDoBooking. Rezerwacje przyjęte i oczekujące tworzą oczekiwane sprzątanie od momentu pojawienia się w kalendarzu; nie czekamy na opłacenie lub rozpoczęcie pobytu. Oczekujące oznaczone są `certainty: provisional` i mogą się później zmienić.

- Jedno sprzątanie trwa **60 minut**.
- Okno mieści się w **10:00–15:00 Europe/Warsaw**, z prawidłową zmianą czasu.
- Późniejszy rzeczywisty wyjazd lub wcześniejszy przyjazd zawężają okno. Wymagane jest całe 60 minut; koniec dokładnie o 15:00 jest dopuszczalny.
- Brak następnego przyjazdu nie usuwa sprzątania po wyjeździe. Puste dni nie tworzą kolejnych sprzątań.
- Rezerwacje oczekujące i nieznane statusy również blokują zajętość.
- Polityka przekazuje preferowane najwyżej 3 i maksymalnie 4 sprzątania na osobę; nie sprawdza jeszcze obciążenia pracownika ani przejazdów.

Klucz `checkout:<konto>:<reservationId>:<objectItemId>` nie zawiera dat ani statusu. Zmiana daty lub przyjęcie oczekującej rezerwacji aktualizuje tę samą pozycję. Dwa pokoje jednej rezerwacji mają osobne klucze.

| Status źródłowy | Klasyfikacja |
| --- | --- |
| `accepted`, `confirmed`, `inProgress`, `completed` | Przyjęta, `certainty: accepted`. |
| `waitingForPayment`, `paymentInProgress`, `unconfirmed`, `toClarify` | Oczekująca / nieopłacona, `certainty: provisional`. Brak wpłaty nie oznacza anulowania. |
| `canceled`, `cancelled`, `withdrawn` | `excluded`, powód `RESERVATION_INACTIVE`. |
| `invalidCardNumber` i inne nieznane statusy | Nadal blokują zajętość, własne sprzątanie trafia do `reviews`. |

Obsługiwane są również lokalne etykiety. Oryginalny `sourceStatus` pozostaje w odpowiedzi. Zakończone lub ręcznie skorygowane zadanie nie może być później automatycznie usuwane na podstawie samego anulowania rezerwacji; historia zadań będzie osobnym etapem.

## Niezależność od panelu admina

Nowa [projekcja listy i kalendarza `cleaning.listOverview`](cleaning-kalendarz.md) zgodnie z poleceniem użytkownika odczytuje aktywny katalog Apartment oraz zdjęcia. Jest to wyłącznie odczyt; pobyty nadal pochodzą bezpośrednio z iDoBooking. Poniższy opis niezależności katalogowej dotyczy bazowej `listCandidates`.

Nowa procedura nie czyta ani nie zapisuje `Apartment`, `Reservation`, finansów lub przydziałów panelu admina. Nie wywołuje `syncNow` ani dziennej synchronizacji.

Tożsamość jednostki pochodzi z pełnego katalogu iDoBooking: `objects[].items[].id` jest tym samym `objectItemId`, do którego odwołują się rezerwacje. `objectId` oznacza obiekt nadrzędny i nie zastępuje ID pokoju. Nie dopasowujemy lokali po nazwach i nie tworzymy powiązań z rekordami administratora.

Jednostka w odpowiedzi ma `mapping: source-id`, `identitySource: idobooking` i `apartmentId: null`. Adres pochodzi z `objects/getLocation`; brak lub niejednoznaczność są jawne w `locationStatus`. Brak adresu nie usuwa poprawnej rezerwacji z listy. Przed fizycznym wejściem i przyszłym przydziałem trzeba potwierdzić adres oraz dostęp.

`objects/getAll` nie dokumentuje archiwizacji ani blokady sprzedaży jednostki. Nie wnioskujemy ich z `categories[].isActive`. Ewentualne przyszłe wyłączenia operacyjne powinny należeć do cleaning.

## Źródła

Wszystkie wywołania są serwerowymi odczytami przez HTTPS, HTTP POST, JSON, domyślnie API 36:

| Metoda | Zastosowanie |
| --- | --- |
| [reservations/get](../idobooking/api/reservations/get.md) | Wszystkie statusy i wszystkie strony; `betweenDateRange`, także pobyty zaczęte przed początkiem zakresu. |
| [objects/getAll](../idobooking/api/objects/getAll.md) | Pełny katalog obiektów i unikalnych jednostek. |
| [objects/getLocation](../idobooking/api/objects/getLocation.md) | Adresy po `objectId`, w partiach do 100 identyfikatorów. Nowy odczyt używany wyłącznie przez cleaning. |
| [availabilitylocks/get](../idobooking/api/availabilitylocks/get.md) | Blokady jednostki i obiektu; wszystkie strony do pustej strony, filtrowanie zakresu po odczycie. |

## Zapytanie i wynik

```ts
api.cleaning.listCandidates.useQuery({
  from: "2026-10-25",
  to: "2026-11-01", // wyłączne, maksymalnie 31 dni
  includeReviews: true,
});
```

Opcjonalne `unitId` filtruje wynik po zbudowaniu pełnego kontekstu zajętości. `forceRefresh: true` pomija cache cleaning i po sukcesie unieważnia wyłącznie jego tagi. Dowolne nadpisywanie polityki przez parametry jest odrzucane.

Wynik zawiera:

- `candidates`: gotowe do planowania, przyjęte i wstępne;
- `reviews`: nieznane statusy, kolizje, blokady lub brak pełnego okna, z kodami powodów;
- `excluded`: jawnie nieaktywne rezerwacje;
- `counts`, `policy`, `source`, `from`, `to`, `timeZone`;
- `revision`, `candidateRevision` i osobne `fetchedAt`.

Rewizje nie zależą od samego czasu pobrania. `windows` ma ISO z offsetem Warszawy. `checkoutLocal` / `checkinLocal` zachowują lokalne godziny panelu. `nextArrivalKnownThrough` ogranicza wiedzę o następnym przyjeździe do końca odczytanego zakresu. Nie zwracamy `cleanerId`, `scheduledStart`, danych gości, płatności ani prywatnych notatek.

`entryRequiresConfirmation: true` oznacza możliwość planowania, a nie potwierdzenie faktycznego wyjazdu czy wejścia do lokalu.

## Dostęp, błędy i odświeżanie

Zweryfikowany JWT cleaning ma pierwszeństwo przed sesją aplikacji. `CLEANING_ADMIN`, `MANAGER`, `ADMIN` mogą odczytać kandydatów; zwykły `CLEANER` nie. Sesja aplikacji `ADMIN` działa przy braku aktywnego tokenu cleaning. `cleaning.access` służy do wykrycia uprawnień bez odczytu danych rezerwacji.

Niekompletne źródło zwraca `BAD_GATEWAY`, a snapshot starszy niż 5 minut — `SERVICE_UNAVAILABLE`. Błąd nie jest pustą listą. Niepoprawne wejście daje `BAD_REQUEST`, brak dostępu `UNAUTHORIZED` / `FORBIDDEN`, nieznana jednostka `NOT_FOUND`.

Katalog i lokalizacje mają własny cache 24 h, rezerwacje i blokady 60 s. Jawne odświeżenie pobiera wszystkie dane od nowa. Cache jest rozdzielony według konta, wersji API, strefy i zakresu; istniejący cache admina i operacji pozostaje niezależny.

Panel odświeża otwartą kartę co 12 godzin i pozwala odświeżyć ręcznie. **To nie jest niezależny proces serwerowy.** Dwukrotne dzienne uzgadnianie trwałych zadań, przydziały i historia wykonania pozostają późniejszym etapem, zgodnie z zakresem pracy nad samą listą sprzątań.

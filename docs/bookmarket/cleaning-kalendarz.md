# Cleaning — lista rezerwacji i kalendarz

Stan lokalnego kodu: **25.10.2026**. Ekran `/cleaningService` ma przełącznik **Lista / Kalendarz** i korzysta z nowej procedury **`cleaning.listOverview`**. Nie jest to ekran podglądu fixture: po zalogowaniu koordynator otrzymuje rzeczywiste dane iDoBooking. `/cleaningService/preview` pozostaje wyłącznie pomocniczym podglądem developerskim.

## Widoki

- Kalendarz: aktywne apartamenty ze zdjęciem i nazwą po lewej, dni na osi poziomej, paski pobytów od rzeczywistego zameldowania do wymeldowania. Nakładające się pobyty mają osobne pasy.
- Osobny pas okien sprzątania: godziny, 60 minut zadania i informacja „wstępne” dla oczekujących. Cienki znacznik na osi pokazuje dokładny zakres godzin; szersza karta pod nim ułatwia odczyt i otwarcie szczegółów.
- Kliknięcie pobytu, okna lub blokady otwiera szczegóły. Brak kolejnego przyjazdu opisany jest jako brak w sprawdzonym zakresie, bez obietnicy dalszej dostępności.
- Lista: tabela rezerwacji z pełnymi datami, godzinami, statusem, lokalem i oknem po wyjeździe; poniżej szczegóły kandydatów do sprzątania.
- W obu widokach działają wyszukiwanie, zakres 1/3/7/14/30 dni, kwalifikacja i filtr statusu. Kalendarz zachowuje wszystkie aktywne pobyty jako kontekst zajętości również przy filtrowaniu okien oczekujących. Nawigacja obejmuje dziś, poprzedni i następny okres.
- Na telefonie oś czasu i tabela przewijają się wewnątrz panelu. Nazwy apartamentów i nagłówki kalendarza pozostają przyklejone.

Nie dodano przydziałów, automatycznego grafiku ani zapisu zadań. 60 minut oznacza czas zadania; przedział 10–15 oznacza wybór godziny, a nie pięć godzin sprzątania. Rzeczywiste godziny przyjazdów i wyjazdów mogą ograniczyć lub wykluczyć okno.

## Nowy endpoint i izolacja admina

```ts
api.cleaning.listOverview.useQuery({
  from: "2026-10-25",
  to: "2026-11-01", // wyłączne
  includeReviews: true,
  // unitId: 50,
  // forceRefresh: true,
});
```

Wejście, reguły dostępu, limit 1–31 dni i obsługa błędów są takie jak w `cleaning.listCandidates`. Wymagana jest rola koordynatora (`CLEANING_ADMIN`, `MANAGER`, `ADMIN`) albo sesja aplikacji ADMIN. Token cleaning ma pierwszeństwo; CLEANER nie może pobrać pełnej listy. Autoryzacja następuje przed odczytami.

Odpowiedź zawiera dotychczasowe `candidates`, `reviews`, `excluded`, `counts`, `policy`, rewizję i czas odczytu oraz:

| Pole | Zawartość |
| --- | --- |
| `overview.units` | Potwierdzone aktywne jednostki: `unitId`, `objectId`, `apartmentId`, `label`, `code`, `address`, `imageUrl`, `mapping`, `active`. |
| `overview.reservations` | Pełne pobyty przecinające sprawdzony zakres: `id`, `unitId`, `from`, `to`, surowy `status`, `certainty`. Bez danych gości i płatności. |
| `overview.locks` | Powiązane blokady, z identyfikatorami i zakresem; bez prywatnych notatek. Ostatni dzień blokady dziennej jest włączony. |
| `overview.mappingIssues` | Jednostki źródłowe wyłączone z aktywnych wierszy: `unmapped`, `ambiguous`, `archived`. Nie są po cichu przypisywane. |
| `overview.unmappedApartments` | Aktywne lokale Bookmarket bez jednostki źródłowej. Nie prezentuje się dla nich fałszywie pustego kalendarza. |
| `source.catalogSource` | `active-admin-readonly`. |

Natywne `objectItemId` jest jedynym kluczem przypisania pobytów do jednostek. Nowy endpoint czyta katalog `Apartment` **wyłącznie do prezentacji i potwierdzenia aktywnego lokalu**: `archived:false`, ID, nazwa, adres, `idobookingId`, zdjęcia i kody Room. Dodatkowy odczyt z archiwalnych rekordów pobiera tylko `idobookingId` dla jednostek źródłowych, aby nie przywrócić archiwalnego lokalu przez nazwę. Nie pobiera finansów, właścicieli ani lokalnych Reservation.

Najpierw stosowane jest dokładne `Apartment.idobookingId = objectItemId`, następnie wyłącznie jednoznaczna pełna nazwa po NFC, redukcji białych znaków i zmianie wielkości liter. Brak dopasowania oraz kolizja trafiają do weryfikacji. Nie stosuje się dopasowania rozmytego ani zamiany `objectId`, `Room.code` lub `Apartment.id` na `objectItemId`. Dla wielu jednostek potrzebne są osobne, jednoznaczne kody pokoi; wiersze nie są scalane.

Cała zajętość i blokady są oceniane **przed** filtracją katalogu i `unitId`. Niepewne powiązanie nie publikuje gotowego sprzątania. Stara `cleaning.listCandidates` nadal działa bez odczytu lokalnego katalogu. Nie zmieniono starych metod admina, schematu bazy ani synchronizacji. Nowy endpoint nie wykonuje zapisów do żadnego systemu.

## Porównanie z rzeczywistością

25.10.2026 odczytano panel [iDoBooking — lista rezerwacji](https://client47056.idobooking.com/panel/app/reservation/list) oraz katalog miejsc noclegowych przez Chrome. Osobny odczyt HTTPS/Prisma porównał katalog i osiem wskazanych rezerwacji. [Bezpieczny raport JSON](cleaning-live-mapping.json) zachowuje tylko ID, nazwy, statusy, daty i obecność zdjęcia głównego.

- iDoBooking: **13 jednostek w 13 obiektach**. Bookmarket: **14 aktywnych i 19 archiwalnych** lokali; każdy aktywny ma zdjęcie główne. Wszystkie `Apartment.idobookingId` były puste.
- Wszystkie 13 źródłowych jednostek ma jednoznaczny odpowiednik w aktywnym katalogu po pełnej nazwie.
- „Apartament Przyjazna Przystań”, lokal #5, nie ma jednostki w aktualnym katalogu iDoBooking. Przyczyna nie została ustalona; ekran wyraźnie zgłasza ten brak.
- #4717, #4718, #4719 i #4720: API **`toClarify`**, panel **„Oczekująca”**. Cleaning klasyfikuje je odtąd jako `provisional`. Nie zmieniono historycznej etykiety w synchronizacji admina. Polityka: `cleaning-candidates-v3-pending-60min`.
- #4720: Lazurowe, `unitId=50`, `objectId=38`, kod `49`, lokal Bookmarket #37; 26.10 15:00 → 30.10 10:00. Rzeczywisty panel cleaning pokazuje okno wstępne 30.10 10–15.
- #4727: Strefa Zen, jednostka #21, obiekt #17; 25.10 13:00 → 27.10 10:00. #4721 i #4729 mają wymeldowanie odpowiednio o **21:00** i **20:00**; te godziny są zachowane i wykluczają sprzątanie tego dnia w oknie 10–15.

Rzeczywisty odczyt nowego UI około **18:53 Europe/Warsaw** dla 25–31.10 dał 25 gotowych kandydatów (24 przyjęte, 1 wstępny), 3 do sprawdzenia i 8 nieaktywnych. Dla 25.10–23.11 (30 dni) o 19:04 wynik wyniósł 62 gotowe (58 przyjętych, 4 wstępne), 7 do sprawdzenia i 15 nieaktywnych. UI potwierdził także trzy oczekujące pobyty Zamkowego #4717–4719. Są to liczby pojedynczego odczytu, nie stałe wartości ani gotowy grafik.

## Weryfikacja

**166 testów w 17 plikach — PASS.** Obejmują klasyfikację, kompletność źródła, uprawnienia przed odczytem, brak finansowych zapytań, aktywny katalog, ochronę archiwalnych ID, kolizje nazw/kodów, rozdzielność identyfikatorów, rzeczywiste godziny, geometrię osi, konflikty, listę, szczegóły i nawigację. TypeScript i ESLint sprawdzono dla bieżącego kodu.

Testy automatyczne używają atrap. Rzeczywisty UI sprawdzono na lokalnym dev serverze przez Chrome w izolowanym procesie QA, dopuszczającym tylko nowe odczyty cleaning. Testowe role miały sekret wyłącznie tego procesu i nie tworzyły kont ani rekordów w bazie. Sprawdzenie nie oznacza wdrożenia produkcyjnego.

Implementacja: `src/server/api/routers/cleaning-overview.ts`, `src/server/cleaning/overview.ts`, `src/app/cleaningService/_components/cleaning-calendar.tsx`, `calendar-model.ts`, `reservation-list.tsx` oraz kontroler `/cleaningService/page.tsx`.

## Dowody wizualne

- [Kalendarz na rzeczywistych danych](../cleaning-ui/calendar-real-apartments.jpg)
- [Lista i rezerwacja #4720](../cleaning-ui/calendar-real-list.jpg)
- [Szczegóły rezerwacji #4720](../cleaning-ui/calendar-real-reservation-4720.jpg)
- [Konflikt #4721 / #4656](../cleaning-ui/calendar-real-overlap.jpg)
- [Telefon](../cleaning-ui/calendar-real-mobile.jpg)
- [Źródłowy katalog iDoBooking](../cleaning-ui/idobooking-source-apartments.jpg)
- [Maszynowy raport testów i odczytów](cleaning-ui-verification.json)

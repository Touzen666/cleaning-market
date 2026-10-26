# Panel cleaning — interfejs i weryfikacja

Aktualizacja: [właściwa lista i kalendarz z aktywnymi apartamentami oraz weryfikacją w iDoBooking](cleaning-kalendarz.md). Panel używa teraz `cleaning.listOverview`; opis i liczby poniżej zachowują wcześniejszy etap bazowej listy. `toClarify` jest obecnie oczekującą rezerwacją.

Stan wcześniejszego etapu: **25.10.2026**. Nowy panel `/cleaningService` jest podłączony do niezależnego backendu cleaning. Nie wdrożono zmian na produkcję i nie wygenerowano grafiku.

## Co działa

- Widok koordynatora z licznikami sprzątań gotowych, przyjętych, oczekujących oraz wymagających sprawdzenia.
- Zakładki „Do planowania”, „Do sprawdzenia”, „Wycofane”; wyszukiwanie nazw, adresów, kodów, numerów rezerwacji i jednostek oraz filtr statusu.
- Zakres od wybranego dnia: 1, 3, 7, 14 albo 30 dni; lista i grupowanie według dni.
- Szczegóły wyjazdu i kolejnego przyjazdu, okno w godzinach Warszawy, szacunek 60 minut oraz czytelne powody konfliktów.
- Ręczne pobranie nowych danych przez `forceRefresh`, z ochroną przed cofnięciem cache i spóźnioną odpowiedzią po zmianie zakresu lub wylogowaniu.
- Stany ładowania, błędu, pustego wyniku i starego odczytu. Błąd nie pokazuje fałszywego „brak sprzątań”; po utracie uprawnień dane znikają.
- Osobny wygląd i logowanie cleaning. Nagłówek nie prowadzi do panelu administratora. Zmiana konta i wylogowanie czyszczą cache cleaning.

Adres i identyfikatory jednostki pochodzą z iDoBooking. Brak lub niejednoznaczność adresu są widoczne; sprzątanie nie jest po cichu usuwane. Nazwa lub kod nie zastępują źródłowego `objectItemId`.

Zwykły pracownik otrzymuje ograniczony widok bez pełnego feedu rezerwacji. Nowy ekran nie udaje listy przydzielonych zadań: trwałe zadania, wykonanie i przydziały nie zostały jeszcze zbudowane. Usunięto z tego ekranu przycisk starej synchronizacji finansowej i link do nieistniejących szczegółów zadania. Stare procedury używane przez admina pozostają bez zmian.

## Ważne pliki

| Plik | Odpowiedzialność |
| --- | --- |
| `src/app/cleaningService/page.tsx` | Uprawnienia, zapytanie, odświeżanie i wylogowanie. |
| `src/app/cleaningService/_components/candidates-panel.tsx` | Prezentacja listy, filtrów, konfliktów i dni. |
| `src/app/cleaningService/_components/view-model.ts` | Daty w Warszawie, zakresy, wyszukiwanie i komunikaty. |
| `src/app/cleaningService/login/page.tsx` | Formularz logowania i jawne wejście z istniejącej sesji administratora. |
| `src/app/cleaningService/preview/*` | Podgląd fikcyjnych danych, wyłącznie development; poza nim `notFound`. |
| `src/app/layout.tsx` | Wyłączenie wspólnego nagłówka/stopki tylko dla ścieżek cleaning. |

## Weryfikacja w przeglądarce

Uruchomiono Next dev na `127.0.0.1:3100` i sprawdzono Chrome przez kontrolę przeglądarki. Weryfikacja obejmowała widok desktopowy i szerokość telefonu 390 px, wyszukiwanie bez polskich znaków, status oczekujący, szczegóły, konflikty, listę dni, pusty wynik, błąd, ładowanie i odświeżanie. Poprawiono zwężające się pole wyszukiwania na telefonie oraz datę odczytu na granicy doby UTC/Warszawa.

Rzeczywisty odczyt iDoBooking przetestowano w osobnym lokalnym procesie QA z losowym sekretem procesu i krótkotrwałymi rolami testowymi. Dopuszczał wyłącznie nowe metody odczytu cleaning; pozostałe API, w tym cron i stara synchronizacja, były blokowane. Nie tworzono kont ani rekordów w bazie. Po teście wylogowano rolę testową, zatrzymano proces QA i przywrócono zwykły dev server. Izolowany skrypt QA znajduje się poza repozytorium aplikacji.

Wynik odczytu **25.10.2026 około 13:35 Europe/Warsaw**:

| Zakres wyjazdów | Gotowe do planowania | Do sprawdzenia | Nieaktywne |
| --- | ---: | ---: | ---: |
| 25–31 października, 7 dni | 24 | 4 | 8 |
| 25 października–23 listopada, 30 dni | 58 | 11 | 15 |

To dowód pojedynczego odczytu, nie stałe liczby ani wygenerowany grafik. W tych zakresach nie występowały gotowe pozycje oczekujące; ich obsługę sprawdzono na fikcyjnych danych i testami. Rzeczywiste powody weryfikacji obejmowały za krótkie okna, nakładające się pobyty i status wymagający wyjaśnienia.

Testowy `MANAGER` widział panel koordynatora; `CLEANER` widział wyłącznie ograniczony panel pracownika. Niezalogowane wywołania obu nowych procedur zwróciły HTTP 401. Formularz logowania odrzucił nieistniejące konto. Lokalny problem TLS konta sandboxa rozwiązano przez uruchomienie dev servera na koncie użytkownika, bez wyłączania kontroli certyfikatów.

Automatyczne testy i ich dokładne polecenia zawiera [raport weryfikacji](cleaning-ui-verification.json). Obejmują także unieważnianie cache wyłącznie cleaning, role, brak odczytu tabel admina, zmianę zakresu podczas odświeżania i wylogowanie podczas oczekującego żądania.

## Odtworzenie podglądu

```powershell
node node_modules\next\dist\bin\next dev --port 3100 --hostname 127.0.0.1
```

Adres panelu: `http://127.0.0.1:3100/cleaningService`. Podgląd bez prawdziwych danych: `http://127.0.0.1:3100/cleaningService/preview`. Nie używano skryptu `npm run dev`, ponieważ zmienia numer wersji aplikacji.

Na produkcji podgląd fikcyjnych danych jest niedostępny. Testy nie obejmują wdrożenia produkcyjnego ani rzeczywistych przydziałów pracowników. Dwukrotne dzienne uzgadnianie zadań wymaga osobnego procesu serwerowego i modelu zadań; odświeżanie otwartej karty co 12 godzin go nie zastępuje.

# Dokumentacja iDoBooking — archiwum

Kopia z 24.10.2026. [Otwórz przeszukiwalny spis HTML](index.html). [Raport kompletności i sumy SHA-256](coverage.json).

## Zakres

Zapisano 122 ścieżki z pełnymi zrzutami stron: 14 bramek, wszystkie 80 metod JSON wersji 36, indeks API, strony bocznego menu deweloperskiego, dodatkowy link menu.tpl, dwie używane metody wersji 34 oraz zatwierdzony poradnik zewnętrzny. Pola żądań: 933; pola odpowiedzi: 1419; przykłady PHP: 82.

Każda metoda zawiera Markdown z tabelami wszystkich pól, czytelny HTML offline, JSON z polami i metadanymi, pełny przykład PHP oraz pełny zrzut JPG oryginalnej strony po rozwinięciu węzłów JSON i przykładu. Kod PHP zachowano także w osobnym pliku, dzięki czemu jest kompletny niezależnie od przewijanego okna kodu na stronie źródłowej.

W polach użyto ścieżek drzewa dostawcy. Węzły takie jak int, string, objectType i elementy tablic opisują typy elementów; nie należy bezpośrednio zamieniać wszystkich segmentów tabeli na klucze JSON. Wymagalność dotyczy oznaczenia konkretnego węzła przez dostawcę i zależy od obecności rodzica. Rzeczywistą postać tablic pokazuje przykład PHP.

Oryginalne przykłady PHP są materiałem referencyjnym. Zawierają wyłączanie weryfikacji certyfikatu TLS; nowa implementacja powinna zachować weryfikację TLS, jak standardowy fetch w Bookmarket. Przykładów nie uruchamiano.

Menu górne i jego sekcje nie były przeglądane. SOAP pominięto w dokumentach metod; zrzuty pokazują oryginalną stronę z aktywną zakładką JSON. Formularzy Sandbox, kontaktu ani porównania wersji nie wysyłano. Zapis to statyczny stan dokumentacji, bez poświadczeń sesji i bez danych rezerwacji klienta.

## Dostęp i wyjątki źródła

Bezpośredni HTTPS do głównej dokumentacji wymagał sesji dostępu. Treść odczytano z już zalogowanej karty Chrome użytkownika. Ilustracje zapisano lokalnie; zrzuty obejmują pełną stronę, łącznie z oryginalnym układem nawigacji.

Link menu.tpl z listy szablonów przekierowuje do indeksu szablonów; zachowano stronę docelową. Stary poradnik o samodzielnej edycji Smarty, po zgodzie użytkownika na wejście do pomoc.idobooking.com, przekierował do „Konfiguracja strony głównej”; zachowano aktualny artykuł. Nie znaleziono wpisów w rozwiniętych historiach pojedynczych metod; widoczny był formularz porównania wersji.

## Bramki

| Bramka | Metody |
| --- | --- |
| [allotments](api/allotments/index.md) | 4 |
| [amenities](api/amenities/index.md) | 2 |
| [availabilitylocks](api/availabilitylocks/index.md) | 4 |
| [clients](api/clients/index.md) | 5 |
| [locks](api/locks/index.md) | 5 |
| [objects](api/objects/index.md) | 22 |
| [offer](api/offer/index.md) | 5 |
| [payments](api/payments/index.md) | 6 |
| [prices](api/prices/index.md) | 3 |
| [public](api/public/index.md) | 6 |
| [reservations](api/reservations/index.md) | 9 |
| [reservationsdocuments](api/reservationsdocuments/index.md) | 4 |
| [restrictions](api/restrictions/index.md) | 3 |
| [users](api/users/index.md) | 2 |

## Wszystkie zapisane strony

- [Allotments/Metoda sources](api/allotments/sources.md) · [HTML](api/allotments/sources.html) · [zrzut](api/allotments/sources.jpg) · v36
- [API IdoBooking](api/index.md) · [HTML](api/index.html) · [zrzut](api/index.jpg)
- [Allotments](api/allotments/index.md) · [HTML](api/allotments/index.html) · [zrzut](api/allotments/index.jpg)
- [Bramka Amenities](api/amenities/index.md) · [HTML](api/amenities/index.html) · [zrzut](api/amenities/index.jpg)
- [Availability Locks](api/availabilitylocks/index.md) · [HTML](api/availabilitylocks/index.html) · [zrzut](api/availabilitylocks/index.jpg)
- [Bramka Clients](api/clients/index.md) · [HTML](api/clients/index.html) · [zrzut](api/clients/index.jpg)
- [Bramka Locks](api/locks/index.md) · [HTML](api/locks/index.html) · [zrzut](api/locks/index.jpg)
- [Bramka Objects](api/objects/index.md) · [HTML](api/objects/index.html) · [zrzut](api/objects/index.jpg)
- [Bramka Offer](api/offer/index.md) · [HTML](api/offer/index.html) · [zrzut](api/offer/index.jpg)
- [Bramka Payments](api/payments/index.md) · [HTML](api/payments/index.html) · [zrzut](api/payments/index.jpg)
- [Bramka Prices](api/prices/index.md) · [HTML](api/prices/index.html) · [zrzut](api/prices/index.jpg)
- [Bramka Public](api/public/index.md) · [HTML](api/public/index.html) · [zrzut](api/public/index.jpg)
- [Bramka Reservations](api/reservations/index.md) · [HTML](api/reservations/index.html) · [zrzut](api/reservations/index.jpg)
- [Bramka Reservations Documents](api/reservationsdocuments/index.md) · [HTML](api/reservationsdocuments/index.html) · [zrzut](api/reservationsdocuments/index.jpg)
- [Restrictions](api/restrictions/index.md) · [HTML](api/restrictions/index.html) · [zrzut](api/restrictions/index.jpg)
- [Bramka Users](api/users/index.md) · [HTML](api/users/index.html) · [zrzut](api/users/index.jpg)
- [Allotments/Metoda deleteExceptions](api/allotments/deleteExceptions.md) · [HTML](api/allotments/deleteExceptions.html) · [zrzut](api/allotments/deleteExceptions.jpg) · v36
- [Allotments/Metoda getExceptions](api/allotments/getExceptions.md) · [HTML](api/allotments/getExceptions.html) · [zrzut](api/allotments/getExceptions.jpg) · v36
- [Allotments/Metoda setExceptions](api/allotments/setExceptions.md) · [HTML](api/allotments/setExceptions.html) · [zrzut](api/allotments/setExceptions.jpg) · v36
- [Bramka Amenities/Metoda getForAddons](api/amenities/getForAddons.md) · [HTML](api/amenities/getForAddons.html) · [zrzut](api/amenities/getForAddons.jpg) · v36
- [Bramka Amenities/Metoda getForObjects](api/amenities/getForObjects.md) · [HTML](api/amenities/getForObjects.html) · [zrzut](api/amenities/getForObjects.jpg) · v36
- [Availability Locks/Metoda add](api/availabilitylocks/add.md) · [HTML](api/availabilitylocks/add.html) · [zrzut](api/availabilitylocks/add.jpg) · v36
- [Availability Locks/Metoda delete](api/availabilitylocks/delete.md) · [HTML](api/availabilitylocks/delete.html) · [zrzut](api/availabilitylocks/delete.jpg) · v36
- [Availability Locks/Metoda edit](api/availabilitylocks/edit.md) · [HTML](api/availabilitylocks/edit.html) · [zrzut](api/availabilitylocks/edit.jpg) · v36
- [Availability Locks/Metoda get](api/availabilitylocks/get.md) · [HTML](api/availabilitylocks/get.html) · [zrzut](api/availabilitylocks/get.jpg) · v36
- [Bramka Clients/Metoda add](api/clients/add.md) · [HTML](api/clients/add.html) · [zrzut](api/clients/add.jpg) · v36
- [Bramka Clients/Metoda delete](api/clients/delete.md) · [HTML](api/clients/delete.html) · [zrzut](api/clients/delete.jpg) · v36
- [Bramka Clients/Metoda edit](api/clients/edit.md) · [HTML](api/clients/edit.html) · [zrzut](api/clients/edit.jpg) · v36
- [Bramka Clients/Metoda get](api/clients/get.md) · [HTML](api/clients/get.html) · [zrzut](api/clients/get.jpg) · v36
- [Bramka Clients/Metoda history](api/clients/history.md) · [HTML](api/clients/history.html) · [zrzut](api/clients/history.jpg) · v36
- [Bramka Locks/Metoda add](api/locks/add.md) · [HTML](api/locks/add.html) · [zrzut](api/locks/add.jpg) · v36
- [Bramka Locks/Metoda delete](api/locks/delete.md) · [HTML](api/locks/delete.html) · [zrzut](api/locks/delete.jpg) · v36
- [Bramka Locks/Metoda edit](api/locks/edit.md) · [HTML](api/locks/edit.html) · [zrzut](api/locks/edit.jpg) · v36
- [Bramka Locks/Metoda get](api/locks/get.md) · [HTML](api/locks/get.html) · [zrzut](api/locks/get.jpg) · v36
- [Bramka Locks/Metoda getDevices](api/locks/getDevices.md) · [HTML](api/locks/getDevices.html) · [zrzut](api/locks/getDevices.jpg) · v36
- [Bramka Objects/Metoda addAmenities](api/objects/addAmenities.md) · [HTML](api/objects/addAmenities.html) · [zrzut](api/objects/addAmenities.jpg) · v36
- [Bramka Objects/Metoda addItems](api/objects/addItems.md) · [HTML](api/objects/addItems.html) · [zrzut](api/objects/addItems.jpg) · v36
- [Bramka Objects/Metoda addMedia](api/objects/addMedia.md) · [HTML](api/objects/addMedia.html) · [zrzut](api/objects/addMedia.jpg) · v36
- [Bramka Objects/Metoda deleteAmenities](api/objects/deleteAmenities.md) · [HTML](api/objects/deleteAmenities.html) · [zrzut](api/objects/deleteAmenities.jpg) · v36
- [Bramka Objects/Metoda deleteItems](api/objects/deleteItems.md) · [HTML](api/objects/deleteItems.html) · [zrzut](api/objects/deleteItems.jpg) · v36
- [Bramka Objects/Metoda deleteMedia](api/objects/deleteMedia.md) · [HTML](api/objects/deleteMedia.html) · [zrzut](api/objects/deleteMedia.jpg) · v36
- [Bramka Objects/Metoda editDescriptions](api/objects/editDescriptions.md) · [HTML](api/objects/editDescriptions.html) · [zrzut](api/objects/editDescriptions.jpg) · v36
- [Bramka Objects/Metoda editItems](api/objects/editItems.md) · [HTML](api/objects/editItems.html) · [zrzut](api/objects/editItems.jpg) · v36
- [Bramka Objects/Metoda editLengthSetup](api/objects/editLengthSetup.md) · [HTML](api/objects/editLengthSetup.html) · [zrzut](api/objects/editLengthSetup.jpg) · v36
- [Bramka Objects/Metoda editLocation](api/objects/editLocation.md) · [HTML](api/objects/editLocation.html) · [zrzut](api/objects/editLocation.jpg) · v36
- [Bramka Objects/Metoda editMedia](api/objects/editMedia.md) · [HTML](api/objects/editMedia.html) · [zrzut](api/objects/editMedia.jpg) · v36
- [Bramka Objects/Metoda editType](api/objects/editType.md) · [HTML](api/objects/editType.html) · [zrzut](api/objects/editType.jpg) · v36
- [Bramka Objects/Metoda getAll](api/objects/getAll.md) · [HTML](api/objects/getAll.html) · [zrzut](api/objects/getAll.jpg) · v36
- [Bramka Objects/Metoda getAmenities](api/objects/getAmenities.md) · [HTML](api/objects/getAmenities.html) · [zrzut](api/objects/getAmenities.jpg) · v36
- [Bramka Objects/Metoda getAvailabilityByDateRange](api/objects/getAvailabilityByDateRange.md) · [HTML](api/objects/getAvailabilityByDateRange.html) · [zrzut](api/objects/getAvailabilityByDateRange.jpg) · v36
- [Bramka Objects/Metoda getDescriptions](api/objects/getDescriptions.md) · [HTML](api/objects/getDescriptions.html) · [zrzut](api/objects/getDescriptions.jpg) · v36
- [Bramka Objects/Metoda getFilters](api/objects/getFilters.md) · [HTML](api/objects/getFilters.html) · [zrzut](api/objects/getFilters.jpg) · v36
- [Bramka Objects/Metoda getItems](api/objects/getItems.md) · [HTML](api/objects/getItems.html) · [zrzut](api/objects/getItems.jpg) · v36
- [Bramka Objects/Metoda getLengthSetup](api/objects/getLengthSetup.md) · [HTML](api/objects/getLengthSetup.html) · [zrzut](api/objects/getLengthSetup.jpg) · v36
- [Bramka Objects/Metoda getLocation](api/objects/getLocation.md) · [HTML](api/objects/getLocation.html) · [zrzut](api/objects/getLocation.jpg) · v36
- [Bramka Objects/Metoda getMedia](api/objects/getMedia.md) · [HTML](api/objects/getMedia.html) · [zrzut](api/objects/getMedia.jpg) · v36
- [Bramka Objects/Metoda getType](api/objects/getType.md) · [HTML](api/objects/getType.html) · [zrzut](api/objects/getType.jpg) · v36
- [Bramka Offer/Metoda getAvailabilityAndPricesForDays](api/offer/getAvailabilityAndPricesForDays.md) · [HTML](api/offer/getAvailabilityAndPricesForDays.html) · [zrzut](api/offer/getAvailabilityAndPricesForDays.jpg) · v36
- [Bramka Offer/Metoda getAvailabilityForDays](api/offer/getAvailabilityForDays.md) · [HTML](api/offer/getAvailabilityForDays.html) · [zrzut](api/offer/getAvailabilityForDays.jpg) · v36
- [Bramka Offer/Metoda getChildrenInformation](api/offer/getChildrenInformation.md) · [HTML](api/offer/getChildrenInformation.html) · [zrzut](api/offer/getChildrenInformation.jpg) · v36
- [Bramka Offer/Metoda getPricesForDays](api/offer/getPricesForDays.md) · [HTML](api/offer/getPricesForDays.html) · [zrzut](api/offer/getPricesForDays.jpg) · v36
- [Bramka Offer/Metoda getPricesForDaysForObject](api/offer/getPricesForDaysForObject.md) · [HTML](api/offer/getPricesForDaysForObject.html) · [zrzut](api/offer/getPricesForDaysForObject.jpg) · v36
- [Bramka Payments/Metoda add](api/payments/add.md) · [HTML](api/payments/add.html) · [zrzut](api/payments/add.jpg) · v36
- [Bramka Payments/Metoda cancel](api/payments/cancel.md) · [HTML](api/payments/cancel.html) · [zrzut](api/payments/cancel.jpg) · v36
- [Bramka Payments/Metoda confirm](api/payments/confirm.md) · [HTML](api/payments/confirm.html) · [zrzut](api/payments/confirm.jpg) · v36
- [Bramka Payments/Metoda edit](api/payments/edit.md) · [HTML](api/payments/edit.html) · [zrzut](api/payments/edit.jpg) · v36
- [Bramka Payments/Metoda get](api/payments/get.md) · [HTML](api/payments/get.html) · [zrzut](api/payments/get.jpg) · v36
- [Bramka Payments/Metoda getPaymentForms](api/payments/getPaymentForms.md) · [HTML](api/payments/getPaymentForms.html) · [zrzut](api/payments/getPaymentForms.jpg) · v36
- [Bramka Prices/Metoda deleteExceptions](api/prices/deleteExceptions.md) · [HTML](api/prices/deleteExceptions.html) · [zrzut](api/prices/deleteExceptions.jpg) · v36
- [Bramka Prices/Metoda getExceptions](api/prices/getExceptions.md) · [HTML](api/prices/getExceptions.html) · [zrzut](api/prices/getExceptions.jpg) · v36
- [Bramka Prices/Metoda setExceptions](api/prices/setExceptions.md) · [HTML](api/prices/setExceptions.html) · [zrzut](api/prices/setExceptions.jpg) · v36
- [Bramka Public/Metoda availability](api/public/availability.md) · [HTML](api/public/availability.html) · [zrzut](api/public/availability.jpg) · v36
- [Bramka Public/Metoda filters](api/public/filters.md) · [HTML](api/public/filters.html) · [zrzut](api/public/filters.jpg) · v36
- [Bramka Public/Metoda offer](api/public/offer.md) · [HTML](api/public/offer.html) · [zrzut](api/public/offer.jpg) · v36
- [Bramka Public/Metoda parameters](api/public/parameters.md) · [HTML](api/public/parameters.html) · [zrzut](api/public/parameters.jpg) · v36
- [Bramka Public/Metoda pricingOffers](api/public/pricingOffers.md) · [HTML](api/public/pricingOffers.html) · [zrzut](api/public/pricingOffers.jpg) · v36
- [Bramka Public/Metoda specialOffer](api/public/specialOffer.md) · [HTML](api/public/specialOffer.html) · [zrzut](api/public/specialOffer.jpg) · v36
- [Bramka Reservations/Metoda add](api/reservations/add.md) · [HTML](api/reservations/add.html) · [zrzut](api/reservations/add.jpg) · v36
- [Bramka Reservations/Metoda changeCurrency](api/reservations/changeCurrency.md) · [HTML](api/reservations/changeCurrency.html) · [zrzut](api/reservations/changeCurrency.jpg) · v36
- [Bramka Reservations/Metoda edit](api/reservations/edit.md) · [HTML](api/reservations/edit.html) · [zrzut](api/reservations/edit.jpg) · v36
- [Bramka Reservations/Metoda editStatus](api/reservations/editStatus.md) · [HTML](api/reservations/editStatus.html) · [zrzut](api/reservations/editStatus.jpg) · v36
- [Bramka Reservations/Metoda get](api/reservations/get.md) · [HTML](api/reservations/get.html) · [zrzut](api/reservations/get.jpg) · v36
- [Bramka Reservations/Metoda getSources](api/reservations/getSources.md) · [HTML](api/reservations/getSources.html) · [zrzut](api/reservations/getSources.jpg) · v36
- [Bramka Reservations/Metoda notifyClient](api/reservations/notifyClient.md) · [HTML](api/reservations/notifyClient.html) · [zrzut](api/reservations/notifyClient.jpg) · v36
- [Bramka Reservations/Metoda notifyExternalService](api/reservations/notifyExternalService.md) · [HTML](api/reservations/notifyExternalService.html) · [zrzut](api/reservations/notifyExternalService.jpg) · v36
- [Bramka Reservations/Metoda setDiscount](api/reservations/setDiscount.md) · [HTML](api/reservations/setDiscount.html) · [zrzut](api/reservations/setDiscount.jpg) · v36
- [Bramka Reservations Documents/Metoda cancelDocuments](api/reservationsdocuments/cancelDocuments.md) · [HTML](api/reservationsdocuments/cancelDocuments.html) · [zrzut](api/reservationsdocuments/cancelDocuments.jpg) · v36
- [Bramka Reservations Documents/Metoda createDocuments](api/reservationsdocuments/createDocuments.md) · [HTML](api/reservationsdocuments/createDocuments.html) · [zrzut](api/reservationsdocuments/createDocuments.jpg) · v36
- [Bramka Reservations Documents/Metoda editDocuments](api/reservationsdocuments/editDocuments.md) · [HTML](api/reservationsdocuments/editDocuments.html) · [zrzut](api/reservationsdocuments/editDocuments.jpg) · v36
- [Bramka Reservations Documents/Metoda getDocuments](api/reservationsdocuments/getDocuments.md) · [HTML](api/reservationsdocuments/getDocuments.html) · [zrzut](api/reservationsdocuments/getDocuments.jpg) · v36
- [Restrictions/Metoda deleteExceptions](api/restrictions/deleteExceptions.md) · [HTML](api/restrictions/deleteExceptions.html) · [zrzut](api/restrictions/deleteExceptions.jpg) · v36
- [Restrictions/Metoda getExceptions](api/restrictions/getExceptions.md) · [HTML](api/restrictions/getExceptions.html) · [zrzut](api/restrictions/getExceptions.jpg) · v36
- [Restrictions/Metoda setExceptions](api/restrictions/setExceptions.md) · [HTML](api/restrictions/setExceptions.html) · [zrzut](api/restrictions/setExceptions.jpg) · v36
- [Bramka Users/Metoda get](api/users/get.md) · [HTML](api/users/get.html) · [zrzut](api/users/get.jpg) · v36
- [Bramka Users/Metoda getLogs](api/users/getLogs.md) · [HTML](api/users/getLogs.html) · [zrzut](api/users/getLogs.jpg) · v36
- [Dział developerów tworzących programy współpracujące z IdoBooking](pages/developers.md) · [HTML](pages/developers.html) · [zrzut](pages/developers.jpg)
- [Szablony własne Wizytówki IdoBooking w Smarty](pages/szablony-wlasne-wizytowki-idobooking-w-smarty.md) · [HTML](pages/szablony-wlasne-wizytowki-idobooking-w-smarty.html) · [zrzut](pages/szablony-wlasne-wizytowki-idobooking-w-smarty.jpg)
- [Lista dostępnych szablonów Wizytówki w Smarty](pages/lista-dostepnych-szablonow-wizytowki-w-smarty.md) · [HTML](pages/lista-dostepnych-szablonow-wizytowki-w-smarty.html) · [zrzut](pages/lista-dostepnych-szablonow-wizytowki-w-smarty.jpg)
- [Zmienne obowiązujące globalnie](pages/zmienne-obowiazujace-globalnie.md) · [HTML](pages/zmienne-obowiazujace-globalnie.html) · [zrzut](pages/zmienne-obowiazujace-globalnie.jpg)
- [Strona index.tpl w szablonach Wizytówki](pages/strona-index-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-index-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-index-tpl-w-szablonach-wizytowki.jpg)
- [Strona contact.tpl w szablonach Wizytówki](pages/strona-contact-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-contact-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-contact-tpl-w-szablonach-wizytowki.jpg)
- [Strona txt.tpl w szablonach Wizytówki](pages/strona-txt-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-txt-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-txt-tpl-w-szablonach-wizytowki.jpg)
- [Strona offers.tpl w szablonach Wizytówki](pages/strona-offers-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-offers-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-offers-tpl-w-szablonach-wizytowki.jpg)
- [Strona special-offer.tpl w szablonach Wizytówki](pages/strona-special-offer-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-special-offer-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-special-offer-tpl-w-szablonach-wizytowki.jpg)
- [Strona promotions.tpl w szablonach Wizytówki](pages/strona-promotions-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-promotions-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-promotions-tpl-w-szablonach-wizytowki.jpg)
- [Strona facebook.tpl w szablonach Wizytówki](pages/strona-facebook-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-facebook-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-facebook-tpl-w-szablonach-wizytowki.jpg)
- [Strona news.tpl w szablonach Wizytówki](pages/strona-news-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-news-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-news-tpl-w-szablonach-wizytowki.jpg)
- [Strona offer.tpl w szablonach Wizytówki](pages/strona-offer-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-offer-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-offer-tpl-w-szablonach-wizytowki.jpg)
- [Strona about.tpl w szablonach Wizytówki](pages/strona-about-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-about-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-about-tpl-w-szablonach-wizytowki.jpg)
- [Strona analytics.tpl w szablonach Wizytówki](pages/strona-analytics-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-analytics-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-analytics-tpl-w-szablonach-wizytowki.jpg)
- [Strona facebook-comments.tpl w szablonach Wizytówki](pages/strona-facebook-comments-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-facebook-comments-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-facebook-comments-tpl-w-szablonach-wizytowki.jpg)
- [Strona footer.tpl w szablonach Wizytówki](pages/strona-footer-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-footer-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-footer-tpl-w-szablonach-wizytowki.jpg)
- [Strona header.tpl w szablonach Wizytówki](pages/strona-header-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-header-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-header-tpl-w-szablonach-wizytowki.jpg)
- [Strona opinions.tpl w szablonach Wizytówki](pages/strona-opinions-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-opinions-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-opinions-tpl-w-szablonach-wizytowki.jpg)
- [Dostęp do demo](pages/przetestuj-system-w-wersji-demo.md) · [HTML](pages/przetestuj-system-w-wersji-demo.html) · [zrzut](pages/przetestuj-system-w-wersji-demo.jpg)
- [Zapis żądań i odpowiedzi do API](pages/zapis-zadan-i-odpowiedzi-do-api.md) · [HTML](pages/zapis-zadan-i-odpowiedzi-do-api.html) · [zrzut](pages/zapis-zadan-i-odpowiedzi-do-api.jpg)
- [Statystyki API](pages/statystyki-api.md) · [HTML](pages/statystyki-api.html) · [zrzut](pages/statystyki-api.jpg)
- [Kontakt dla Developerów IdoBooking](pages/kontakt-dla-developerow.md) · [HTML](pages/kontakt-dla-developerow.html) · [zrzut](pages/kontakt-dla-developerow.jpg)
- [Lista dostępnych szablonów Wizytówki w Smarty](pages/strona-menu-tpl-w-szablonach-wizytowki.md) · [HTML](pages/strona-menu-tpl-w-szablonach-wizytowki.html) · [zrzut](pages/strona-menu-tpl-w-szablonach-wizytowki.jpg)
- [Bramka Reservations/Metoda get](api-v34/reservations/get.md) · [HTML](api-v34/reservations/get.html) · [zrzut](api-v34/reservations/get.jpg) · v34
- [Bramka Reservations/Metoda getSources](api-v34/reservations/getSources.md) · [HTML](api-v34/reservations/getSources.html) · [zrzut](api-v34/reservations/getSources.jpg) · v34
- [Konfiguracja strony głównej](pages/poradnik-edycji-wizytowki.md) · [HTML](pages/poradnik-edycji-wizytowki.html) · [zrzut](pages/poradnik-edycji-wizytowki.jpg)

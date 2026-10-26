# Bramka Reservations/Metoda get

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservations&method=get##)

Kopia: 24.10.2026 · API 34 · JSON. [Pełny zrzut](get.jpg).

## Opis

Zwraca informację o rezerwacjach

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservations/get/34/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `result` | resultRequestType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `result.number` | int | nieoznaczone | Liczba wyników na stronie. Wartości od 1 do 100 |
| `result.returnElements` | returnElementsType | nieoznaczone | Element opcjonalny, określa jakie elementy rezerwacji mają być zwracane przez bramkę. Domyślnie zwracane są wszystkie elementy.<br><br>element typu string |
| `result.returnElements.string` | string | tak | element typu string |
| `paramsSearch` | paramsSearchReservationsType | nieoznaczone | Parametry przekazywane do metody |
| `paramsSearch.status` | reservationStatusTypeArray | nieoznaczone | Status rezerwacji |
| `paramsSearch.status.reservationStatusType` | reservationStatusType | tak | Możliwe wartości: (unconfirmed, confirmed, paymentInProgress, accepted, inProgress, completed, canceled, withdrawn, waitingForPayment, invalidCardNumber, toClarify)<br><br>element typu reservationStatusType |
| `paramsSearch.modificationDateRange` | dateRange | nieoznaczone | Przedział dat modyfikacji |
| `paramsSearch.modificationDateRange.startDate` | string | nieoznaczone | Data początkowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.modificationDateRange.endDate` | string | nieoznaczone | Data końcowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.addDateRange` | dateRange | nieoznaczone | Przedział dat dodania |
| `paramsSearch.addDateRange.startDate` | string | nieoznaczone | Data początkowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.addDateRange.endDate` | string | nieoznaczone | Data końcowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.fromDateRange` | dateRange | nieoznaczone | Przedział dat rozpoczęcia |
| `paramsSearch.fromDateRange.startDate` | string | nieoznaczone | Data początkowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.fromDateRange.endDate` | string | nieoznaczone | Data końcowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.toDateRange` | dateRange | nieoznaczone | Przedział dat zakończenia |
| `paramsSearch.toDateRange.startDate` | string | nieoznaczone | Data początkowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.toDateRange.endDate` | string | nieoznaczone | Data końcowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.betweenDateRange` | dateRange | nieoznaczone | Przedział dat trwania |
| `paramsSearch.betweenDateRange.startDate` | string | nieoznaczone | Data początkowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.betweenDateRange.endDate` | string | nieoznaczone | Data końcowa w standardzie ISO-8601 lub formacie YYYY-MM-DD HH:MM |
| `paramsSearch.objectsIds` | intArray | nieoznaczone | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `paramsSearch.objectsIds.int` | int | tak | element typu int |
| `paramsSearch.locationsIds` | intArray | nieoznaczone | Identyfikatory lokalizacji<br><br>element typu int |
| `paramsSearch.locationsIds.int` | int | tak | element typu int |
| `paramsSearch.ids` | intArray | nieoznaczone | Identyfikatory rezerwacji<br><br>element typu int |
| `paramsSearch.ids.int` | int | tak | element typu int |
| `paramsSearch.clientsIds` | intArray | nieoznaczone | Identyfikatory klientów<br><br>element typu int |
| `paramsSearch.clientsIds.int` | int | tak | element typu int |
| `paramsSearch.modificationStatus` | modificationStatusType | nieoznaczone | Możliwe wartości: (new, modified)<br><br>Informuje czy rezerwacja była modyfikowana |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `reservations` | reservationTypeArray | nieoznaczone | Dane rezerwacji |
| `reservations.reservationType` | reservationType | tak | element typu reservationType |
| `reservations.reservationType.id` | int | nieoznaczone | Identyfikator klienta |
| `reservations.reservationType.reservationDetails` | reservationDetailsType | nieoznaczone | Szczegóły rezerwacji |
| `reservations.reservationType.reservationDetails.price` | float | nieoznaczone | Cena |
| `reservations.reservationType.reservationDetails.advance` | float | nieoznaczone | Przedpłata |
| `reservations.reservationType.reservationDetails.currency` | string | nieoznaczone | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `reservations.reservationType.reservationDetails.dateAdd` | string | nieoznaczone | Data dodania wg strefy czasowej użytkownika panelu w formacie YYYY-MM-DD HH:MM:SS |
| `reservations.reservationType.reservationDetails.dateFrom` | string | nieoznaczone | Data rozpoczęcia wg strefy czasowej użytkownika panelu w formacie YYYY-MM-DD HH:MM |
| `reservations.reservationType.reservationDetails.dateTo` | string | nieoznaczone | Data zakończenia wg strefy czasowej użytkownika panelu w formacie YYYY-MM-DD HH:MM |
| `reservations.reservationType.reservationDetails.reservationSourceTypeId` | int | nieoznaczone | Identyfikator typu źródła rezerwacji |
| `reservations.reservationType.reservationDetails.reservationSourceId` | int | nieoznaczone | Identyfikator źródła rezerwacji |
| `reservations.reservationType.reservationDetails.externalReservationId` | string | nieoznaczone | Identyfikator rezerwacji w serwisie zewnętrznym |
| `reservations.reservationType.reservationDetails.reservationManager` | reservationManagerType | nieoznaczone | Możliwe wartości: (external, own)<br><br>W przypadku rezerwacji z mechanizmu intergracji przez protokół IdoSell Booking określa który system jest główny dla składanej rezerwacji |
| `reservations.reservationType.reservationDetails.internalSource` | internalSourceType | nieoznaczone | Możliwe wartości: (other, email, phone, faceToFaceConversation, socialMedia) |
| `reservations.reservationType.reservationDetails.clientId` | int | nieoznaczone | Identyfikator klienta |
| `reservations.reservationType.reservationDetails.status` | reservationStatusType | nieoznaczone | Możliwe wartości: (unconfirmed, confirmed, paymentInProgress, accepted, inProgress, completed, canceled, withdrawn, waitingForPayment, invalidCardNumber, toClarify)<br><br>Typ statusu rezerwacji |
| `reservations.reservationType.reservationDetails.internalNote` | string | nieoznaczone | Notatka do rezerwacji |
| `reservations.reservationType.reservationDetails.apiNote` | string | nieoznaczone | Notatka API |
| `reservations.reservationType.reservationDetails.externalNote` | string | nieoznaczone | Informacje dla klienta |
| `reservations.reservationType.reservationDetails.clientNote` | string | nieoznaczone | Uwagi klienta do rezerwacji |
| `reservations.reservationType.reservationDetails.discount` | float | nieoznaczone | Rabat |
| `reservations.reservationType.reservationDetails.balance` | float | nieoznaczone | Saldo rezerwacji |
| `reservations.reservationType.reservationDetails.modificationStatus` | modificationStatusType | nieoznaczone | Możliwe wartości: (new, modified)<br><br>Informuje czy rezerwacja była modyfikowana |
| `reservations.reservationType.reservationDetails.modificationDate` | string | nieoznaczone | Data i czas ostatniej modyfikacji rezerwacji w formacie YYYY-MM-DD HH:MM |
| `reservations.reservationType.items` | reservationItemTypeArray | nieoznaczone | Egzemplarze przedmiotów rezerwacji |
| `reservations.reservationType.items.reservationItemType` | reservationItemType | tak | element typu reservationItemType |
| `reservations.reservationType.items.reservationItemType.objectItemId` | int | tak | Identyfikator egzemplarza przedmiotu rezerwacji |
| `reservations.reservationType.items.reservationItemType.numberOfAdults` | int | tak | Liczba dorosłych |
| `reservations.reservationType.items.reservationItemType.numberOfBigChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają inne ceny |
| `reservations.reservationType.items.reservationItemType.numberOfSmallChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają pobyt gratis |
| `reservations.reservationType.items.reservationItemType.price` | float | tak | Cena |
| `reservations.reservationType.items.reservationItemType.priceCorrection` | float | tak | Upust/dopłata. W przypadku wartości ujemnej należy traktować wartość jako upust, w przypadku wartości dodatniej jako dopłatę |
| `reservations.reservationType.items.reservationItemType.vat` | float | tak | Vat |
| `reservations.reservationType.items.reservationItemType.isSurplus` | isSurplusType | tak | Możliwe wartości: (y, n)<br><br>Flaga informująca czy zarezerwowany egzemplarz jest oznaczony jako nadmiarowy: n - Nie, y - Tak |
| `reservations.reservationType.items.reservationItemType.addons` | newReservationAddonTypeArray | nieoznaczone | Dane dodatków rezerwacji |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType` | newReservationAddonType | tak | element typu newReservationAddonType |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType.addonId` | int | tak | Identyfikator dodatku |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType.persons` | int | nieoznaczone | Liczba osób |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType.nights` | int | nieoznaczone | Liczba nocy |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType.quantity` | int | nieoznaczone | Ilość dodatku |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType.price` | float | tak | Cena |
| `reservations.reservationType.items.reservationItemType.addons.newReservationAddonType.vat` | float | tak | Vat |
| `reservations.reservationType.client` | clientWithGuestType | nieoznaczone | Klient |
| `reservations.reservationType.client.login` | string | nieoznaczone | Login klienta |
| `reservations.reservationType.client.id` | int | nieoznaczone | Identyfikator klienta |
| `reservations.reservationType.client.clientType` | clientTypeType | nieoznaczone | Możliwe wartości: (person, company)<br><br>Typ klienta, person - osoba prywatna, company - firma |
| `reservations.reservationType.client.status` | clientStatusType | nieoznaczone | Możliwe wartości: (active, blocked) |
| `reservations.reservationType.client.companyName` | string | nieoznaczone | Nazwa firmy |
| `reservations.reservationType.client.taxNumber` | string | nieoznaczone | NIP |
| `reservations.reservationType.client.firstName` | string | tak | Imię |
| `reservations.reservationType.client.lastName` | string | tak | Nazwisko |
| `reservations.reservationType.client.street` | string | nieoznaczone | Ulica |
| `reservations.reservationType.client.zipcode` | string | nieoznaczone | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `reservations.reservationType.client.city` | string | nieoznaczone | Miasto |
| `reservations.reservationType.client.countryCode` | string | nieoznaczone | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `reservations.reservationType.client.phone` | string | nieoznaczone | Telefon |
| `reservations.reservationType.client.email` | string | nieoznaczone | Adres e-mail |
| `reservations.reservationType.client.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pl |
| `reservations.reservationType.client.currency` | string | nieoznaczone | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `reservations.reservationType.client.guests` | guestTypeArray | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType` | guestType | tak | element typu guestType |
| `reservations.reservationType.client.guests.guestType.firstName` | string | tak |  |
| `reservations.reservationType.client.guests.guestType.lastName` | string | tak |  |
| `reservations.reservationType.client.guests.guestType.street` | string | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType.zipcode` | string | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType.city` | string | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType.countryCode` | string | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType.phone` | string | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType.email` | string | nieoznaczone |  |
| `reservations.reservationType.client.guests.guestType.language` | string | tak |  |
| `reservations.reservationType.client.invoiceData` | invoiceDataType | nieoznaczone | Dane do faktury |
| `reservations.reservationType.client.invoiceData.firstName` | string | nieoznaczone | Imię |
| `reservations.reservationType.client.invoiceData.lastName` | string | nieoznaczone | Nazwisko |
| `reservations.reservationType.client.invoiceData.companyName` | string | nieoznaczone | Nazwa firmy |
| `reservations.reservationType.client.invoiceData.taxNumber` | string | nieoznaczone | NIP |
| `reservations.reservationType.client.invoiceData.street` | string | tak | Adres |
| `reservations.reservationType.client.invoiceData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `reservations.reservationType.client.invoiceData.city` | string | tak | Miasto |
| `reservations.reservationType.client.invoiceData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `reservations.reservationType.client.notification` | notificationType | nieoznaczone | Możliwe wartości: (y, n) |
| `reservations.reservationType.client.sendNewsletter` | sendNewsletterType | nieoznaczone | Możliwe wartości: (y, n) |
| `reservations.reservationType.client.note` | string | nieoznaczone | Uwagi klienta do rezerwacji |
| `reservations.reservationType.client.discountForItemsInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji objętych promocją, % |
| `reservations.reservationType.client.discountForItemsNotInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji nieobjętych promocją, % |
| `reservations.reservationType.error` | errorType | nieoznaczone | Dane błędu |
| `reservations.reservationType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `reservations.reservationType.error.faultString` | string | nieoznaczone | Opis błędu |
| `result` | resultResponseType | nieoznaczone | Lista rezerwacji zwróconych w wyniku wywołania bramki |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.countOnPage` | int | nieoznaczone | Ilość stron wszystkich znalezionych wyników |
| `result.pageAll` | int | nieoznaczone | Suma wyników na stronie |
| `result.countAll` | int | nieoznaczone | Suma wszystkich wyników |

## Przykład PHP dostawcy

[Osobny plik PHP](get.php).

```php
<?php

$address = 'https://client47056.idobooking.com/api/reservations/get/34/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['result'] = array();
$request['result']['page'] = 1;
$request['result']['number'] = 2;
$request['result']['returnElements'] = array();
$request['result']['returnElements'][0] = "returnElements";
$request['paramsSearch'] = array();
$request['paramsSearch']['status'] = array();
$request['paramsSearch']['status'][0] = 'unconfirmed';
$request['paramsSearch']['modificationDateRange'] = array();
$request['paramsSearch']['modificationDateRange']['startDate'] = "startDate";
$request['paramsSearch']['modificationDateRange']['endDate'] = "endDate";
$request['paramsSearch']['addDateRange'] = array();
$request['paramsSearch']['addDateRange']['startDate'] = "startDate";
$request['paramsSearch']['addDateRange']['endDate'] = "endDate";
$request['paramsSearch']['fromDateRange'] = array();
$request['paramsSearch']['fromDateRange']['startDate'] = "startDate";
$request['paramsSearch']['fromDateRange']['endDate'] = "endDate";
$request['paramsSearch']['toDateRange'] = array();
$request['paramsSearch']['toDateRange']['startDate'] = "startDate";
$request['paramsSearch']['toDateRange']['endDate'] = "endDate";
$request['paramsSearch']['betweenDateRange'] = array();
$request['paramsSearch']['betweenDateRange']['startDate'] = "startDate";
$request['paramsSearch']['betweenDateRange']['endDate'] = "endDate";
$request['paramsSearch']['objectsIds'] = array();
$request['paramsSearch']['objectsIds'][0] = 3;
$request['paramsSearch']['locationsIds'] = array();
$request['paramsSearch']['locationsIds'][0] = 4;
$request['paramsSearch']['ids'] = array();
$request['paramsSearch']['ids'][0] = 5;
$request['paramsSearch']['clientsIds'] = array();
$request['paramsSearch']['clientsIds'][0] = 6;
$request['paramsSearch']['modificationStatus'] = 'new';

$request_json = json_encode($request);
$headers = array(
    'Accept: application/json',
    'Content-Type: application/json;charset=UTF-8'
);

$curl = curl_init($address);
curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($curl, CURLOPT_FORBID_REUSE, 1);
curl_setopt($curl, CURLINFO_HEADER_OUT, 1);
curl_setopt($curl, CURLOPT_HEADER, 1);
curl_setopt($curl, CURLOPT_POST, 1);
curl_setopt($curl, CURLOPT_POSTFIELDS, $request_json);
curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($curl);
$status = curl_getinfo($curl);
curl_close($curl);
```

## Historia zmian

W rozwiniętej historii metody nie wyświetlono wpisów; dostępny był formularz porównywania wersji.

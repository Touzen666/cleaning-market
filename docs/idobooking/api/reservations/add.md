# Bramka Reservations/Metoda add

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservations&method=add##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](add.jpg).

## Opis

Dodaje rezerwacje

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservations/add/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `params` | paramsType | tak | Parametry przekazywane do metody |
| `params.reservations` | newReservationTypeArrayType | tak | Dane rezerwacji |
| `params.reservations.newReservationTypeType` | newReservationTypeType | tak | element typu newReservationTypeType |
| `params.reservations.newReservationTypeType.dateFrom` | string | tak | Data i godzina rozpoczęcia |
| `params.reservations.newReservationTypeType.dateTo` | string | tak | Data i godzina zakończenia |
| `params.reservations.newReservationTypeType.price` | float | nieoznaczone | Cena |
| `params.reservations.newReservationTypeType.clientId` | int | nieoznaczone | Identyfikator klienta. Pole to jest nieobowiązkowe. Ze względu na lepsze zarządzanie rezerwacją sugerujemy jego uzupełnienie |
| `params.reservations.newReservationTypeType.clientData` | clientWithGuestType | nieoznaczone | Dane klienta. Pole zostanie uwzględniane, jeżeli nie podane zostało id klienta. Na podstawie wprowadzonych danych zostanie wskazane lub utworzone konto klienta |
| `params.reservations.newReservationTypeType.clientData.login` | string | nieoznaczone | Login klienta (minimum 6 znaków) |
| `params.reservations.newReservationTypeType.clientData.password` | string | nieoznaczone | Hasło (minimum 8 znaków) |
| `params.reservations.newReservationTypeType.clientData.type` | clientTypeType | tak | Możliwe wartości: (person, company)<br><br>Typ klienta, person - osoba prywatna, company - firma |
| `params.reservations.newReservationTypeType.clientData.status` | clientStatusType | tak | Możliwe wartości: (active, blocked)<br><br>Stan konta |
| `params.reservations.newReservationTypeType.clientData.companyName` | string | nieoznaczone | Nazwa firmy |
| `params.reservations.newReservationTypeType.clientData.taxNumber` | string | nieoznaczone | NIP |
| `params.reservations.newReservationTypeType.clientData.firstName` | string | tak | Imię |
| `params.reservations.newReservationTypeType.clientData.lastName` | string | tak | Nazwisko |
| `params.reservations.newReservationTypeType.clientData.street` | string | tak | Adres |
| `params.reservations.newReservationTypeType.clientData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `params.reservations.newReservationTypeType.clientData.city` | string | tak | Miasto |
| `params.reservations.newReservationTypeType.clientData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `params.reservations.newReservationTypeType.clientData.phone` | string | nieoznaczone | Telefon Przykład: +48.787676543 |
| `params.reservations.newReservationTypeType.clientData.email` | string | nieoznaczone | Adres e-mail |
| `params.reservations.newReservationTypeType.clientData.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `params.reservations.newReservationTypeType.clientData.currency` | string | tak | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `params.reservations.newReservationTypeType.clientData.guestData` | guestDataType | tak | Dane gościa |
| `params.reservations.newReservationTypeType.clientData.guestData.firstName` | string | tak | Imię |
| `params.reservations.newReservationTypeType.clientData.guestData.lastName` | string | tak | Nazwisko |
| `params.reservations.newReservationTypeType.clientData.guestData.street` | string | tak | Adres |
| `params.reservations.newReservationTypeType.clientData.guestData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `params.reservations.newReservationTypeType.clientData.guestData.city` | string | tak | Miasto |
| `params.reservations.newReservationTypeType.clientData.guestData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `params.reservations.newReservationTypeType.clientData.guestData.phone` | string | nieoznaczone | Telefon Przykład: +48.787676543 |
| `params.reservations.newReservationTypeType.clientData.guestData.email` | string | nieoznaczone | Adres e-mail |
| `params.reservations.newReservationTypeType.clientData.guestData.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `params.reservations.newReservationTypeType.clientData.invoiceData` | invoiceDataType | nieoznaczone | Dane do faktury |
| `params.reservations.newReservationTypeType.clientData.invoiceData.firstName` | string | nieoznaczone | Imię |
| `params.reservations.newReservationTypeType.clientData.invoiceData.lastName` | string | nieoznaczone | Nazwisko |
| `params.reservations.newReservationTypeType.clientData.invoiceData.companyName` | string | nieoznaczone | Nazwa firmy |
| `params.reservations.newReservationTypeType.clientData.invoiceData.taxNumber` | string | nieoznaczone | NIP |
| `params.reservations.newReservationTypeType.clientData.invoiceData.street` | string | tak | Adres |
| `params.reservations.newReservationTypeType.clientData.invoiceData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `params.reservations.newReservationTypeType.clientData.invoiceData.city` | string | tak | Miasto |
| `params.reservations.newReservationTypeType.clientData.invoiceData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `params.reservations.newReservationTypeType.clientData.notification` | notificationType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Informuj klienta przez wiadomość E-mail o zmianach danych konta |
| `params.reservations.newReservationTypeType.clientData.sendNewsletter` | sendNewsletterType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wyślij newsletter |
| `params.reservations.newReservationTypeType.clientData.note` | string | nieoznaczone | Notatka o kliencie |
| `params.reservations.newReservationTypeType.clientData.discountForItemsInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji objętych promocją, % |
| `params.reservations.newReservationTypeType.clientData.discountForItemsNotInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji nieobjętych promocją, % |
| `params.reservations.newReservationTypeType.apiNote` | string | nieoznaczone | Notatka API |
| `params.reservations.newReservationTypeType.clientNote` | string | nieoznaczone | Uwagi klienta do rezerwacji |
| `params.reservations.newReservationTypeType.externalNote` | string | nieoznaczone | Informacje dla klienta |
| `params.reservations.newReservationTypeType.internalNote` | string | nieoznaczone | Notatka do rezerwacji |
| `params.reservations.newReservationTypeType.validAvailability` | boolean | nieoznaczone | Id zestawu |
| `params.reservations.newReservationTypeType.status` | reservationStatusTypeType | nieoznaczone | Możliwe wartości: (unconfirmed, confirmed, waitingForPayment, completed, accepted)<br><br>Typ statusu rezerwacji |
| `params.reservations.newReservationTypeType.internalSource` | internalSourceType | nieoznaczone | Możliwe wartości: (other, email, phone, faceToFaceConversation, socialMedia) |
| `params.reservations.newReservationTypeType.packages` | newReservationPackageTypeArrayType | nieoznaczone | Dane zestawów rezerwacji |
| `params.reservations.newReservationTypeType.packages.newReservationPackageTypeType` | newReservationPackageTypeType | tak | element typu newReservationPackageTypeType |
| `params.reservations.newReservationTypeType.packages.newReservationPackageTypeType.packageId` | int | tak | Id zestawu |
| `params.reservations.newReservationTypeType.packages.newReservationPackageTypeType.price` | float | nieoznaczone | Cena |
| `params.reservations.newReservationTypeType.items` | newReservationItemTypeArrayType | tak | Dane przedmiotów rezerwacji |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType` | newReservationItemTypeType | tak | element typu newReservationItemTypeType |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.objectItemId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.price` | float | nieoznaczone | Cena |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.vat` | float | nieoznaczone | Vat (%) |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.numberOfAdults` | int | nieoznaczone | Liczba dorosłych |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.numberOfBigChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają inne ceny |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.numberOfSmallChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają pobyt gratis |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons` | addonsType | nieoznaczone | Dane dodatków rezerwacji |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType` | addonType | tak | element typu addonType |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType.addonId` | int | tak | Identyfikator dodatku |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType.persons` | int | tak | Liczba osób |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType.nights` | int | tak | Liczba nocy |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType.quantity` | int | tak | Ilość dodatku |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType.price` | float | tak | Cena |
| `params.reservations.newReservationTypeType.items.newReservationItemTypeType.addons.addonType.vat` | float | tak | Vat (%) |
| `params.reservations.newReservationTypeType.currency` | string | tak | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `params.reservations.newReservationTypeType.notify` | notifyType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Powiadamiaj wiadomością transakcyjną |
| `params.reservations.newReservationTypeType.notifyService` | notifyServiceType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wysyłaj powiadomienia dla obsługi obiektu. Domyślnie są wysyłane |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `reservations` | changeReservationsTypeArray | tak | Dane rezerwacji |
| `reservations.changeReservationsType` | changeReservationsType | tak | element typu changeReservationsType |
| `reservations.changeReservationsType.success` | boolean | tak | Sukces |
| `reservations.changeReservationsType.error` | errorType | nieoznaczone | Dane błędu |
| `reservations.changeReservationsType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `reservations.changeReservationsType.error.faultString` | string | nieoznaczone | Opis błędu |
| `reservations.changeReservationsType.reservationId` | int | nieoznaczone | Identyfikator rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](add.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservations/add/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['reservations'] = array();
$request['params']['reservations'][0] = array();
$request['params']['reservations'][0]['dateFrom'] = "dateFrom";
$request['params']['reservations'][0]['dateTo'] = "dateTo";
$request['params']['reservations'][0]['price'] = 1.0;
$request['params']['reservations'][0]['clientId'] = 2;
$request['params']['reservations'][0]['clientData'] = array();
$request['params']['reservations'][0]['clientData']['login'] = "login";
$request['params']['reservations'][0]['clientData']['password'] = "password";
$request['params']['reservations'][0]['clientData']['type'] = 'person';
$request['params']['reservations'][0]['clientData']['status'] = 'active';
$request['params']['reservations'][0]['clientData']['companyName'] = "companyName";
$request['params']['reservations'][0]['clientData']['taxNumber'] = "taxNumber";
$request['params']['reservations'][0]['clientData']['firstName'] = "firstName";
$request['params']['reservations'][0]['clientData']['lastName'] = "lastName";
$request['params']['reservations'][0]['clientData']['street'] = "street";
$request['params']['reservations'][0]['clientData']['zipcode'] = "zipcode";
$request['params']['reservations'][0]['clientData']['city'] = "city";
$request['params']['reservations'][0]['clientData']['countryCode'] = "countryCode";
$request['params']['reservations'][0]['clientData']['phone'] = "phone";
$request['params']['reservations'][0]['clientData']['email'] = "email";
$request['params']['reservations'][0]['clientData']['language'] = "language";
$request['params']['reservations'][0]['clientData']['currency'] = "currency";
$request['params']['reservations'][0]['clientData']['guestData'] = array();
$request['params']['reservations'][0]['clientData']['guestData']['firstName'] = "firstName";
$request['params']['reservations'][0]['clientData']['guestData']['lastName'] = "lastName";
$request['params']['reservations'][0]['clientData']['guestData']['street'] = "street";
$request['params']['reservations'][0]['clientData']['guestData']['zipcode'] = "zipcode";
$request['params']['reservations'][0]['clientData']['guestData']['city'] = "city";
$request['params']['reservations'][0]['clientData']['guestData']['countryCode'] = "countryCode";
$request['params']['reservations'][0]['clientData']['guestData']['phone'] = "phone";
$request['params']['reservations'][0]['clientData']['guestData']['email'] = "email";
$request['params']['reservations'][0]['clientData']['guestData']['language'] = "language";
$request['params']['reservations'][0]['clientData']['invoiceData'] = array();
$request['params']['reservations'][0]['clientData']['invoiceData']['firstName'] = "firstName";
$request['params']['reservations'][0]['clientData']['invoiceData']['lastName'] = "lastName";
$request['params']['reservations'][0]['clientData']['invoiceData']['companyName'] = "companyName";
$request['params']['reservations'][0]['clientData']['invoiceData']['taxNumber'] = "taxNumber";
$request['params']['reservations'][0]['clientData']['invoiceData']['street'] = "street";
$request['params']['reservations'][0]['clientData']['invoiceData']['zipcode'] = "zipcode";
$request['params']['reservations'][0]['clientData']['invoiceData']['city'] = "city";
$request['params']['reservations'][0]['clientData']['invoiceData']['countryCode'] = "countryCode";
$request['params']['reservations'][0]['clientData']['notification'] = 'y';
$request['params']['reservations'][0]['clientData']['sendNewsletter'] = 'y';
$request['params']['reservations'][0]['clientData']['note'] = "note";
$request['params']['reservations'][0]['clientData']['discountForItemsInPromotion'] = 3.0;
$request['params']['reservations'][0]['clientData']['discountForItemsNotInPromotion'] = 4.0;
$request['params']['reservations'][0]['apiNote'] = "apiNote";
$request['params']['reservations'][0]['clientNote'] = "clientNote";
$request['params']['reservations'][0]['externalNote'] = "externalNote";
$request['params']['reservations'][0]['internalNote'] = "internalNote";
$request['params']['reservations'][0]['validAvailability'] = true;
$request['params']['reservations'][0]['status'] = 'unconfirmed';
$request['params']['reservations'][0]['internalSource'] = 'other';
$request['params']['reservations'][0]['packages'] = array();
$request['params']['reservations'][0]['packages'][0] = array();
$request['params']['reservations'][0]['packages'][0]['packageId'] = 5;
$request['params']['reservations'][0]['packages'][0]['price'] = 6.0;
$request['params']['reservations'][0]['items'] = array();
$request['params']['reservations'][0]['items'][0] = array();
$request['params']['reservations'][0]['items'][0]['objectItemId'] = 7;
$request['params']['reservations'][0]['items'][0]['objectId'] = 8;
$request['params']['reservations'][0]['items'][0]['price'] = 9.0;
$request['params']['reservations'][0]['items'][0]['vat'] = 10.0;
$request['params']['reservations'][0]['items'][0]['numberOfAdults'] = 11;
$request['params']['reservations'][0]['items'][0]['numberOfBigChildren'] = 12;
$request['params']['reservations'][0]['items'][0]['numberOfSmallChildren'] = 13;
$request['params']['reservations'][0]['items'][0]['addons'] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0]['addonId'] = 14;
$request['params']['reservations'][0]['items'][0]['addons'][0]['persons'] = 15;
$request['params']['reservations'][0]['items'][0]['addons'][0]['nights'] = 16;
$request['params']['reservations'][0]['items'][0]['addons'][0]['quantity'] = 17;
$request['params']['reservations'][0]['items'][0]['addons'][0]['price'] = 18.0;
$request['params']['reservations'][0]['items'][0]['addons'][0]['vat'] = 19.0;
$request['params']['reservations'][0]['currency'] = "currency";
$request['params']['reservations'][0]['notify'] = 'y';
$request['params']['reservations'][0]['notifyService'] = 'y';

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

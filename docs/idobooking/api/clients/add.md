# Bramka Clients/Metoda add

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=clients&method=add##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](add.jpg).

## Opis

Dodaje klientów oraz powiązanych z kontem gości upoważnionych do odbioru rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/clients/add/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `params` | paramsType | tak | Parametry przekazywane do metody |
| `params.clients` | clientsType | tak | Lista klientów |
| `params.clients.clientType` | clientType | tak | element typu clientType |
| `params.clients.clientType.login` | string | tak | Login klienta (minimum 6 znaków) |
| `params.clients.clientType.password` | string | tak | Hasło (minimum 8 znaków) |
| `params.clients.clientType.type` | clientTypeType | tak | Możliwe wartości: (person, company)<br><br>Typ klienta, person - osoba prywatna, company - firma |
| `params.clients.clientType.status` | clientStatusType | tak | Możliwe wartości: (active, blocked)<br><br>Stan konta |
| `params.clients.clientType.companyName` | string | nieoznaczone | Nazwa firmy |
| `params.clients.clientType.taxNumber` | string | nieoznaczone | NIP |
| `params.clients.clientType.firstName` | string | tak | Imię |
| `params.clients.clientType.lastName` | string | tak | Nazwisko |
| `params.clients.clientType.street` | string | tak | Adres |
| `params.clients.clientType.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `params.clients.clientType.city` | string | tak | Miasto |
| `params.clients.clientType.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `params.clients.clientType.phone` | string | nieoznaczone | Telefon Przykład: +48.787676543 |
| `params.clients.clientType.email` | string | nieoznaczone | Adres e-mail |
| `params.clients.clientType.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `params.clients.clientType.currency` | string | tak | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `params.clients.clientType.guestData` | guestDataType | tak | Dane gościa |
| `params.clients.clientType.guestData.firstName` | string | tak | Imię |
| `params.clients.clientType.guestData.lastName` | string | tak | Nazwisko |
| `params.clients.clientType.guestData.street` | string | tak | Adres |
| `params.clients.clientType.guestData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `params.clients.clientType.guestData.city` | string | tak | Miasto |
| `params.clients.clientType.guestData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `params.clients.clientType.guestData.phone` | string | nieoznaczone | Telefon Przykład: +48.787676543 |
| `params.clients.clientType.guestData.email` | string | nieoznaczone | Adres e-mail |
| `params.clients.clientType.guestData.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `params.clients.clientType.invoiceData` | invoiceDataType | nieoznaczone | Dane do faktury |
| `params.clients.clientType.invoiceData.firstName` | string | nieoznaczone | Imię |
| `params.clients.clientType.invoiceData.lastName` | string | nieoznaczone | Nazwisko |
| `params.clients.clientType.invoiceData.companyName` | string | nieoznaczone | Nazwa firmy |
| `params.clients.clientType.invoiceData.taxNumber` | string | nieoznaczone | NIP |
| `params.clients.clientType.invoiceData.street` | string | tak | Adres |
| `params.clients.clientType.invoiceData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `params.clients.clientType.invoiceData.city` | string | tak | Miasto |
| `params.clients.clientType.invoiceData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `params.clients.clientType.notification` | notificationType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Informuj klienta przez wiadomość E-mail o zmianach danych konta |
| `params.clients.clientType.sendNewsletter` | sendNewsletterType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wyślij newsletter |
| `params.clients.clientType.note` | string | nieoznaczone | Notatka o kliencie |
| `params.clients.clientType.discountForItemsInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji objętych promocją, % |
| `params.clients.clientType.discountForItemsNotInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji nieobjętych promocją, % |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `clients` | changeClientsTypeArray | nieoznaczone | Dodani klienci w postaci tablicy elementów typu changeClientsType |
| `clients.changeClientsType` | changeClientsType | tak | element typu changeClientsType |
| `clients.changeClientsType.success` | boolean | tak | Sukces |
| `clients.changeClientsType.error` | errorType | nieoznaczone | Błąd |
| `clients.changeClientsType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `clients.changeClientsType.error.faultString` | string | nieoznaczone | Opis błędu |
| `clients.changeClientsType.clientId` | int | nieoznaczone | Identyfikator klienta |
| `clients.changeClientsType.clientLogin` | string | nieoznaczone | Login klienta |

## Przykład PHP dostawcy

[Osobny plik PHP](add.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/clients/add/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['clients'] = array();
$request['params']['clients'][0] = array();
$request['params']['clients'][0]['login'] = "login";
$request['params']['clients'][0]['password'] = "password";
$request['params']['clients'][0]['type'] = 'person';
$request['params']['clients'][0]['status'] = 'active';
$request['params']['clients'][0]['companyName'] = "companyName";
$request['params']['clients'][0]['taxNumber'] = "taxNumber";
$request['params']['clients'][0]['firstName'] = "firstName";
$request['params']['clients'][0]['lastName'] = "lastName";
$request['params']['clients'][0]['street'] = "street";
$request['params']['clients'][0]['zipcode'] = "zipcode";
$request['params']['clients'][0]['city'] = "city";
$request['params']['clients'][0]['countryCode'] = "countryCode";
$request['params']['clients'][0]['phone'] = "phone";
$request['params']['clients'][0]['email'] = "email";
$request['params']['clients'][0]['language'] = "language";
$request['params']['clients'][0]['currency'] = "currency";
$request['params']['clients'][0]['guestData'] = array();
$request['params']['clients'][0]['guestData']['firstName'] = "firstName";
$request['params']['clients'][0]['guestData']['lastName'] = "lastName";
$request['params']['clients'][0]['guestData']['street'] = "street";
$request['params']['clients'][0]['guestData']['zipcode'] = "zipcode";
$request['params']['clients'][0]['guestData']['city'] = "city";
$request['params']['clients'][0]['guestData']['countryCode'] = "countryCode";
$request['params']['clients'][0]['guestData']['phone'] = "phone";
$request['params']['clients'][0]['guestData']['email'] = "email";
$request['params']['clients'][0]['guestData']['language'] = "language";
$request['params']['clients'][0]['invoiceData'] = array();
$request['params']['clients'][0]['invoiceData']['firstName'] = "firstName";
$request['params']['clients'][0]['invoiceData']['lastName'] = "lastName";
$request['params']['clients'][0]['invoiceData']['companyName'] = "companyName";
$request['params']['clients'][0]['invoiceData']['taxNumber'] = "taxNumber";
$request['params']['clients'][0]['invoiceData']['street'] = "street";
$request['params']['clients'][0]['invoiceData']['zipcode'] = "zipcode";
$request['params']['clients'][0]['invoiceData']['city'] = "city";
$request['params']['clients'][0]['invoiceData']['countryCode'] = "countryCode";
$request['params']['clients'][0]['notification'] = 'y';
$request['params']['clients'][0]['sendNewsletter'] = 'y';
$request['params']['clients'][0]['note'] = "note";
$request['params']['clients'][0]['discountForItemsInPromotion'] = 1.0;
$request['params']['clients'][0]['discountForItemsNotInPromotion'] = 2.0;

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

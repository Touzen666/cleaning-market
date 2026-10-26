# Bramka Clients/Metoda get

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=clients&method=get##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](get.jpg).

## Opis

Pobiera informacje o kliencie i jego gościach

## Adres JSON

`https://_domena_booking_.idosell.com/api/clients/get/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `settings` | settingsType | nieoznaczone | Ustawienia |
| `settings.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `settings.number` | int | nieoznaczone | Liczba wyników na stronie. Wartości od 1 do 100 |
| `params` | paramsType | nieoznaczone | Parametry przekazywane do metody |
| `params.id` | int | nieoznaczone | Identyfikator klienta |
| `params.login` | string | nieoznaczone | Login klienta |
| `params.firstName` | string | nieoznaczone | Imię klienta |
| `params.lastName` | string | nieoznaczone | Nazwisko klienta |
| `params.email` | string | nieoznaczone | Adres e-mail klienta |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | tak | Kod błędu |
| `errors.faultString` | string | tak | Opis błędu |
| `clients` | clientWithGuestTypeArray | nieoznaczone | Klienci |
| `clients.clientWithGuestType` | clientWithGuestType | tak | element typu clientWithGuestType |
| `clients.clientWithGuestType.login` | string | tak | Login |
| `clients.clientWithGuestType.id` | int | tak | Identyfikator klienta |
| `clients.clientWithGuestType.clientType` | clientTypeType | tak | Możliwe wartości: (person, company)<br><br>Typ klienta, person - osoba prywatna, company - firma |
| `clients.clientWithGuestType.status` | clientStatusType | tak | Możliwe wartości: (active, blocked) |
| `clients.clientWithGuestType.companyName` | string | nieoznaczone | Nazwa firmy |
| `clients.clientWithGuestType.taxNumber` | string | nieoznaczone | NIP |
| `clients.clientWithGuestType.firstName` | string | tak | Imię |
| `clients.clientWithGuestType.lastName` | string | tak | Nazwisko |
| `clients.clientWithGuestType.street` | string | tak | Adres |
| `clients.clientWithGuestType.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `clients.clientWithGuestType.city` | string | tak | Miasto |
| `clients.clientWithGuestType.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `clients.clientWithGuestType.phone` | string | nieoznaczone | Telefon |
| `clients.clientWithGuestType.email` | string | nieoznaczone | Adres e-mail |
| `clients.clientWithGuestType.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pl |
| `clients.clientWithGuestType.currency` | string | tak | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `clients.clientWithGuestType.guests` | guestTypeArray | tak | Goście |
| `clients.clientWithGuestType.guests.guestType` | guestType | tak | element typu guestType |
| `clients.clientWithGuestType.guests.guestType.firstName` | string | tak | Imię |
| `clients.clientWithGuestType.guests.guestType.lastName` | string | tak | Nazwisko |
| `clients.clientWithGuestType.guests.guestType.street` | string | tak | Adres |
| `clients.clientWithGuestType.guests.guestType.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `clients.clientWithGuestType.guests.guestType.city` | string | tak | Miasto |
| `clients.clientWithGuestType.guests.guestType.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `clients.clientWithGuestType.guests.guestType.phone` | string | nieoznaczone | Telefon Przykład: +48.787676543 |
| `clients.clientWithGuestType.guests.guestType.email` | string | nieoznaczone | Adres e-mail |
| `clients.clientWithGuestType.guests.guestType.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pl |
| `clients.clientWithGuestType.invoiceData` | invoiceDataType | nieoznaczone | Dane do faktury |
| `clients.clientWithGuestType.invoiceData.firstName` | string | nieoznaczone | Imię |
| `clients.clientWithGuestType.invoiceData.lastName` | string | nieoznaczone | Nazwisko |
| `clients.clientWithGuestType.invoiceData.companyName` | string | nieoznaczone | Nazwa firmy |
| `clients.clientWithGuestType.invoiceData.taxNumber` | string | nieoznaczone | NIP |
| `clients.clientWithGuestType.invoiceData.street` | string | tak | Adres |
| `clients.clientWithGuestType.invoiceData.zipcode` | string | tak | Kod pocztowy zgodny z kodami obowiązującymi w danym kraju |
| `clients.clientWithGuestType.invoiceData.city` | string | tak | Miasto |
| `clients.clientWithGuestType.invoiceData.countryCode` | string | tak | Kraj (kod w ISO 3166-1 alfa-2). Przykład: en, pl |
| `clients.clientWithGuestType.notification` | notificationType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Informuj klienta przez wiadomość E-mail o zmianach danych konta |
| `clients.clientWithGuestType.sendNewsletter` | sendNewsletterType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wyślij newsletter |
| `clients.clientWithGuestType.note` | string | nieoznaczone | Notatka o kliencie |
| `clients.clientWithGuestType.discountForItemsInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji objętych promocją, % |
| `clients.clientWithGuestType.discountForItemsNotInPromotion` | float | nieoznaczone | Rabat naliczany do rezerwacji nieobjętych promocją, % |
| `result` | resultResponseTypeType | nieoznaczone | Dane na temat zwracanych wyników |
| `result.page` | int | tak | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `result.countOnPage` | int | tak | Ilość wyników na stronie |
| `result.pageAll` | int | tak | Suma stron |
| `result.countAll` | int | tak | Suma wszystkich wyników |

## Przykład PHP dostawcy

[Osobny plik PHP](get.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/clients/get/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['settings'] = array();
$request['settings']['page'] = 1;
$request['settings']['number'] = 2;
$request['params'] = array();
$request['params']['id'] = 3;
$request['params']['login'] = "login";
$request['params']['firstName'] = "firstName";
$request['params']['lastName'] = "lastName";
$request['params']['email'] = "email";

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

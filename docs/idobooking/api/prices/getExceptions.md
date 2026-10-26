# Bramka Prices/Metoda getExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=prices&method=getExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getExceptions.jpg).

## Opis

Pobiera listę nadpisanych cen w podanych źródłach rezerwacji, we wskazanych przedmiotach rezerwacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/prices/getExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `getPriceException` | getPriceException | tak | element typu getPriceException |
| `getPriceException.priceExceptionId` | int | nieoznaczone | Identyfikator nadpisanej ceny |
| `getPriceException.sourceId` | int | nieoznaczone | Identyfikator kanału sprzedaży |
| `getPriceException.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `getPriceException.offerType` | offerTypeType | nieoznaczone | Możliwe wartości: (refundable, nonrefundable, all)<br><br>Typ oferty |
| `getPriceException.persons` | int | nieoznaczone | Liczba osób |
| `getPriceException.priceExceptionDate` | string | nieoznaczone | Dzień, w którym jest nadpisana cena |
| `getPriceException.priceExceptionType` | priceExceptionTypeType | nieoznaczone | Możliwe wartości: (whole, rateplan)<br><br>Rodzaj nadpisanej ceny |

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
| `success` | boolean | nieoznaczone | Sukces |
| `getPriceExceptions` | getPriceExceptionsResultArray | nieoznaczone | Lista z informacjami o powodzeniu lub błędach podczas pobierania nadpisanych cen w postaci tablicy elementów typu PriceException |
| `getPriceExceptions.priceException` | priceException | tak | element typu priceException |
| `getPriceExceptions.priceException.success` | boolean | tak | Sukces |
| `getPriceExceptions.priceException.errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `getPriceExceptions.priceException.errors.faultCode` | int | nieoznaczone | Kod błędu |
| `getPriceExceptions.priceException.errors.faultString` | string | nieoznaczone | Opis błędu |
| `getPriceExceptions.priceException.priceExceptionId` | int | nieoznaczone | Identyfikator nadpisanej ceny |
| `getPriceExceptions.priceException.sourceId` | int | nieoznaczone | Identyfikator kanału sprzedaży |
| `getPriceExceptions.priceException.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `getPriceExceptions.priceException.offerType` | string | nieoznaczone | Typ oferty |
| `getPriceExceptions.priceException.persons` | int | nieoznaczone | Liczba osób |
| `getPriceExceptions.priceException.price` | float | nieoznaczone | Cena |
| `getPriceExceptions.priceException.priceExceptionDate` | string | nieoznaczone | Dzień, w którym jest nadpisana cena |
| `getPriceExceptions.priceException.priceExceptionType` | string | nieoznaczone | Rodzaj nadpisanej ceny |

## Przykład PHP dostawcy

[Osobny plik PHP](getExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/prices/getExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['getPriceException'] = array();
$request['getPriceException']['priceExceptionId'] = 1;
$request['getPriceException']['sourceId'] = 2;
$request['getPriceException']['objectId'] = 3;
$request['getPriceException']['offerType'] = 'refundable';
$request['getPriceException']['persons'] = 4;
$request['getPriceException']['priceExceptionDate'] = "priceExceptionDate";
$request['getPriceException']['priceExceptionType'] = 'whole';

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

# Bramka Prices/Metoda deleteExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=prices&method=deleteExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](deleteExceptions.jpg).

## Opis

Usuwa nadpisaną cenę i przywraca cenę sprzed modyfikacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/prices/deleteExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `deletePriceExceptions` | deletePriceExceptionsArray | tak | Lista nadpisanych cen w postaci tablicy elementów typu deletePriceException |
| `deletePriceExceptions.deletePriceException` | deletePriceException | tak | element typu deletePriceException |
| `deletePriceExceptions.deletePriceException.priceExceptionId` | int | nieoznaczone | Identyfikator nadpisanej ceny |
| `deletePriceExceptions.deletePriceException.sourceId` | int | nieoznaczone | Identyfikator kanału sprzedaży |
| `deletePriceExceptions.deletePriceException.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `deletePriceExceptions.deletePriceException.offerType` | offerTypeType | nieoznaczone | Możliwe wartości: (refundable, nonrefundable, all)<br><br>Typ oferty |
| `deletePriceExceptions.deletePriceException.persons` | int | nieoznaczone | Liczba osób |
| `deletePriceExceptions.deletePriceException.priceExceptionDate` | string | nieoznaczone | Dzień, w którym jest nadpisana cena |
| `deletePriceExceptions.deletePriceException.priceExceptionType` | priceExceptionTypeType | nieoznaczone | Możliwe wartości: (whole, rateplan)<br><br>Rodzaj nadpisanej ceny |

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
| `deletedPriceExceptions` | deletedPriceExceptionsResultArray | nieoznaczone | Lista z informacjami o powodzeniu lub błędach podczas usuwania nadpisanej ceny w postaci tablicy elementów typu deletedPriceException |
| `deletedPriceExceptions.deletedPriceExceptionResult` | deletedPriceExceptionResult | tak | element typu deletedPriceExceptionResult |
| `deletedPriceExceptions.deletedPriceExceptionResult.success` | boolean | tak | Sukces |
| `deletedPriceExceptions.deletedPriceExceptionResult.errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `deletedPriceExceptions.deletedPriceExceptionResult.errors.faultCode` | int | nieoznaczone | Kod błędu |
| `deletedPriceExceptions.deletedPriceExceptionResult.errors.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](deleteExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/prices/deleteExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['deletePriceExceptions'] = array();
$request['deletePriceExceptions'][0] = array();
$request['deletePriceExceptions'][0]['priceExceptionId'] = 1;
$request['deletePriceExceptions'][0]['sourceId'] = 2;
$request['deletePriceExceptions'][0]['objectId'] = 3;
$request['deletePriceExceptions'][0]['offerType'] = 'refundable';
$request['deletePriceExceptions'][0]['persons'] = 4;
$request['deletePriceExceptions'][0]['priceExceptionDate'] = "priceExceptionDate";
$request['deletePriceExceptions'][0]['priceExceptionType'] = 'whole';

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

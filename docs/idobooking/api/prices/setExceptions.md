# Bramka Prices/Metoda setExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=prices&method=setExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](setExceptions.jpg).

## Opis

Nadpisuje dotychczasową cenę nową wartością

## Adres JSON

`https://_domena_booking_.idosell.com/api/prices/setExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `setPriceExceptions` | setPriceExceptionsArray | tak |  |
| `setPriceExceptions.setPriceException` | setPriceException | tak | element typu setPriceException |
| `setPriceExceptions.setPriceException.sourcesIds` | intArray | nieoznaczone | Identyfikatory kanałów sprzedaży<br><br>element typu int |
| `setPriceExceptions.setPriceException.sourcesIds.int` | int | tak | element typu int |
| `setPriceExceptions.setPriceException.objectsIds` | intArray | tak | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `setPriceExceptions.setPriceException.objectsIds.int` | int | tak | element typu int |
| `setPriceExceptions.setPriceException.offerType` | offerTypeType | tak | Możliwe wartości: (refundable, nonrefundable, all)<br><br>Typ oferty |
| `setPriceExceptions.setPriceException.persons` | int | nieoznaczone | Liczba osób |
| `setPriceExceptions.setPriceException.price` | float | tak | Cena |
| `setPriceExceptions.setPriceException.priceExceptionDateFrom` | string | tak | Dzień od którego nadpisywane są ceny |
| `setPriceExceptions.setPriceException.priceExceptionDateTo` | string | tak | Dzień do którego nadpisywane są ceny |
| `setPriceExceptions.setPriceException.priceExceptionType` | priceExceptionTypeType | tak | Możliwe wartości: (whole, rateplan)<br><br>Rodzaj nadpisanej ceny |

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

## Przykład PHP dostawcy

[Osobny plik PHP](setExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/prices/setExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['setPriceExceptions'] = array();
$request['setPriceExceptions'][0] = array();
$request['setPriceExceptions'][0]['sourcesIds'] = array();
$request['setPriceExceptions'][0]['sourcesIds'][0] = 1;
$request['setPriceExceptions'][0]['objectsIds'] = array();
$request['setPriceExceptions'][0]['objectsIds'][0] = 2;
$request['setPriceExceptions'][0]['offerType'] = 'refundable';
$request['setPriceExceptions'][0]['persons'] = 3;
$request['setPriceExceptions'][0]['price'] = 4.0;
$request['setPriceExceptions'][0]['priceExceptionDateFrom'] = "priceExceptionDateFrom";
$request['setPriceExceptions'][0]['priceExceptionDateTo'] = "priceExceptionDateTo";
$request['setPriceExceptions'][0]['priceExceptionType'] = 'whole';

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

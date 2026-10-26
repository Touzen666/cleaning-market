# Allotments/Metoda getExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=allotments&method=getExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getExceptions.jpg).

## Opis

Pobiera listę nadpisywanych dostępności.

## Adres JSON

`https://_domena_booking_.idosell.com/api/allotments/getExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `getAllotmentException` | getAllotmentException | tak | Element typu getAllotmentException |
| `getAllotmentException.type` | typeType | nieoznaczone | Możliwe wartości: (source, all)<br><br>Typ nadpisywanej dostępności |
| `getAllotmentException.sourcesIds` | intArray | nieoznaczone | Identyfikatory kanałów sprzedaży<br><br>element typu int |
| `getAllotmentException.sourcesIds.int` | int | tak | element typu int |
| `getAllotmentException.objectsIds` | objectsIdsType | nieoznaczone | Identyfikatory przedmiotów rezerwacji |
| `getAllotmentException.objectsIds.int` | int | tak | element typu int |
| `getAllotmentException.allotmentExceptionDateFrom` | string | nieoznaczone | Dzień od którego jest nadpisywana dostępność |
| `getAllotmentException.allotmentExceptionDateTo` | string | nieoznaczone | Dzień do którego jest nadpisywana dostępność |

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
| `getAllotmentExceptions` | getAllotmentExceptionsResultArray | nieoznaczone | Lista nadpisanych dostępności w postaci tablicy elementów typu AllotmentException |
| `getAllotmentExceptions.allotmentException` | allotmentException | tak | element typu allotmentException |
| `getAllotmentExceptions.allotmentException.type` | string | tak | Typ nadpisywanej dostępności |
| `getAllotmentExceptions.allotmentException.sourceId` | int | nieoznaczone | Identyfikator kanału sprzedaży |
| `getAllotmentExceptions.allotmentException.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `getAllotmentExceptions.allotmentException.allotmentExceptionDate` | string | tak | Dzień w którym nadpisywana jest dostępność |
| `getAllotmentExceptions.allotmentException.allotment` | string | tak | Dostępność |

## Przykład PHP dostawcy

[Osobny plik PHP](getExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/allotments/getExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['getAllotmentException'] = array();
$request['getAllotmentException']['type'] = 'source';
$request['getAllotmentException']['sourcesIds'] = array();
$request['getAllotmentException']['sourcesIds'][0] = 1;
$request['getAllotmentException']['objectsIds'] = array();
$request['getAllotmentException']['objectsIds'][0] = 2;
$request['getAllotmentException']['allotmentExceptionDateFrom'] = "allotmentExceptionDateFrom";
$request['getAllotmentException']['allotmentExceptionDateTo'] = "allotmentExceptionDateTo";

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

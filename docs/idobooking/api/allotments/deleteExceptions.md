# Allotments/Metoda deleteExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=allotments&method=deleteExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](deleteExceptions.jpg).

## Opis

Usuwa nadpisaną dostępność i przywraca dostępność sprzed modyfikacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/allotments/deleteExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `deleteAllotmentExceptions` | deleteAllotmentExceptionsArray | tak |  |
| `deleteAllotmentExceptions.deleteAllotmentException` | deleteAllotmentException | tak | element typu deleteAllotmentException |
| `deleteAllotmentExceptions.deleteAllotmentException.type` | typeType | nieoznaczone | Możliwe wartości: (source, all)<br><br>Typ nadpisywanej dostępności |
| `deleteAllotmentExceptions.deleteAllotmentException.sourcesIds` | intArray | nieoznaczone | Identyfikatory kanałów sprzedaży<br><br>element typu int |
| `deleteAllotmentExceptions.deleteAllotmentException.sourcesIds.int` | int | tak | element typu int |
| `deleteAllotmentExceptions.deleteAllotmentException.objectsIds` | intArray | nieoznaczone | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `deleteAllotmentExceptions.deleteAllotmentException.objectsIds.int` | int | tak | element typu int |
| `deleteAllotmentExceptions.deleteAllotmentException.allotmentExceptionDateFrom` | string | nieoznaczone | Dzień od którego jest nadpisywana dostępność |
| `deleteAllotmentExceptions.deleteAllotmentException.allotmentExceptionDateTo` | string | nieoznaczone | Dzień do którego jest nadpisywana dostępność |

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
| `deleteAllotmentExceptions` | deleteAlotmentExceptionsResultArray | nieoznaczone | Lista z informacjami o powodzeniu lub błędach podczas usuwania nadpisanej dostępności w postaci tablicy elementów typu deleteAllotmentException |
| `deleteAllotmentExceptions.allotmentException` | allotmentException | tak | element typu allotmentException |
| `deleteAllotmentExceptions.allotmentException.success` | boolean | tak | Sukces |
| `deleteAllotmentExceptions.allotmentException.error` | errorType | nieoznaczone |  |
| `deleteAllotmentExceptions.allotmentException.error.faultCode` | int | nieoznaczone | Kod błędu |
| `deleteAllotmentExceptions.allotmentException.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](deleteExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/allotments/deleteExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['deleteAllotmentExceptions'] = array();
$request['deleteAllotmentExceptions'][0] = array();
$request['deleteAllotmentExceptions'][0]['type'] = 'source';
$request['deleteAllotmentExceptions'][0]['sourcesIds'] = array();
$request['deleteAllotmentExceptions'][0]['sourcesIds'][0] = 1;
$request['deleteAllotmentExceptions'][0]['objectsIds'] = array();
$request['deleteAllotmentExceptions'][0]['objectsIds'][0] = 2;
$request['deleteAllotmentExceptions'][0]['allotmentExceptionDateFrom'] = "allotmentExceptionDateFrom";
$request['deleteAllotmentExceptions'][0]['allotmentExceptionDateTo'] = "allotmentExceptionDateTo";

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

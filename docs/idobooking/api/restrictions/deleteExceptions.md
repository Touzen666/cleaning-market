# Restrictions/Metoda deleteExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=restrictions&method=deleteExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](deleteExceptions.jpg).

## Opis

Usuwa nadpisane restrykcje i przywraca restrykcje z planów cenowych.

## Adres JSON

`https://_domena_booking_.idosell.com/api/restrictions/deleteExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `deleteRestrictionExceptions` | deleteRestrictionExceptionsArray | tak |  |
| `deleteRestrictionExceptions.deleteRestrictionException` | deleteRestrictionException | tak | element typu deleteRestrictionException |
| `deleteRestrictionExceptions.deleteRestrictionException.objectsIds` | intArray | nieoznaczone | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `deleteRestrictionExceptions.deleteRestrictionException.objectsIds.int` | int | tak | element typu int |
| `deleteRestrictionExceptions.deleteRestrictionException.offerType` | offerTypeType | nieoznaczone | Możliwe wartości: (refundable, nonrefundable, all)<br><br>Typ oferty |
| `deleteRestrictionExceptions.deleteRestrictionException.restrictionExceptionDateFrom` | string | nieoznaczone | Dzień od którego nadpisywane są restrykcje |
| `deleteRestrictionExceptions.deleteRestrictionException.restrictionExceptionDateTo` | string | nieoznaczone | Dzień do którego nadpisywane są restrykcje |

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
| `deleteRestrictionExceptions` | deleteRestrictionExceptionsResultArray | nieoznaczone |  |
| `deleteRestrictionExceptions.RestrictionException` | RestrictionException | tak | element typu RestrictionException |
| `deleteRestrictionExceptions.RestrictionException.success` | boolean | tak | Sukces |
| `deleteRestrictionExceptions.RestrictionException.error` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `deleteRestrictionExceptions.RestrictionException.error.faultCode` | int | nieoznaczone | Kod błędu |
| `deleteRestrictionExceptions.RestrictionException.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](deleteExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/restrictions/deleteExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['deleteRestrictionExceptions'] = array();
$request['deleteRestrictionExceptions'][0] = array();
$request['deleteRestrictionExceptions'][0]['objectsIds'] = array();
$request['deleteRestrictionExceptions'][0]['objectsIds'][0] = 1;
$request['deleteRestrictionExceptions'][0]['offerType'] = 'refundable';
$request['deleteRestrictionExceptions'][0]['restrictionExceptionDateFrom'] = "restrictionExceptionDateFrom";
$request['deleteRestrictionExceptions'][0]['restrictionExceptionDateTo'] = "restrictionExceptionDateTo";

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

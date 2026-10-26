# Restrictions/Metoda getExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=restrictions&method=getExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getExceptions.jpg).

## Opis

Pobiera listę nadpisywanych restrykcji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/restrictions/getExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `getRestrictionException` | getRestrictionException | tak |  |
| `getRestrictionException.objectsIds` | intArray | nieoznaczone | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `getRestrictionException.objectsIds.int` | int | tak | element typu int |
| `getRestrictionException.offerType` | offerTypeType | nieoznaczone | Możliwe wartości: (refundable, nonrefundable, all)<br><br>Typ oferty |
| `getRestrictionException.restrictionExceptionDateFrom` | string | nieoznaczone | Dzień od którego nadpisywane są restrykcje |
| `getRestrictionException.restrictionExceptionDateTo` | string | nieoznaczone | Dzień do którego nadpisywane są restrykcje |

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
| `getRestrictionExceptions` | getRestrictionExceptionsResultArray | nieoznaczone |  |
| `getRestrictionExceptions.RestrictionException` | RestrictionException | tak | element typu RestrictionException |
| `getRestrictionExceptions.RestrictionException.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `getRestrictionExceptions.RestrictionException.offerType` | string | tak | Typ oferty |
| `getRestrictionExceptions.RestrictionException.restrictionExceptionDate` | string | tak | Dzień w którym zapisywana jest restrykcja |
| `getRestrictionExceptions.RestrictionException.closedToArrival` | boolean | tak | Zamknięte na przyjazd (CTA) |
| `getRestrictionExceptions.RestrictionException.closedToDeparture` | boolean | tak | Zamknięte na wyjazd (CTD) |
| `getRestrictionExceptions.RestrictionException.lengthSetting` | lengthSettingType | tak | Długość rezerwacji |
| `getRestrictionExceptions.RestrictionException.lengthSetting.lengthMode` | lengthModeType | tak | Możliwe wartości: (free, exact, minimal, multiplication) |
| `getRestrictionExceptions.RestrictionException.lengthSetting.lengthType` | lengthTypeType | nieoznaczone | Możliwe wartości: (days, weeks, months) |
| `getRestrictionExceptions.RestrictionException.lengthSetting.lengthStay` | int | nieoznaczone |  |

## Przykład PHP dostawcy

[Osobny plik PHP](getExceptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/restrictions/getExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['getRestrictionException'] = array();
$request['getRestrictionException']['objectsIds'] = array();
$request['getRestrictionException']['objectsIds'][0] = 1;
$request['getRestrictionException']['offerType'] = 'refundable';
$request['getRestrictionException']['restrictionExceptionDateFrom'] = "restrictionExceptionDateFrom";
$request['getRestrictionException']['restrictionExceptionDateTo'] = "restrictionExceptionDateTo";

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

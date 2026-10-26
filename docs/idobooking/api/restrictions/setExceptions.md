# Restrictions/Metoda setExceptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=restrictions&method=setExceptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](setExceptions.jpg).

## Opis

Nadpisuje restrykcje dostępności.

## Adres JSON

`https://_domena_booking_.idosell.com/api/restrictions/setExceptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `setRestrictionExceptions` | setRestrictionExceptionsArray | tak |  |
| `setRestrictionExceptions.setRestrictionException` | setRestrictionException | tak | element typu setRestrictionException |
| `setRestrictionExceptions.setRestrictionException.objectsIds` | intArray | tak | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `setRestrictionExceptions.setRestrictionException.objectsIds.int` | int | tak | element typu int |
| `setRestrictionExceptions.setRestrictionException.offerType` | string | tak | Typ oferty |
| `setRestrictionExceptions.setRestrictionException.restrictionExceptionDateFrom` | string | tak | Dzień od którego nadpisywane są restrykcje |
| `setRestrictionExceptions.setRestrictionException.restrictionExceptionDateTo` | string | tak | Dzień do którego nadpisywane są restrykcje |
| `setRestrictionExceptions.setRestrictionException.closedToArrival` | boolean | tak | Zamknięte na przyjazd (CTA) |
| `setRestrictionExceptions.setRestrictionException.closedToDeparture` | boolean | tak | Zamknięte na wyjazd (CTD) |
| `setRestrictionExceptions.setRestrictionException.lengthSetting` | lengthSettingType | tak | Długość rezerwacji |
| `setRestrictionExceptions.setRestrictionException.lengthSetting.lengthMode` | lengthModeType | tak | Możliwe wartości: (free, exact, minimal, multiplication) |
| `setRestrictionExceptions.setRestrictionException.lengthSetting.lengthType` | lengthTypeType | nieoznaczone | Możliwe wartości: (days, weeks, months) |
| `setRestrictionExceptions.setRestrictionException.lengthSetting.lengthStay` | int | nieoznaczone |  |

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

$address = 'https://client1679.idobooking.com/api/restrictions/setExceptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['setRestrictionExceptions'] = array();
$request['setRestrictionExceptions'][0] = array();
$request['setRestrictionExceptions'][0]['objectsIds'] = array();
$request['setRestrictionExceptions'][0]['objectsIds'][0] = 1;
$request['setRestrictionExceptions'][0]['offerType'] = "offerType";
$request['setRestrictionExceptions'][0]['restrictionExceptionDateFrom'] = "restrictionExceptionDateFrom";
$request['setRestrictionExceptions'][0]['restrictionExceptionDateTo'] = "restrictionExceptionDateTo";
$request['setRestrictionExceptions'][0]['closedToArrival'] = true;
$request['setRestrictionExceptions'][0]['closedToDeparture'] = true;
$request['setRestrictionExceptions'][0]['lengthSetting'] = array();
$request['setRestrictionExceptions'][0]['lengthSetting']['lengthMode'] = 'free';
$request['setRestrictionExceptions'][0]['lengthSetting']['lengthType'] = 'days';
$request['setRestrictionExceptions'][0]['lengthSetting']['lengthStay'] = 2;

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

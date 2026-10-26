# Bramka Objects/Metoda editLocation

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=editLocation##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editLocation.jpg).

## Opis

Zmienia lokalizację przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/editLocation/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectsLocations` | objectLocationArray | tak | Lista powiązań lokalizacji z przemiotem rezerwacji w postaci tablicy elementów objectLocationRequestType |
| `objectsLocations.objectLocationRequestType` | objectLocationRequestType | tak | element typu objectLocationRequestType |
| `objectsLocations.objectLocationRequestType.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `objectsLocations.objectLocationRequestType.locationId` | int | tak | Identyfikator lokalizacji |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `objectLocationsResponse` | objectLocationArray | tak | Lista powiązań lokalizacji z przemiotem rezerwacji w postaci tablicy elementów objectLocationRequestType |
| `objectLocationsResponse.objectLocationRequestType` | objectLocationRequestType | tak | element typu objectLocationRequestType |
| `objectLocationsResponse.objectLocationRequestType.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `objectLocationsResponse.objectLocationRequestType.locationId` | int | tak | Identyfikator lokalizacji |
| `success` | boolean | tak | Sukces |

## Przykład PHP dostawcy

[Osobny plik PHP](editLocation.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/editLocation/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectsLocations'] = array();
$request['objectsLocations'][0] = array();
$request['objectsLocations'][0]['objectId'] = 1;
$request['objectsLocations'][0]['locationId'] = 2;

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

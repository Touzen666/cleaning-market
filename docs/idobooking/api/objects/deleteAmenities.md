# Bramka Objects/Metoda deleteAmenities

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=deleteAmenities##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](deleteAmenities.jpg).

## Opis

Usuwa wybrane udogodnienia z przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/deleteAmenities/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectAmenities` | objectAmenitiesArray | tak | Lista udogodnień przedmiotu rezerwacji w postaci tablicy elementów objectAmenity |
| `objectAmenities.objectAmenity` | objectAmenity | tak | element typu objectAmenity |
| `objectAmenities.objectAmenity.id` | int | tak | Identyfikator udogodnienia |
| `objectAmenities.objectAmenity.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |

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
| `deleteObjectAmenities` | deleteObjectAmenitiesResultArray | nieoznaczone | Lista udogodnień przedmiotu rezerwacji w postaci tablicy elementów deleteObjectAmenityResult |
| `deleteObjectAmenities.deleteObjectAmenityResult` | deleteObjectAmenityResult | tak | element typu deleteObjectAmenityResult |
| `deleteObjectAmenities.deleteObjectAmenityResult.success` | boolean | tak | Sukces |
| `deleteObjectAmenities.deleteObjectAmenityResult.error` | errorType | nieoznaczone | Błąd |
| `deleteObjectAmenities.deleteObjectAmenityResult.error.faultCode` | int | nieoznaczone | Kod błędu |
| `deleteObjectAmenities.deleteObjectAmenityResult.error.faultString` | string | nieoznaczone | Opis błędu |
| `deleteObjectAmenities.deleteObjectAmenityResult.id` | int | tak | Identyfikator udogodnienia |

## Przykład PHP dostawcy

[Osobny plik PHP](deleteAmenities.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/deleteAmenities/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectAmenities'] = array();
$request['objectAmenities'][0] = array();
$request['objectAmenities'][0]['id'] = 1;
$request['objectAmenities'][0]['objectId'] = 2;

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

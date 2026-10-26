# Bramka Objects/Metoda addAmenities

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=addAmenities##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](addAmenities.jpg).

## Opis

Przypisuje wybrane udogodnienia do przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/addAmenities/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectAmenities` | objectAmenities | tak | Lista udogodnień przedmiotu rezerwacji w postaci tablicy elementów objectAmenity |
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
| `addObjectAmenities` | addObjectAmenitiesResult | nieoznaczone |  |
| `addObjectAmenities.addObjectAmenityResult` | addObjectAmenityResult | tak | element typu addObjectAmenityResult |
| `addObjectAmenities.addObjectAmenityResult.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `addObjectAmenities.addObjectAmenityResult.id` | int | tak | Identyfikator udogodnienia |
| `addObjectAmenities.addObjectAmenityResult.success` | boolean | tak | Sukces |
| `addObjectAmenities.addObjectAmenityResult.error` | errorType | nieoznaczone | Błąd |
| `addObjectAmenities.addObjectAmenityResult.error.faultCode` | int | nieoznaczone | Kod błędu |
| `addObjectAmenities.addObjectAmenityResult.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](addAmenities.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/addAmenities/36/json';

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

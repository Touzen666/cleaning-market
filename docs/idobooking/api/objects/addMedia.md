# Bramka Objects/Metoda addMedia

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=addMedia##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](addMedia.jpg).

## Opis

Dodaje pliki multimedialne do przedmiotów rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/addMedia/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `addObjectMedia` | addObjectMediaArray | tak | Lista elementów multimedialnych w postaci tablicy elementów typu addObjectMedium |
| `addObjectMedia.addObjectMedium` | addObjectMedium | tak | element typu addObjectMedium |
| `addObjectMedia.addObjectMedium.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `addObjectMedia.addObjectMedium.source` | sourceType | tak | Możliwe wartości: (uri, base64)<br><br>Sposób przekazywania informacji |
| `addObjectMedia.addObjectMedium.type` | typeType | tak | Możliwe wartości: (picture, video)<br><br>Rodzaj elementu multimedialnego |
| `addObjectMedia.addObjectMedium.priority` | int | nieoznaczone | Priorytet |
| `addObjectMedia.addObjectMedium.icon` | boolean | nieoznaczone | Czy element ma zostać ustawiony jako ikona przedmiotu rezerwacji |
| `addObjectMedia.addObjectMedium.data` | string | tak | Elementu multimedialny |

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
| `addedObjectsMedia` | addedObjectsMediaResultArray | nieoznaczone | Lista z informacjami o powodzeniu lub błędach podczas edycji multimediów w postaci tablicy elementów typu objectMediumResult |
| `addedObjectsMedia.objectMediumResult` | objectMediumResult | tak | element typu objectMediumResult |
| `addedObjectsMedia.objectMediumResult.success` | boolean | tak | Sukces |
| `addedObjectsMedia.objectMediumResult.errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `addedObjectsMedia.objectMediumResult.errors.faultCode` | int | nieoznaczone | Kod błędu |
| `addedObjectsMedia.objectMediumResult.errors.faultString` | string | nieoznaczone | Opis błędu |
| `addedObjectsMedia.objectMediumResult.objectId` | int | tak |  |
| `addedObjectsMedia.objectMediumResult.id` | int | nieoznaczone | Identyfikator elementu multimedialnego |

## Przykład PHP dostawcy

[Osobny plik PHP](addMedia.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/addMedia/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['addObjectMedia'] = array();
$request['addObjectMedia'][0] = array();
$request['addObjectMedia'][0]['objectId'] = 1;
$request['addObjectMedia'][0]['source'] = 'uri';
$request['addObjectMedia'][0]['type'] = 'picture';
$request['addObjectMedia'][0]['priority'] = 2;
$request['addObjectMedia'][0]['icon'] = true;
$request['addObjectMedia'][0]['data'] = "data";

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

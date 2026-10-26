# Bramka Objects/Metoda editMedia

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=editMedia##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editMedia.jpg).

## Opis

Edytuje pliki multimedialne dodane do przedmiotu rezerwacji umożliwiając ich aktualizację oraz zmianę kolejności ich prezentacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/editMedia/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `editObjectMedia` | editObjectMediaArray | tak | Lista elementów multimedialnych w postaci tablicy elementów typu editObjectMedium |
| `editObjectMedia.editObjectMedium` | editObjectMedium | tak | element typu editObjectMedium |
| `editObjectMedia.editObjectMedium.id` | int | tak | Identyfikator elementu multimedialnego |
| `editObjectMedia.editObjectMedium.source` | sourceType | nieoznaczone | Możliwe wartości: (uri, base64)<br><br>Sposób przekazywania informacji |
| `editObjectMedia.editObjectMedium.type` | typeType | nieoznaczone | Możliwe wartości: (picture, video)<br><br>Rodzaj elementu multimedialnego |
| `editObjectMedia.editObjectMedium.priority` | int | nieoznaczone | Priorytet |
| `editObjectMedia.editObjectMedium.icon` | boolean | nieoznaczone | Czy element ma zostać ustawiony jako ikona przedmiotu rezerwacji |
| `editObjectMedia.editObjectMedium.data` | string | nieoznaczone | Element multimedialny |

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
| `editedObjectsMedia` | editedObjectsMediaResultArray | nieoznaczone | Wynik edycji przesłanych elementów multimedialnych w postaci tablicy elementów typu objectMediumResult |
| `editedObjectsMedia.objectMediumResult` | objectMediumResult | tak | element typu objectMediumResult |
| `editedObjectsMedia.objectMediumResult.success` | boolean | nieoznaczone | Sukces |
| `editedObjectsMedia.objectMediumResult.errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `editedObjectsMedia.objectMediumResult.errors.faultCode` | int | nieoznaczone | Kod błędu |
| `editedObjectsMedia.objectMediumResult.errors.faultString` | string | nieoznaczone | Opis błędu |
| `editedObjectsMedia.objectMediumResult.id` | int | nieoznaczone | Identyfikator elementu multimedialnego |

## Przykład PHP dostawcy

[Osobny plik PHP](editMedia.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/editMedia/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['editObjectMedia'] = array();
$request['editObjectMedia'][0] = array();
$request['editObjectMedia'][0]['id'] = 1;
$request['editObjectMedia'][0]['source'] = 'uri';
$request['editObjectMedia'][0]['type'] = 'picture';
$request['editObjectMedia'][0]['priority'] = 2;
$request['editObjectMedia'][0]['icon'] = true;
$request['editObjectMedia'][0]['data'] = "data";

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

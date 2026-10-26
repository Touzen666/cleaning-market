# Bramka Objects/Metoda deleteMedia

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=deleteMedia##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](deleteMedia.jpg).

## Opis

Usuwa wskazane pliki multimedialne.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/deleteMedia/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `deleteObjectMedia` | deleteObjectMediaArray | tak | Dane usuwanych elementów multimedialnych |
| `deleteObjectMedia.deleteObjectMedium` | deleteObjectMedium | tak | element typu deleteObjectMedium |
| `deleteObjectMedia.deleteObjectMedium.id` | int | nieoznaczone | Identyfikator elementu multimedialnego |
| `deleteObjectMedia.deleteObjectMedium.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |

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
| `success` | boolean | tak | Sukces |
| `deleteObjectMedia` | deleteObjectMediaResultArray | nieoznaczone | Wynik usuwania elementów multimedialnych |
| `deleteObjectMedia.deleteObjectMediumResult` | deleteObjectMediumResult | tak | element typu deleteObjectMediumResult |
| `deleteObjectMedia.deleteObjectMediumResult.success` | boolean | tak | Sukces |
| `deleteObjectMedia.deleteObjectMediumResult.error` | errorType | nieoznaczone | Błąd |
| `deleteObjectMedia.deleteObjectMediumResult.error.faultCode` | int | nieoznaczone | Kod błędu |
| `deleteObjectMedia.deleteObjectMediumResult.error.faultString` | string | nieoznaczone | Opis błędu |
| `deleteObjectMedia.deleteObjectMediumResult.id` | int | tak | Identyfikator elementu multimedialnego |

## Przykład PHP dostawcy

[Osobny plik PHP](deleteMedia.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/deleteMedia/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['deleteObjectMedia'] = array();
$request['deleteObjectMedia'][0] = array();
$request['deleteObjectMedia'][0]['id'] = 1;
$request['deleteObjectMedia'][0]['objectId'] = 2;

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

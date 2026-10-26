# Bramka Objects/Metoda editDescriptions

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=editDescriptions##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editDescriptions.jpg).

## Opis

Zmienia opisy i meta opisy w przedmiocie rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/editDescriptions/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectDescriptions` | objectDescriptionsArray | tak | Lista opisów przedmiotu rezerwacji w postaci tablicy elementów objectDescription |
| `objectDescriptions.objectDescription` | objectDescription | tak | element typu objectDescription |
| `objectDescriptions.objectDescription.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `objectDescriptions.objectDescription.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `objectDescriptions.objectDescription.name` | string | nieoznaczone | Nazwa |
| `objectDescriptions.objectDescription.shortDescription` | string | nieoznaczone | Opis krótki |
| `objectDescriptions.objectDescription.longDescription` | string | nieoznaczone | Opis długi |
| `objectDescriptions.objectDescription.metaTitle` | string | nieoznaczone | Meta - tytuł |
| `objectDescriptions.objectDescription.metaDescription` | string | nieoznaczone | Meta - opis |

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
| `objectDescriptions` | objectDescriptionsResult | nieoznaczone | Lista opisów przedmiotu rezerwacji w postaci tablicy elementów objectDescriptionResult |
| `objectDescriptions.objectDescriptionResult` | objectDescriptionResult | tak | element typu objectDescriptionResult |
| `objectDescriptions.objectDescriptionResult.error` | errorType | nieoznaczone | Błąd |
| `objectDescriptions.objectDescriptionResult.error.faultCode` | int | nieoznaczone | Kod błędu |
| `objectDescriptions.objectDescriptionResult.error.faultString` | string | nieoznaczone | Opis błędu |
| `objectDescriptions.objectDescriptionResult.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `objectDescriptions.objectDescriptionResult.language` | string | nieoznaczone | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `objectDescriptions.objectDescriptionResult.name` | string | nieoznaczone | Nazwa |
| `objectDescriptions.objectDescriptionResult.shortDescription` | string | nieoznaczone | Opis krótki |
| `objectDescriptions.objectDescriptionResult.longDescription` | string | nieoznaczone | Opis długi |
| `objectDescriptions.objectDescriptionResult.metaTitle` | string | nieoznaczone | Meta - tytuł |
| `objectDescriptions.objectDescriptionResult.metaDescription` | string | nieoznaczone | Meta - opis |

## Przykład PHP dostawcy

[Osobny plik PHP](editDescriptions.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/editDescriptions/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectDescriptions'] = array();
$request['objectDescriptions'][0] = array();
$request['objectDescriptions'][0]['objectId'] = 1;
$request['objectDescriptions'][0]['language'] = "language";
$request['objectDescriptions'][0]['name'] = "name";
$request['objectDescriptions'][0]['shortDescription'] = "shortDescription";
$request['objectDescriptions'][0]['longDescription'] = "longDescription";
$request['objectDescriptions'][0]['metaTitle'] = "metaTitle";
$request['objectDescriptions'][0]['metaDescription'] = "metaDescription";

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

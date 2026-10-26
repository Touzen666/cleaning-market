# Bramka Objects/Metoda getLocation

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=getLocation##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getLocation.jpg).

## Opis

Pobiera informacje o lokalizacji przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/getLocation/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `paramsSearchObjectLocation` | paramsSearchObjectLocationType | nieoznaczone | Parametry wyszukiwania |
| `paramsSearchObjectLocation.objects` | itemArray | nieoznaczone | Lista identyfikatorów przedmiotów rezerwacji w postaci tablicy elementów typu item |
| `paramsSearchObjectLocation.objects.item` | item | tak | element typu item |
| `paramsSearchObjectLocation.objects.item.id` | int | tak |  |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `success` | boolean | tak |  |
| `objectLocations` | objectLocationArray | tak | Lista przedmiotów rezerwacji z danymi lokalizacji w postaci tablicy elementów typu objectLocation |
| `objectLocations.objectLocation` | objectLocation | tak | element typu objectLocation |
| `objectLocations.objectLocation.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `objectLocations.objectLocation.locationId` | int | tak | Identyfikator lokalizacji |
| `objectLocations.objectLocation.address` | string | tak | Adres lokalizacji |

## Przykład PHP dostawcy

[Osobny plik PHP](getLocation.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/getLocation/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['paramsSearchObjectLocation'] = array();
$request['paramsSearchObjectLocation']['objects'] = array();
$request['paramsSearchObjectLocation']['objects'][0] = array();
$request['paramsSearchObjectLocation']['objects'][0]['id'] = 1;

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

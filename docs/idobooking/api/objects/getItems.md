# Bramka Objects/Metoda getItems

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=getItems##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getItems.jpg).

## Opis

Pobiera egzemplarze przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/getItems/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `paramsSearch` | paramsSearchType | tak | Parametry przekazywane do metody |
| `paramsSearch.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `paramsSearch.objectItemId` | int | nieoznaczone | Identyfikator egzemplarza przedmiotu rezerwacji |
| `paramsSearch.objectItemCodeInternal` | string | nieoznaczone | Kod egzemplarza przedmiotu rezerwacji |

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
| `getObjectsItems` | getObjectsItemsResultArray | nieoznaczone | Lista egzemplarzy przedmiotu rezerwacji w postaci tablicy elementów ObjectItemResult |
| `getObjectsItems.objectItemResult` | objectItemResult | tak | element typu objectItemResult |
| `getObjectsItems.objectItemResult.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `getObjectsItems.objectItemResult.objectItemId` | int | tak | Identyfikator egzemplarza przedmiotu rezerwacji |
| `getObjectsItems.objectItemResult.objectItemCodeInternal` | string | tak | Kod egzemplarza przedmiotu rezerwacji |
| `getObjectsItems.objectItemResult.objectItemNote` | string | tak | Notatka egzemplarza przedmiotu rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](getItems.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/getItems/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['paramsSearch'] = array();
$request['paramsSearch']['objectId'] = 1;
$request['paramsSearch']['objectItemId'] = 2;
$request['paramsSearch']['objectItemCodeInternal'] = "objectItemCodeInternal";

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

# Bramka Objects/Metoda editItems

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=editItems##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editItems.jpg).

## Opis

Edytuje egzemplarze przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/editItems/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `editObjectItems` | editObjectItemsArray | tak | Lista elementów w postaci tablicy elementów typu editObjectItem |
| `editObjectItems.editObjectItem` | editObjectItem | tak | element typu editObjectItem |
| `editObjectItems.editObjectItem.objectItemId` | int | tak | Identyfikator egzemplarza przedmiotu rezerwacji |
| `editObjectItems.editObjectItem.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `editObjectItems.editObjectItem.objectItemCodeInternal` | string | nieoznaczone | Kod egzemplarza przedmiotu rezerwacji |
| `editObjectItems.editObjectItem.objectItemNote` | string | nieoznaczone | Notatka egzemplarza przedmiotu rezerwacji |

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
| `editedObjectsItems` | editedObjectsItemsResultArray | nieoznaczone | Lista z informacjami o powodzeniu lub błędach podczas edycji egzemplarzy przedmiotów rezerwacji w postaci tablicy elementów typu ObjectItemResult |
| `editedObjectsItems.objectItemResult` | objectItemResult | tak | element typu objectItemResult |
| `editedObjectsItems.objectItemResult.success` | boolean | tak | Sukces |
| `editedObjectsItems.objectItemResult.errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `editedObjectsItems.objectItemResult.errors.faultCode` | int | nieoznaczone | Kod błędu |
| `editedObjectsItems.objectItemResult.errors.faultString` | string | nieoznaczone | Opis błędu |
| `editedObjectsItems.objectItemResult.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `editedObjectsItems.objectItemResult.objectItemId` | int | nieoznaczone | Identyfikator egzemplarza przedmiotu rezerwacji |
| `editedObjectsItems.objectItemResult.objectItemCodeInternal` | string | nieoznaczone | Kod egzemplarza przedmiotu rezerwacji |
| `editedObjectsItems.objectItemResult.objectItemNote` | string | nieoznaczone | Notatka egzemplarza przedmiotu rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](editItems.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/editItems/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['editObjectItems'] = array();
$request['editObjectItems'][0] = array();
$request['editObjectItems'][0]['objectItemId'] = 1;
$request['editObjectItems'][0]['objectId'] = 2;
$request['editObjectItems'][0]['objectItemCodeInternal'] = "objectItemCodeInternal";
$request['editObjectItems'][0]['objectItemNote'] = "objectItemNote";

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

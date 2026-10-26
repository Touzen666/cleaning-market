# Bramka Objects/Metoda addItems

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=addItems##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](addItems.jpg).

## Opis

Dodaje egzemplarze do przedmiotu rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/addItems/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `addObjectItems` | addObjectItemsArray | tak | Lista elementów w postaci tablicy elementów typu addObjectItem |
| `addObjectItems.addObjectItem` | addObjectItem | tak | element typu addObjectItem |
| `addObjectItems.addObjectItem.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `addObjectItems.addObjectItem.objectItemCodeInternal` | string | tak | Kod egzemplarza przedmiotu rezerwacji |
| `addObjectItems.addObjectItem.objectItemNote` | string | nieoznaczone | Notatka egzemplarza przedmiotu rezerwacji |

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
| `addedObjectsItems` | addedObjectsItemsResultArray | nieoznaczone | Lista z informacjami o powodzeniu lub błędach podczas dodawania egzemplarzy przedmiotów rezerwacji w postaci tablicy elementów typu ObjectItemResult |
| `addedObjectsItems.objectItemResult` | objectItemResult | tak | element typu objectItemResult |
| `addedObjectsItems.objectItemResult.success` | boolean | tak | Sukces |
| `addedObjectsItems.objectItemResult.errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `addedObjectsItems.objectItemResult.errors.faultCode` | int | nieoznaczone | Kod błędu |
| `addedObjectsItems.objectItemResult.errors.faultString` | string | nieoznaczone | Opis błędu |
| `addedObjectsItems.objectItemResult.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `addedObjectsItems.objectItemResult.objectItemId` | int | nieoznaczone | Identyfikator egzemplarza przedmiotu rezerwacji |
| `addedObjectsItems.objectItemResult.objectItemCodeInternal` | string | nieoznaczone | Kod egzemplarza przedmiotu rezerwacji |
| `addedObjectsItems.objectItemResult.objectItemNote` | string | nieoznaczone | Notatka egzemplarza przedmiotu rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](addItems.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/addItems/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['addObjectItems'] = array();
$request['addObjectItems'][0] = array();
$request['addObjectItems'][0]['objectId'] = 1;
$request['addObjectItems'][0]['objectItemCodeInternal'] = "objectItemCodeInternal";
$request['addObjectItems'][0]['objectItemNote'] = "objectItemNote";

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

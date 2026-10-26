# Availability Locks/Metoda get

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=availabilitylocks&method=get##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](get.jpg).

## Opis

Zwraca informacje o założonych blokadach

## Adres JSON

`https://_domena_booking_.idosell.com/api/availabilitylocks/get/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Wyslij newsletter, możliwe wartości:<br> - <strong> y </strong> - tak <br> - <strong> n </strong> - nie <br> |
| `result` | resultRequestType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.number` | int | nieoznaczone | Liczba wyników na stronie. Wartości od 1 do 100 |
| `paramsSearch` | paramsSearchAvailabilitylocksType | nieoznaczone | Parametry przekazywane do metody |
| `paramsSearch.id` | int | nieoznaczone | Identyfikator blokady |
| `paramsSearch.itemId` | int | nieoznaczone | Identyfikator egzemplarza |
| `paramsSearch.objectId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `paramsSearch.userLogin` | string | nieoznaczone | Login użytkownika |
| `paramsSearch.dateFrom` | string | nieoznaczone | Data rozpoczęcia |
| `paramsSearch.dateTo` | string | nieoznaczone | Data zakończenia |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Wyslij newsletter, możliwe wartości:<br> - <strong> y </strong> - tak <br> - <strong> n </strong> - nie <br> |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `availabilityLocks` | availabilityLocksTypeArray | nieoznaczone | Dane blokad |
| `availabilityLocks.availabilityLocksType` | availabilityLocksType | tak | element typu availabilityLocksType |
| `availabilityLocks.availabilityLocksType.id` | int | tak | Identyfikator blokady |
| `availabilityLocks.availabilityLocksType.itemId` | int | tak | Identyfikator egzemplarza |
| `availabilityLocks.availabilityLocksType.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `availabilityLocks.availabilityLocksType.userId` | int | tak | Identyfikator użytkownika |
| `availabilityLocks.availabilityLocksType.note` | string | tak | Notatka |
| `availabilityLocks.availabilityLocksType.dateFrom` | string | tak | Data rozpoczęcia |
| `availabilityLocks.availabilityLocksType.dateTo` | string | tak | Data zakończenia |
| `availabilityLocks.availabilityLocksType.dateAdd` | string | tak | Data i godzina dodania |

## Przykład PHP dostawcy

[Osobny plik PHP](get.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/availabilitylocks/get/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['result'] = array();
$request['result']['page'] = 1;
$request['result']['number'] = 2;
$request['paramsSearch'] = array();
$request['paramsSearch']['id'] = 3;
$request['paramsSearch']['itemId'] = 4;
$request['paramsSearch']['objectId'] = 5;
$request['paramsSearch']['userLogin'] = "userLogin";
$request['paramsSearch']['dateFrom'] = "dateFrom";
$request['paramsSearch']['dateTo'] = "dateTo";

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

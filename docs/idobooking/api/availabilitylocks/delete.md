# Availability Locks/Metoda delete

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=availabilitylocks&method=delete##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](delete.jpg).

## Opis

Usuwa blokady dostępności

## Adres JSON

`https://_domena_booking_.idosell.com/api/availabilitylocks/delete/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Wyslij newsletter, możliwe wartości:<br> - <strong> y </strong> - tak <br> - <strong> n </strong> - nie <br> |
| `availabilityLocks` | deleteAvailabilitylocksTypeArray | tak | Dane usuwanych blokad |
| `availabilityLocks.deleteAvailabilitylocksType` | deleteAvailabilitylocksType | tak | element typu deleteAvailabilitylocksType |
| `availabilityLocks.deleteAvailabilitylocksType.id` | int | nieoznaczone | Identyfikator blokady |
| `availabilityLocks.deleteAvailabilitylocksType.itemId` | int | nieoznaczone | Identyfikator egzemplarza |
| `availabilityLocks.deleteAvailabilitylocksType.objectId` | string | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `availabilityLocks.deleteAvailabilitylocksType.dateFrom` | string | nieoznaczone | Data rozpoczęcia |
| `availabilityLocks.deleteAvailabilitylocksType.dateTo` | string | nieoznaczone | Data zakończenia |

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
| `availabilityLocks` | deleteAvailabilitylocksTypeResultArray | nieoznaczone |  |
| `availabilityLocks.deleteAvailabilitylocksTypeResult` | deleteAvailabilitylocksTypeResult | tak | element typu deleteAvailabilitylocksTypeResult |
| `availabilityLocks.deleteAvailabilitylocksTypeResult.success` | boolean | tak | Sukces |
| `availabilityLocks.deleteAvailabilitylocksTypeResult.error` | errorType | nieoznaczone | Błąd |
| `availabilityLocks.deleteAvailabilitylocksTypeResult.error.faultCode` | int | nieoznaczone | Kod błędu |
| `availabilityLocks.deleteAvailabilitylocksTypeResult.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](delete.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/availabilitylocks/delete/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['availabilityLocks'] = array();
$request['availabilityLocks'][0] = array();
$request['availabilityLocks'][0]['id'] = 1;
$request['availabilityLocks'][0]['itemId'] = 2;
$request['availabilityLocks'][0]['objectId'] = "objectId";
$request['availabilityLocks'][0]['dateFrom'] = "dateFrom";
$request['availabilityLocks'][0]['dateTo'] = "dateTo";

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

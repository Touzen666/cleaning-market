# Availability Locks/Metoda add

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=availabilitylocks&method=add##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](add.jpg).

## Opis

Dodaje blokady dostępności

## Adres JSON

`https://_domena_booking_.idosell.com/api/availabilitylocks/add/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Wyslij newsletter, możliwe wartości:<br> - <strong> y </strong> - tak <br> - <strong> n </strong> - nie <br> |
| `availabilityLocks` | addAvailabilitylocksTypeArray | tak | Dane blokad |
| `availabilityLocks.addAvailabilitylocksType` | addAvailabilitylocksType | tak | element typu addAvailabilitylocksType |
| `availabilityLocks.addAvailabilitylocksType.itemId` | int | nieoznaczone | Identyfikator egzemplarza |
| `availabilityLocks.addAvailabilitylocksType.objectId` | string | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `availabilityLocks.addAvailabilitylocksType.userId` | string | nieoznaczone | Identyfikator użytkownika |
| `availabilityLocks.addAvailabilitylocksType.note` | string | nieoznaczone | Notatka |
| `availabilityLocks.addAvailabilitylocksType.dateFrom` | string | tak | Data rozpoczęcia |
| `availabilityLocks.addAvailabilitylocksType.dateTo` | string | tak | Data zakończenia |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Wyslij newsletter, możliwe wartości:<br> - <strong> y </strong> - tak <br> - <strong> n </strong> - nie <br> |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `availabilityLocks` | addAvailabilitylocksResultTypeArray | nieoznaczone | Wynik dodania blokady |
| `availabilityLocks.addAvailabilitylocksResultType` | addAvailabilitylocksResultType | tak | element typu addAvailabilitylocksResultType |
| `availabilityLocks.addAvailabilitylocksResultType.success` | boolean | tak | Sukces |
| `availabilityLocks.addAvailabilitylocksResultType.error` | errorType | nieoznaczone | Błąd |
| `availabilityLocks.addAvailabilitylocksResultType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `availabilityLocks.addAvailabilitylocksResultType.error.faultString` | string | nieoznaczone | Opis błędu |
| `availabilityLocks.addAvailabilitylocksResultType.id` | int | nieoznaczone | Identyfikator blokady |

## Przykład PHP dostawcy

[Osobny plik PHP](add.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/availabilitylocks/add/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['availabilityLocks'] = array();
$request['availabilityLocks'][0] = array();
$request['availabilityLocks'][0]['itemId'] = 1;
$request['availabilityLocks'][0]['objectId'] = "objectId";
$request['availabilityLocks'][0]['userId'] = "userId";
$request['availabilityLocks'][0]['note'] = "note";
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

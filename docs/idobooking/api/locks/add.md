# Bramka Locks/Metoda add

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=locks&method=add##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](add.jpg).

## Opis

Dodaje kod do zamka elektronicznego dla rezerwacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/locks/add/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `Locks` | addLocksTypeArray | tak | Dane dodawanych kodów zamków |
| `Locks.addLocksType` | addLocksType | tak | element typu addLocksType |
| `Locks.addLocksType.reservationId` | int | tak | Identyfikator rezerwacji |
| `Locks.addLocksType.itemId` | int | tak | Identyfikator egzemplarza |
| `Locks.addLocksType.lockDeviceId` | string | tak | Identyfikator zamka elektronicznego w systemie |
| `Locks.addLocksType.lock` | string | tak | Kod zamka |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `responseErrors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `responseErrors.faultCode` | int | nieoznaczone | Kod błędu |
| `responseErrors.faultString` | string | nieoznaczone | Opis błędu |
| `Locks` | addLocksResultTypeArray | nieoznaczone | Wynik dodania kodu |
| `Locks.addLocksResultType` | addLocksResultType | tak | element typu addLocksResultType |
| `Locks.addLocksResultType.success` | boolean | tak | Sukces |
| `Locks.addLocksResultType.error` | errorType | nieoznaczone | Błąd |
| `Locks.addLocksResultType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `Locks.addLocksResultType.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](add.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/locks/add/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['Locks'] = array();
$request['Locks'][0] = array();
$request['Locks'][0]['reservationId'] = 1;
$request['Locks'][0]['itemId'] = 2;
$request['Locks'][0]['lockDeviceId'] = "lockDeviceId";
$request['Locks'][0]['lock'] = "lock";

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

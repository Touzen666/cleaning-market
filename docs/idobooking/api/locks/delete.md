# Bramka Locks/Metoda delete

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=locks&method=delete##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](delete.jpg).

## Opis

Usuwa kod do zamka elektronicznego dla rezerwacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/locks/delete/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `Locks` | deleteLocksTypeArray | tak | Dane usuwanych kodow |
| `Locks.deleteLocksType` | deleteLocksType | tak | element typu deleteLocksType |
| `Locks.deleteLocksType.reservationId` | int | tak | Identyfikator rezerwacji |
| `Locks.deleteLocksType.itemId` | int | tak | Identyfikator egzemplarza |
| `Locks.deleteLocksType.lockDeviceId` | string | tak | Identyfikator zamka elektronicznego w systemie |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `Locks` | deleteLocksTypeResultArray | nieoznaczone |  |
| `Locks.deleteLocksTypeResult` | deleteLocksTypeResult | tak | element typu deleteLocksTypeResult |
| `Locks.deleteLocksTypeResult.success` | boolean | tak | Sukces |
| `Locks.deleteLocksTypeResult.error` | errorType | nieoznaczone | Błąd |
| `Locks.deleteLocksTypeResult.error.faultCode` | int | nieoznaczone | Kod błędu |
| `Locks.deleteLocksTypeResult.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](delete.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/locks/delete/36/json';

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

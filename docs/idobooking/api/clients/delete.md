# Bramka Clients/Metoda delete

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=clients&method=delete##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](delete.jpg).

## Opis

Usuwa klientów oraz powiązane z kontem dane gości.

## Adres JSON

`https://_domena_booking_.idosell.com/api/clients/delete/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `params` | paramsType | tak | Parametry przekazywane do metody |
| `params.clients` | clientsType | tak | Klienci do usunięcia |
| `params.clients.clientType` | clientType | tak | element typu clientType |
| `params.clients.clientType.clientId` | int | nieoznaczone | Identyfikator klienta |
| `params.clients.clientType.login` | string | nieoznaczone | Login klienta |

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
| `results` | resultsType | nieoznaczone | Lista usuniętych klientów |
| `results.resultType` | resultType | tak | element typu resultType |
| `results.resultType.clientId` | int | nieoznaczone | Identyfikator klienta |
| `results.resultType.login` | string | nieoznaczone | Login klienta |
| `results.resultType.success` | boolean | tak | Sukces |
| `results.resultType.error` | errorType | nieoznaczone | Lista kodów błędów |
| `results.resultType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `results.resultType.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](delete.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/clients/delete/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['clients'] = array();
$request['params']['clients'][0] = array();
$request['params']['clients'][0]['clientId'] = 1;
$request['params']['clients'][0]['login'] = "login";

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

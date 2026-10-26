# Bramka Reservations/Metoda notifyExternalService

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservations&method=notifyExternalService##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](notifyExternalService.jpg).

## Opis

Wysyła informację do serwisu zewnętrznego

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservations/notifyExternalService/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `notifications` | notificationsType | tak | Dane notyfikacji |
| `notifications.notificationType` | notificationType | tak | element typu notificationType |
| `notifications.notificationType.reservationId` | int | tak | Identyfikator rezerwacji |
| `notifications.notificationType.wrongCardData` | wrongCardDataType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wyślij informację o błędnych danych karty płatniczej |
| `notifications.notificationType.clientNoShow` | clientNoShowType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wyślij informacje o niepojawieniu się klienta |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `notifications` | notificationsResponseArrayType | tak | Dane notyfikacji |
| `notifications.notificationsResponseType` | notificationsResponseType | tak | element typu notificationsResponseType |
| `notifications.notificationsResponseType.success` | boolean | nieoznaczone | Sukces |
| `notifications.notificationsResponseType.error` | errorType | nieoznaczone | Dane błędu |
| `notifications.notificationsResponseType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `notifications.notificationsResponseType.error.faultString` | string | nieoznaczone | Opis błędu |
| `notifications.notificationsResponseType.reservationId` | int | nieoznaczone | Identyfikator rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](notifyExternalService.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservations/notifyExternalService/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['notifications'] = array();
$request['notifications'][0] = array();
$request['notifications'][0]['reservationId'] = 1;
$request['notifications'][0]['wrongCardData'] = 'y';
$request['notifications'][0]['clientNoShow'] = 'y';

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

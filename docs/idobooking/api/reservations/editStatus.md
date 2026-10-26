# Bramka Reservations/Metoda editStatus

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservations&method=editStatus##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editStatus.jpg).

## Opis

Edytuje status rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservations/editStatus/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `reservations` | editReservationsStatusTypeArray | tak | Dane rezerwacji |
| `reservations.editReservationsStatusType` | editReservationsStatusType | tak | element typu editReservationsStatusType |
| `reservations.editReservationsStatusType.reservationId` | int | tak | Identyfikator rezerwacji |
| `reservations.editReservationsStatusType.status` | reservationStatusType | tak | Możliwe wartości: (unconfirmed, confirmed, paymentInProgress, accepted, inProgress, completed, canceled, withdrawn, waitingForPayment, invalidCardNumber, toClarify)<br><br>Typ statusu rezerwacji |
| `reservations.editReservationsStatusType.notify` | notifyType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Powiadamiaj wiadomością transakcyjną |
| `reservations.editReservationsStatusType.notifyService` | notifyServiceType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wysyłaj powiadomienia dla obsługi obiektu. Domyślnie są wysyłane |

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
| `reservations` | changeReservationsTypeArray | nieoznaczone | Dane zmienionych rezerwacji |
| `reservations.changeReservationsType` | changeReservationsType | tak | element typu changeReservationsType |
| `reservations.changeReservationsType.success` | boolean | nieoznaczone | Sukces |
| `reservations.changeReservationsType.error` | errorType | nieoznaczone | Dane błędu |
| `reservations.changeReservationsType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `reservations.changeReservationsType.error.faultString` | string | nieoznaczone | Opis błędu |
| `reservations.changeReservationsType.reservationId` | int | nieoznaczone | Identyfikator rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](editStatus.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservations/editStatus/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['reservations'] = array();
$request['reservations'][0] = array();
$request['reservations'][0]['reservationId'] = 1;
$request['reservations'][0]['status'] = 'unconfirmed';
$request['reservations'][0]['notify'] = 'y';
$request['reservations'][0]['notifyService'] = 'y';

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

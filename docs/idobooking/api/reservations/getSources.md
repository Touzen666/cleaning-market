# Bramka Reservations/Metoda getSources

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservations&method=getSources##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getSources.jpg).

## Opis

Zwraca źródła rezerwacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservations/getSources/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `result` | resultRequestType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.number` | int | nieoznaczone | Liczba wyników na stronie. Wartości od 1 do 100 |

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
| `sources` | reservationSourceDescriptionTypeArray | nieoznaczone | Dane źródeł rezerwacji |
| `sources.reservationSourceDescriptionType` | reservationSourceDescriptionType | tak | element typu reservationSourceDescriptionType |
| `sources.reservationSourceDescriptionType.reservationSourceTypeId` | int | tak | Identyfikator typu źródła rezerwacji |
| `sources.reservationSourceDescriptionType.reservationSourceTypeName` | string | tak | Nazwa typu źródła rezerwacji |
| `sources.reservationSourceDescriptionType.reservationSourceId` | int | tak | Identyfikator źródła rezerwacji |
| `sources.reservationSourceDescriptionType.reservationSourceName` | string | tak | Nazwa źródła rezerwacji |

## Przykład PHP dostawcy

[Osobny plik PHP](getSources.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservations/getSources/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['result'] = array();
$request['result']['page'] = 1;
$request['result']['number'] = 2;

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

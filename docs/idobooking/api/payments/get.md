# Bramka Payments/Metoda get

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=payments&method=get##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](get.jpg).

## Opis

Metoda pozwala na pobieranie wpłat dla rezerwacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/payments/get/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `settings` | settingsType | nieoznaczone | Ustawienia |
| `settings.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `settings.number` | int | nieoznaczone | Liczba wyników na stronie. Wartości od 1 do 100 |
| `params` | paramsType | nieoznaczone | Parametry przekazywane do metody |
| `params.reservationIds` | intArray | nieoznaczone | Identyfikatory rezerwacji<br><br>element typu int |
| `params.reservationIds.int` | int | tak | element typu int |
| `params.paymentIds` | intArray | nieoznaczone | Identyfikatory płatności<br><br>element typu int |
| `params.paymentIds.int` | int | tak | element typu int |
| `params.statuses` | statusTypeArray | nieoznaczone | Statusy płatności |
| `params.statuses.statusType` | statusType | tak | Możliwe wartości: (pending, processed, cancelled)<br><br>element typu statusType |
| `params.paymentTypes` | paymentTypeTypeArray | nieoznaczone | Typy transakcji: "payment" - wpłata, "advance" - zaliczka, "repayment" - zwrot |
| `params.paymentTypes.paymentTypeType` | paymentTypeType | tak | Możliwe wartości: (payment, advance, repayment)<br><br>element typu paymentTypeType |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `errors` | gateErrorType | nieoznaczone | Błąd |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `results` | resultsType | nieoznaczone | Wynik wykonanej operacji |
| `results.resultType` | resultType | tak | element typu resultType |
| `results.resultType.id` | int | tak | Identyfikator płatności |
| `results.resultType.reservationId` | int | tak | Identyfikator rezerwacji |
| `results.resultType.value` | float | tak | Kwota wpłaty |
| `results.resultType.type` | paymentTypeType | tak | Możliwe wartości: (payment, advance, repayment)<br><br>Typ transakcji: "payment" - wpłata, "advance" - zaliczka, "repayment" - zwrot |
| `results.resultType.status` | statusType | tak | Możliwe wartości: (pending, processed, cancelled)<br><br>Status płatności |
| `results.resultType.paymentSystem` | string | tak | System płatności |
| `results.resultType.externalPaymentId` | string | nieoznaczone | ID transakcji w serwisie zewnętrznym |
| `results.resultType.accountingDate` | string | nieoznaczone | Data zaksięgowania |
| `results.resultType.currency` | string | nieoznaczone | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `countOnPage` | int | nieoznaczone | Ilość wyników na stronie |
| `pageAll` | int | nieoznaczone | Suma stron |
| `countAll` | int | nieoznaczone | Suma wszystkich wyników |

## Przykład PHP dostawcy

[Osobny plik PHP](get.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/payments/get/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['settings'] = array();
$request['settings']['page'] = 1;
$request['settings']['number'] = 2;
$request['params'] = array();
$request['params']['reservationIds'] = array();
$request['params']['reservationIds'][0] = 3;
$request['params']['paymentIds'] = array();
$request['params']['paymentIds'][0] = 4;
$request['params']['statuses'] = array();
$request['params']['statuses'][0] = 'pending';
$request['params']['paymentTypes'] = array();
$request['params']['paymentTypes'][0] = 'payment';

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

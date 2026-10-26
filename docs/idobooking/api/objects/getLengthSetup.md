# Bramka Objects/Metoda getLengthSetup

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=getLengthSetup##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getLengthSetup.jpg).

## Opis

Zwraca informacje o długości pobytu oraz możliwych dniach rozpoczęcia i zakończenia rezerwacji w przedmiocie rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/getLengthSetup/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectId` | int | tak | Identyfikator przedmiotu rezerwacji |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `success` | boolean | tak | Sukces |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `objectLengthSetup` | objectLengthSetupType | nieoznaczone | element typu objectLengthSetup |
| `objectLengthSetup.objectId` | int | tak |  |
| `objectLengthSetup.objectLengthSetupMode` | objectLengthSetupModeType | nieoznaczone | Możliwe wartości: (inherited, own)<br><br>Ustawienie źródła restrykcji rezerwacji przedmiotu rezerwacji |
| `objectLengthSetup.ownLengthSetup` | ownLengthSetupType | nieoznaczone | element typu ownLengthSetup |
| `objectLengthSetup.ownLengthSetup.lengthSetupMode` | lengthSetupModeType | tak | Możliwe wartości: (free, minimal, multiplication, exact)<br><br>Ustawienie trybu długości rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupType` | lengthSetupTypeType | nieoznaczone | Możliwe wartości: (days, weeks, months)<br><br>Ustawienie jednostki długości rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupValue` | int | nieoznaczone | Ustawienie wartości długości rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupStartingMode` | lengthSetupStartingModeType | tak | Możliwe wartości: (any, indicated_day_of_the_week, indicated_day_of_the_month)<br><br>Ustawienie trybu początku rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupStartingWeekDays` | lengthSetupWeekDayArray | nieoznaczone | Lista dni tygodnia akceptowanych jako początek rezerwacji. Dzień tygodnia (1 - poniedziałek do 7 - niedziela)<br><br>element typu int |
| `objectLengthSetup.ownLengthSetup.lengthSetupStartingWeekDays.int` | int | tak | element typu int |
| `objectLengthSetup.ownLengthSetup.lengthSetupStartingMonthDay` | int | nieoznaczone | Dzień miesiąca akceptowany jako początek rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupEndingMode` | lengthSetupEndingModeType | tak | Możliwe wartości: (any, indicated_day_of_the_week, indicated_day_of_the_month)<br><br>Ustawienie trybu końca rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupEndingWeekDays` | lengthSetupWeekDayArray | nieoznaczone | Lista dni tygodnia akceptowanych jako koniec rezerwacji. Dzień tygodnia (1 - poniedziałek do 7 - niedziela)<br><br>element typu int |
| `objectLengthSetup.ownLengthSetup.lengthSetupEndingWeekDays.int` | int | tak | element typu int |
| `objectLengthSetup.ownLengthSetup.lengthSetupEndingMonthDay` | int | nieoznaczone | Dzień miesiąca akceptowany jako koniec rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupGapSaleMode` | lengthSetupGapSaleModeType | nieoznaczone | Możliwe wartości: (allowed, disallowed)<br><br>Zezwalaj na składanie rezerwacji, gdy powstanie luka krótsza od wymaganej długości rezerwacji |
| `objectLengthSetup.ownLengthSetup.lengthSetupGapSaleDays` | int | nieoznaczone | Ustawienie minimalnej liczby dni na które można składać rezerwację w przypadku luki |

## Przykład PHP dostawcy

[Osobny plik PHP](getLengthSetup.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/getLengthSetup/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectId'] = 1;

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

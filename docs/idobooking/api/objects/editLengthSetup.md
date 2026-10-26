# Bramka Objects/Metoda editLengthSetup

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=editLengthSetup##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editLengthSetup.jpg).

## Opis

Zmienia ustawienia dotyczące długości pobytu oraz możliwych dni rozpoczęcia i zakończenia rezerwacji w przedmiocie rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/editLengthSetup/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectsLengthSetups` | objectLengthSetupArray | tak | Lista powiązanych ustawień pobytu z przedmiotem rezerwacji w postaci tablicy elementów objectSetupLength |
| `objectsLengthSetups.objectSetupLengthType` | objectSetupLengthType | tak | element typu objectSetupLengthType |
| `objectsLengthSetups.objectSetupLengthType.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.objectLengthSetupMode` | objectLengthSetupModeType | nieoznaczone | Możliwe wartości: (inherited, own)<br><br>Ustawienie źródła restrykcji rezerwacji przedmiotu rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup` | ownLengthSetupType | nieoznaczone | element typu ownLengthSetup |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupMode` | lengthSetupModeType | tak | Możliwe wartości: (free, minimal, multiplication, exact)<br><br>Ustawienie trybu długości rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupType` | lengthSetupTypeType | nieoznaczone | Możliwe wartości: (days, weeks, months)<br><br>Ustawienie jednostki długości rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupValue` | int | nieoznaczone | Ustawienie wartości długości rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupStartingMode` | lengthSetupStartingModeType | tak | Możliwe wartości: (any, indicated_day_of_the_week, indicated_day_of_the_month)<br><br>Ustawienie trybu początku rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupStartingWeekDays` | lengthSetupWeekDayArray | nieoznaczone | Lista dni tygodnia akceptowanych jako początek rezerwacji. Dzień tygodnia (1 - poniedziałek do 7 - niedziela)<br><br>element typu int |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupStartingWeekDays.int` | int | tak | element typu int |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupStartingMonthDay` | int | nieoznaczone | Dzień miesiąca akceptowany jako początek rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupEndingMode` | lengthSetupEndingModeType | tak | Możliwe wartości: (any, indicated_day_of_the_week, indicated_day_of_the_month)<br><br>Ustawienie trybu końca rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupEndingWeekDays` | lengthSetupWeekDayArray | nieoznaczone | Lista dni tygodnia akceptowanych jako koniec rezerwacji. Dzień tygodnia (1 - poniedziałek do 7 - niedziela)<br><br>element typu int |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupEndingWeekDays.int` | int | tak | element typu int |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupEndingMonthDay` | int | nieoznaczone | Dzień miesiąca akceptowany jako koniec rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupGapSaleMode` | lengthSetupGapSaleModeType | nieoznaczone | Możliwe wartości: (allowed, disallowed)<br><br>Zezwalaj na składanie rezerwacji, gdy powstanie luka krótsza od wymaganej długości rezerwacji |
| `objectsLengthSetups.objectSetupLengthType.ownLengthSetup.lengthSetupGapSaleDays` | int | nieoznaczone | Ustawienie minimalnej liczby dni na które można składać rezerwację w przypadku luki |

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
| `objectsLengthSetupsResponse` | objectLengthSetupResultArray | nieoznaczone | Lista powiązanych ustawień pobytu z przedmiotem rezerwacji w postaci tablicy elementów ObjectSetupLengthResponse |
| `objectsLengthSetupsResponse.objectLengthSetupResultType` | objectLengthSetupResultType | tak | element typu objectLengthSetupResultType |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.error` | errorType | nieoznaczone |  |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.error.faultString` | string | nieoznaczone | Opis błędu |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.objectId` | int | tak |  |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.objectLengthSetupMode` | objectLengthSetupModeType | nieoznaczone | Możliwe wartości: (inherited, own)<br><br>Ustawienie źródła restrykcji rezerwacji przedmiotu rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup` | ownLengthSetupType | nieoznaczone | element typu ownLengthSetup |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupMode` | lengthSetupModeType | tak | Możliwe wartości: (free, minimal, multiplication, exact)<br><br>Ustawienie trybu długości rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupType` | lengthSetupTypeType | nieoznaczone | Możliwe wartości: (days, weeks, months)<br><br>Ustawienie jednostki długości rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupValue` | int | nieoznaczone | Ustawienie wartości długości rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupStartingMode` | lengthSetupStartingModeType | tak | Możliwe wartości: (any, indicated_day_of_the_week, indicated_day_of_the_month)<br><br>Ustawienie trybu początku rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupStartingWeekDays` | lengthSetupWeekDayArray | nieoznaczone | Lista dni tygodnia akceptowanych jako początek rezerwacji. Dzień tygodnia (1 - poniedziałek do 7 - niedziela)<br><br>element typu int |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupStartingWeekDays.int` | int | tak | element typu int |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupStartingMonthDay` | int | nieoznaczone | Dzień miesiąca akceptowany jako początek rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupEndingMode` | lengthSetupEndingModeType | tak | Możliwe wartości: (any, indicated_day_of_the_week, indicated_day_of_the_month)<br><br>Ustawienie trybu końca rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupEndingWeekDays` | lengthSetupWeekDayArray | nieoznaczone | Lista dni tygodnia akceptowanych jako koniec rezerwacji. Dzień tygodnia (1 - poniedziałek do 7 - niedziela)<br><br>element typu int |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupEndingWeekDays.int` | int | tak | element typu int |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupEndingMonthDay` | int | nieoznaczone | Dzień miesiąca akceptowany jako koniec rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupGapSaleMode` | lengthSetupGapSaleModeType | nieoznaczone | Możliwe wartości: (allowed, disallowed)<br><br>Zezwalaj na składanie rezerwacji, gdy powstanie luka krótsza od wymaganej długości rezerwacji |
| `objectsLengthSetupsResponse.objectLengthSetupResultType.ownLengthSetup.lengthSetupGapSaleDays` | int | nieoznaczone | Ustawienie minimalnej liczby dni na które można składać rezerwację w przypadku luki |

## Przykład PHP dostawcy

[Osobny plik PHP](editLengthSetup.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/editLengthSetup/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectsLengthSetups'] = array();
$request['objectsLengthSetups'][0] = array();
$request['objectsLengthSetups'][0]['objectId'] = 1;
$request['objectsLengthSetups'][0]['objectLengthSetupMode'] = 'inherited';
$request['objectsLengthSetups'][0]['ownLengthSetup'] = array();
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupMode'] = 'free';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupType'] = 'days';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupValue'] = 2;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingMode'] = 'any';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingWeekDays'] = array();
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingWeekDays'][0] = 3;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupStartingMonthDay'] = 4;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingMode'] = 'any';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingWeekDays'] = array();
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingWeekDays'][0] = 5;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupEndingMonthDay'] = 6;
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupGapSaleMode'] = 'allowed';
$request['objectsLengthSetups'][0]['ownLengthSetup']['lengthSetupGapSaleDays'] = 7;

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

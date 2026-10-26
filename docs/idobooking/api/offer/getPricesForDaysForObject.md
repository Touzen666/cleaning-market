# Bramka Offer/Metoda getPricesForDaysForObject

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=offer&method=getPricesForDaysForObject##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getPricesForDaysForObject.jpg).

## Opis

Pobiera ceny dla przedmiotu rezerwacji na każdy dzień z uwzględnieniem różnych kombinacji dzieci i dorosłych.

## Adres JSON

`https://_domena_booking_.idosell.com/api/offer/getPricesForDaysForObject/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `paramsSearch` | paramsSearchType | tak | Parametry wyszukiwania |
| `paramsSearch.dateFrom` | string | tak | Data początkowa w formacie YYYY-MM-DD |
| `paramsSearch.dateTo` | string | tak | Data końcowa w formacie YYYY-MM-DD |
| `paramsSearch.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `paramsSearch.currency` | string | tak | Kod ISO 4217 waluty w panelu |
| `paramsSearch.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `paramsSearch.withChildren` | boolean | tak | Informacja czy przy wyliczaniu ceny mają być uwzględniane warianty z ceną dla dzieci |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | tak | Kod błędu |
| `errors.faultString` | string | tak | Opis błędu |
| `offerObject` | offerObject | nieoznaczone |  |
| `offerObject.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `offerObject.objectName` | string | tak | Nazwa miejsca noclegowego |
| `offerObject.objectCapacity` | int | tak | Domyślna pojemność przedmiotu rezerwacji |
| `offerObject.objectPricesDates` | objectPricesDatesArray | tak | Tablica z informacjami o cenach dla poszczególnych dat |
| `offerObject.objectPricesDates.priceDate` | priceDate | tak | element typu priceDate |
| `offerObject.objectPricesDates.priceDate.date` | string | tak | Data |
| `offerObject.objectPricesDates.priceDate.capacityPriceDates` | capacityPriceDatesArray | tak | Tablica z informacjami o cenach dla poszczególnych możliwości obłożenia |
| `offerObject.objectPricesDates.priceDate.capacityPriceDates.capacityPriceDate` | capacityPriceDate | tak | element typu capacityPriceDate |
| `offerObject.objectPricesDates.priceDate.capacityPriceDates.capacityPriceDate.children` | int | nieoznaczone | Liczba dzieci |
| `offerObject.objectPricesDates.priceDate.capacityPriceDates.capacityPriceDate.adults` | int | tak | Liczba dorosłych |
| `offerObject.objectPricesDates.priceDate.capacityPriceDates.capacityPriceDate.price` | float | tak | Cena |

## Przykład PHP dostawcy

[Osobny plik PHP](getPricesForDaysForObject.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/offer/getPricesForDaysForObject/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['paramsSearch'] = array();
$request['paramsSearch']['dateFrom'] = "dateFrom";
$request['paramsSearch']['dateTo'] = "dateTo";
$request['paramsSearch']['language'] = "language";
$request['paramsSearch']['currency'] = "currency";
$request['paramsSearch']['objectId'] = 1;
$request['paramsSearch']['withChildren'] = true;

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

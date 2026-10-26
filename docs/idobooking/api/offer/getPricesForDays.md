# Bramka Offer/Metoda getPricesForDays

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=offer&method=getPricesForDays##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getPricesForDays.jpg).

## Opis

Pobiera ceny dla przedmiotów rezerwacji na każdy dzień.

## Adres JSON

`https://_domena_booking_.idosell.com/api/offer/getPricesForDays/36/json`

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
| `paramsSearch.adultsNumber` | int | tak | Liczba dorosłych |
| `paramsSearch.childrenNumber` | int | nieoznaczone | Liczba dzieci |
| `paramsSearch.language` | string | tak | Język panelu zgodny z ISO 639-3 Przykład: eng, pol |
| `paramsSearch.currency` | string | tak | Kod ISO 4217 waluty w panelu |
| `result` | resultRequestType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.number` | int | nieoznaczone | Ilość wyników na stronie |

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
| `offerObjects` | offerObjectsArray | nieoznaczone | Lista miejsc noclegowych |
| `offerObjects.offerObject` | offerObject | tak | element typu offerObject |
| `offerObjects.offerObject.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `offerObjects.offerObject.objectName` | string | tak | Nazwa miejsca noclegowego |
| `offerObjects.offerObject.objectCapacity` | int | tak | Domyślna pojemność przedmiotu rezerwacji |
| `offerObjects.offerObject.objectPricesDates` | objectPricesDatesArray | tak | Tablica z informacjami o cenach dla poszczególnych dat |
| `offerObjects.offerObject.objectPricesDates.priceDate` | priceDate | tak | element typu priceDate |
| `offerObjects.offerObject.objectPricesDates.priceDate.date` | string | tak | Data |
| `offerObjects.offerObject.objectPricesDates.priceDate.price` | float | tak | Cena |
| `result` | resultResponseType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.countOnPage` | int | nieoznaczone | Ilość wyników na stronie |
| `result.pageAll` | int | nieoznaczone | Suma wyników na stronie |
| `result.countAll` | int | nieoznaczone | Suma wszystkich wyników |

## Przykład PHP dostawcy

[Osobny plik PHP](getPricesForDays.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/offer/getPricesForDays/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['paramsSearch'] = array();
$request['paramsSearch']['dateFrom'] = "dateFrom";
$request['paramsSearch']['dateTo'] = "dateTo";
$request['paramsSearch']['adultsNumber'] = 1;
$request['paramsSearch']['childrenNumber'] = 2;
$request['paramsSearch']['language'] = "language";
$request['paramsSearch']['currency'] = "currency";
$request['result'] = array();
$request['result']['page'] = 3;
$request['result']['number'] = 4;

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

# Bramka Public/Metoda pricingOffers

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=public&method=pricingOffers##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](pricingOffers.jpg).

## Opis

Zwraca informację o dostępnych ofertach w Booking Engine

## Adres JSON

`https://_domena_booking_.idosell.com/api/public/pricingOffers/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `objectIds` | intArray | nieoznaczone | Identyfikatory przedmiotów rezerwacji<br><br>element typu int |
| `objectIds.int` | int | tak | element typu int |
| `dateFrom` | string | tak | Data rozpoczęcia |
| `dateTo` | string | tak | Data zakończenia |
| `currency` | string | tak | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `numberOfAdults` | int | tak | Liczba dorosłych |
| `numberOfBigChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają inne ceny |
| `language` | language | tak | Możliwe wartości: (eng, pol, ger) |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `pricingOffers` | pricingOffersArray | nieoznaczone |  |
| `pricingOffers.pricingOfferType` | pricingOfferType | tak | element typu pricingOfferType |
| `pricingOffers.pricingOfferType.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `pricingOffers.pricingOfferType.minimalPrice` | float | tak | Cena minimalna |
| `pricingOffers.pricingOfferType.offers` | offersArray | nieoznaczone | Lista dostępnych ofert |
| `pricingOffers.pricingOfferType.offers.offer` | offer | tak | element typu offer |
| `pricingOffers.pricingOfferType.offers.offer.name` | string | tak | Nazwa |
| `pricingOffers.pricingOfferType.offers.offer.offerType` | string | tak | Typ oferty |
| `pricingOffers.pricingOfferType.offers.offer.price` | float | tak | Cena |
| `pricingOffers.pricingOfferType.offers.offer.persons` | int | tak | Liczba osób |
| `pricingOffers.pricingOfferType.offers.offer.promotionId` | int | nieoznaczone | Identyfikator promocji |
| `pricingOffers.pricingOfferType.offers.offer.includedRateplanIds` | includedRateplanIdsArray | tak | Identyfikatory planów cenowych |
| `pricingOffers.pricingOfferType.offers.offer.includedRateplanIds.int` | int | tak | element typu int |

## Przykład PHP dostawcy

[Osobny plik PHP](pricingOffers.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/public/pricingOffers/36/json';

$request = array();
$request['objectIds'] = array();
$request['objectIds'][0] = 1;
$request['dateFrom'] = "dateFrom";
$request['dateTo'] = "dateTo";
$request['currency'] = "currency";
$request['numberOfAdults'] = 2;
$request['numberOfBigChildren'] = 3;
$request['language'] = 'eng';

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

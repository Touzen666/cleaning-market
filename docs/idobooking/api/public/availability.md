# Bramka Public/Metoda availability

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=public&method=availability##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](availability.jpg).

## Opis

Zwraca informacje o dostępności

## Adres JSON

`https://_domena_booking_.idosell.com/api/public/availability/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `arrival` | string | tak | Data rozpoczęcia rezerwacji |
| `departure` | string | tak | Data zakończenia rezerwacji |
| `persons` | int | nieoznaczone | Liczba osób w rezerwacji |
| `rooms` | int | nieoznaczone | Liczba przedmiotów rezerwacji |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `widgetUrl` | string | nieoznaczone | Adres Widgetu |
| `offers` | offerTypeArrayType | nieoznaczone | Dane przedmiotów rezerwacji |
| `offers.offerTypeType` | offerTypeType | tak | element typu offerTypeType |
| `offers.offerTypeType.offerId` | int | nieoznaczone | Identyfikator przedmiotu rezerwacji |
| `offers.offerTypeType.widgetUrl` | string | nieoznaczone | Adres Widgetu |
| `specialOffers` | specialOfferTypeArrayType | nieoznaczone | Dane zestawów |
| `specialOffers.specialOfferTypeType` | specialOfferTypeType | tak | element typu specialOfferTypeType |
| `specialOffers.specialOfferTypeType.specialOfferId` | string | nieoznaczone | Identyfikator zestawu |
| `specialOffers.specialOfferTypeType.widgetUrl` | string | nieoznaczone | Adres Widgetu |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](availability.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/public/availability/36/json';

$request = array();
$request['arrival'] = "arrival";
$request['departure'] = "departure";
$request['persons'] = 1;
$request['rooms'] = 2;

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

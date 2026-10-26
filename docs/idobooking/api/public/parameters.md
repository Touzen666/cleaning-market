# Bramka Public/Metoda parameters

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=public&method=parameters##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](parameters.jpg).

## Opis

Zwraca informacje o dostępnych parametrach

## Adres JSON

`https://_domena_booking_.idosell.com/api/public/parameters/36/json`

## Struktura żądania

Brak struktury żądania na stronie tej metody.

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `roomTypes` | roomTypeItemArray | tak | Dane pokoju |
| `roomTypes.roomTypeItem` | roomTypeItem | tak | element typu roomTypeItem |
| `roomTypes.roomTypeItem.id` | int | tak |  |
| `roomTypes.roomTypeItem.name` | string | tak |  |
| `currencies` | currencyItemArray | tak | Dane walut |
| `currencies.currencyItem` | currencyItem | tak | element typu currencyItem |
| `currencies.currencyItem.id` | int | tak |  |
| `currencies.currencyItem.name` | string | tak |  |
| `languages` | languageItemArray | tak | Dane języków |
| `languages.languageItem` | languageItem | tak | element typu languageItem |
| `languages.languageItem.id` | int | tak |  |
| `languages.languageItem.name` | string | tak |  |
| `locations` | localizationItemArray | tak | Dane lokacji |
| `locations.localizationItem` | localizationItem | tak | element typu localizationItem |
| `locations.localizationItem.id` | int | tak |  |
| `locations.localizationItem.name` | string | tak |  |
| `locations.localizationItem.street` | string | tak |  |
| `locations.localizationItem.zipcode` | string | tak |  |
| `locations.localizationItem.city` | string | tak |  |
| `locations.localizationItem.country` | string | tak |  |
| `locations.localizationItem.geolocation_lat` | float | tak |  |
| `locations.localizationItem.geolocation_lng` | float | tak |  |
| `locations.localizationItem.phones` | phonesArray | tak |  |
| `locations.localizationItem.phones.phoneType` | phoneType | tak | element typu phoneType |
| `locations.localizationItem.email` | string | tak |  |
| `locations.localizationItem.reception_info` | string | tak |  |
| `locations.localizationItem.directions_info` | string | tak |  |
| `locations.localizationItem.directions_info_plain_text` | string | tak |  |
| `locations.localizationItem.checkin_hours` | checkInHoursRange | tak |  |
| `locations.localizationItem.checkin_hours.from` | string | tak |  |
| `locations.localizationItem.checkin_hours.to` | string | tak |  |
| `locations.localizationItem.checkout_hours` | checkOutHoursRange | tak |  |
| `locations.localizationItem.checkout_hours.from` | string | tak |  |
| `locations.localizationItem.checkout_hours.to` | string | tak |  |
| `locations.localizationItem.reception_hours` | receptionsHoursRange | tak |  |
| `locations.localizationItem.reception_hours.from` | string | tak |  |
| `locations.localizationItem.reception_hours.to` | string | tak |  |

## Przykład PHP dostawcy

[Osobny plik PHP](parameters.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/public/parameters/36/json';

$request = array();

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

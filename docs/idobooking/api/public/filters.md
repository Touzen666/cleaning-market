# Bramka Public/Metoda filters

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=public&method=filters##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](filters.jpg).

## Opis

Zwraca informacje o ustawieniach filtrów Booking Engine

## Adres JSON

`https://_domena_booking_.idosell.com/api/public/filters/36/json`

## Struktura żądania

Brak struktury żądania na stronie tej metody.

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `filters` | filterTypeArray | tak | Filtry |
| `filters.filterType` | filterType | tak | element typu filterType |
| `filters.filterType.id` | int | tak | Identyfikator |
| `filters.filterType.visible` | boolean | tak | Aktywny |
| `filters.filterType.names` | filterNameArray | nieoznaczone | Lista nazw dla włączonych języków |
| `filters.filterType.names.filterNameItem` | filterNameItem | tak | element typu filterNameItem |
| `filters.filterType.names.filterNameItem.languageCode` | string | tak | Kod języka |
| `filters.filterType.names.filterNameItem.name` | string | tak | Nazwa |
| `filters.filterType.tags` | tagArray | tak | Tagi |
| `filters.filterType.tags.tagItem` | tagItem | tak | element typu tagItem |
| `filters.filterType.tags.tagItem.id` | int | tak | Identyfikator |
| `filters.filterType.tags.tagItem.visible` | boolean | tak | Aktywny |
| `filters.filterType.tags.tagItem.names` | filterTagNameArray | tak | Lista nazw dla włączonych języków |
| `filters.filterType.tags.tagItem.names.filterTagNameItem` | filterTagNameItem | tak | element typu filterTagNameItem |
| `filters.filterType.tags.tagItem.names.filterTagNameItem.languageCode` | string | tak | Kod języka |
| `filters.filterType.tags.tagItem.names.filterTagNameItem.name` | string | tak | Nazwa |
| `filters.filterType.tags.tagItem.objectIds` | objectsIdsArray | nieoznaczone | Lista identyfikatorów przedmiotów rezerwacji |
| `filters.filterType.tags.tagItem.objectIds.objectIdType` | objectIdType | tak | element typu objectIdType |

## Przykład PHP dostawcy

[Osobny plik PHP](filters.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/public/filters/36/json';

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

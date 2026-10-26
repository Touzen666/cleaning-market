# Bramka Public/Metoda specialOffer

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=public&method=specialOffer##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](specialOffer.jpg).

## Opis

Zwraca informacje o zestawie

## Adres JSON

`https://_domena_booking_.idosell.com/api/public/specialOffer/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `specialOfferId` | int | tak | Identyfikator zestawu |
| `language` | string | nieoznaczone | Język |
| `currency` | string | nieoznaczone | Waluta |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `success` | boolean | tak |  |
| `name` | string | nieoznaczone | Nazwa obiektu |
| `description` | string | nieoznaczone | Opis |
| `language` | string | nieoznaczone | Język |
| `minimalPrice` | string | nieoznaczone | Cena minimalna |
| `currency` | string | nieoznaczone | Waluta |
| `videos` | galleryItemArrayVideosType | nieoznaczone | Lista filmów |
| `videos.galleryItemType` | galleryItemType | tak | element typu galleryItemType<br><br>Adres URL |
| `videos.galleryItemType.url` | string | nieoznaczone | Adres URL |
| `images` | galleryItemArrayImagesType | nieoznaczone | Lista zdjęć |
| `images.galleryItemType` | galleryItemType | tak | element typu galleryItemType<br><br>Adres URL |
| `images.galleryItemType.url` | string | nieoznaczone | Adres URL |
| `widgetUrl` | string | nieoznaczone | Adres Widgetu |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](specialOffer.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/public/specialOffer/36/json';

$request = array();
$request['specialOfferId'] = 1;
$request['language'] = "language";
$request['currency'] = "currency";

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

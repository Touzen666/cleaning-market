# Bramka Amenities/Metoda getForObjects

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=amenities&method=getForObjects##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getForObjects.jpg).

## Opis

Pobiera udogodnienia możliwe do przypisania dla wybranych typów przedmiotów rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/amenities/getForObjects/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `objectTypesIds` | intArray | nieoznaczone | Lista identyfikatorów typów przedmiotów rezerwacji. Możliwe wartości identyfikatorów przedmiotu rezerwacji: 1 - Pokój, 2 - Apartament, 3 - Dom, 4 - Mieszkanie, 5 - Miejsce na polu namiotowym, 6 - Miejsce na polu kempingowym, 7 - Łóżko, 8 - Domek całoroczny, 9 - Inne, 17 - Pojazd, 18 - Atrakcja, 19 - Wycieczka, 20 - Rzecz, 22 - Domek letniskowy, 23 - Willa<br><br>element typu int |
| `objectTypesIds.int` | int | tak | element typu int |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `objectTypesAmenities` | objectTypesAmenitiesArray | nieoznaczone | Lista typów przedmiotów rezerwacji z udogodnieniami |
| `objectTypesAmenities.objectTypeAmenities` | objectTypeAmenities | tak | element typu objectTypeAmenities |
| `objectTypesAmenities.objectTypeAmenities.objectType` | objectType | tak | Element typu przedmiotu rezerwacji |
| `objectTypesAmenities.objectTypeAmenities.objectType.objectTypeId` | int | tak | Identyfikator typu przedmiotu rezerwacji |
| `objectTypesAmenities.objectTypeAmenities.objectType.objectTypeName` | string | tak | Nazwa typu przedmiotu rezerwacji |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities` | objectAmenitiesArray | nieoznaczone | Element typu udogodnienia przedmiotu rezerwacji |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities.amenity` | amenity | tak | element typu amenity |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities.amenity.amenityId` | int | tak | Identyfikator udogodnienia |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities.amenity.amenityNames` | amenityNameArray | nieoznaczone | Lista nazw dla włączonych języków |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities.amenity.amenityNames.amenityNameItem` | amenityNameItem | tak | element typu amenityNameItem |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities.amenity.amenityNames.amenityNameItem.languageCode` | string | tak | Kod języka |
| `objectTypesAmenities.objectTypeAmenities.objectAmenities.amenity.amenityNames.amenityNameItem.name` | string | tak | Nazwa udogodnienia |

## Przykład PHP dostawcy

[Osobny plik PHP](getForObjects.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/amenities/getForObjects/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['objectTypesIds'] = array();
$request['objectTypesIds'][0] = 1;

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

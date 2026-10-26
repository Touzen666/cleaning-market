# Bramka Amenities/Metoda getForAddons

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=amenities&method=getForAddons##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getForAddons.jpg).

## Opis

Pobiera udogodnienia możliwe do przypisania dla dodatków typu posiłek lub parking. Udogodnienia te są wymagane do ustawienia w bramce Addons. Wpływają one na atrakcyjność oferty i spójność danych przekazywanych do serwisów zewnętrznych.

## Adres JSON

`https://_domena_booking_.idosell.com/api/amenities/getForAddons/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `addonTypesIds` | intArray | nieoznaczone | Lista identyfikatorów typów dodatków. Możliwe wartości identyfikatorów typów dodatków: 1 - Posiłek, 2- Parking<br><br>element typu int |
| `addonTypesIds.int` | int | tak | element typu int |

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
| `addonTypesAmenities` | addonTypesAmenitiesArray | nieoznaczone | Lista typów dodatków z udogodnieniami |
| `addonTypesAmenities.addonTypeAmenities` | addonTypeAmenities | tak | element typu addonTypeAmenities |
| `addonTypesAmenities.addonTypeAmenities.addonType` | addonType | tak | Element typu dodatku |
| `addonTypesAmenities.addonTypeAmenities.addonType.addonTypeId` | int | tak | identyfikator typu dodatku |
| `addonTypesAmenities.addonTypeAmenities.addonType.addonTypeName` | string | tak | Nazwa typu dodatku |
| `addonTypesAmenities.addonTypeAmenities.addonAmenities` | addonAmenitiesArray | nieoznaczone |  |
| `addonTypesAmenities.addonTypeAmenities.addonAmenities.amenity` | amenity | tak | element typu amenity |
| `addonTypesAmenities.addonTypeAmenities.addonAmenities.amenity.amenityId` | int | tak | Identyfikator udogodnienia |
| `addonTypesAmenities.addonTypeAmenities.addonAmenities.amenity.amenityName` | string | tak | Nazwa udogodnienia |
| `addonTypesAmenities.addonTypeAmenities.mealPlans` | mealPlans | nieoznaczone | Lista planów żywieniowych |
| `addonTypesAmenities.addonTypeAmenities.mealPlans.mealPlan` | mealPlan | tak | element typu mealPlan |
| `addonTypesAmenities.addonTypeAmenities.mealPlans.mealPlan.mealPlanId` | int | tak | Identyfikator planu żywieniowego |
| `addonTypesAmenities.addonTypeAmenities.mealPlans.mealPlan.mealPlanName` | string | tak | Nazwa planu żywieniowego |

## Przykład PHP dostawcy

[Osobny plik PHP](getForAddons.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/amenities/getForAddons/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['addonTypesIds'] = array();
$request['addonTypesIds'][0] = 1;

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

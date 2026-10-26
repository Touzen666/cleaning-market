# Bramka Objects/Metoda getAll

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=getAll##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getAll.jpg).

## Opis

Zwraca informacje o wszystkich przedmiotach rezerwacji.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/getAll/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `result` | resultRequestType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `result.number` | int | nieoznaczone | Liczba wyników zwracanych na stronie (maksymalna wartość to 100) |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `objects` | objectTypeArray | nieoznaczone | Miejsca noclegowe |
| `objects.objectType` | objectType | tak | element typu objectType |
| `objects.objectType.id` | int | tak | Identyfikator |
| `objects.objectType.name` | string | tak | Nazwa |
| `objects.objectType.capacity` | int | tak | Pojemność przedmiotu rezerwacji |
| `objects.objectType.area` | string | tak | Powierzchnia w metrach kwadratowych |
| `objects.objectType.minCapacity` | int | tak | Minimalna ilość osób |
| `objects.objectType.pricesPerPersons` | boolean | tak | Cena zależna od liczby osób |
| `objects.objectType.bedroomsCount` | int | tak | Liczba sypialni |
| `objects.objectType.priceRules` | boolean | tak | Informacja czy obiekt konfiguruje ceny za pomocą automatycznych reguł cenowych |
| `objects.objectType.beds` | bedsConfigurationArray | nieoznaczone | Rodzaj łóżek przypisanych do miejsca noclegowego |
| `objects.objectType.beds.bedConfigurationArray` | bedConfigurationArray | tak | element typu bedConfigurationArray |
| `objects.objectType.beds.bedConfigurationArray.count` | int | tak | Liczba łóżek danego rodzaju |
| `objects.objectType.beds.bedConfigurationArray.bedType` | bedTypeType | tak | Możliwe wartości: (single, futon, murphyBed, queen, double, king, sofaBed, singleSofa, roll_away_bed, bunkBed) |
| `objects.objectType.categories` | categoryTypeArray | nieoznaczone |  |
| `objects.objectType.categories.categoryType` | categoryType | tak | element typu categoryType |
| `objects.objectType.categories.categoryType.id` | int | tak | Identyfikator |
| `objects.objectType.categories.categoryType.name` | string | tak | Nazwa |
| `objects.objectType.categories.categoryType.isActive` | isActiveType | tak | Możliwe wartości: (n, y)<br><br>Czy aktywna |
| `objects.objectType.items` | itemTypeArray | nieoznaczone | Egzemplarze przedmiotu rezerwacji |
| `objects.objectType.items.itemType` | itemType | tak | element typu itemType |
| `objects.objectType.items.itemType.id` | int | nieoznaczone | Identyfikator |
| `objects.objectType.items.itemType.name` | string | nieoznaczone | Nazwa |
| `objects.objectType.items.itemType.capacity` | int | nieoznaczone | Pojemność przedmiotu rezerwacji |
| `objects.objectType.addons` | addonTypeArray | nieoznaczone | Dodatki |
| `objects.objectType.addons.addonType` | addonType | tak | element typu addonType |
| `objects.objectType.addons.addonType.id` | int | nieoznaczone | Identyfikator |
| `objects.objectType.addons.addonType.name` | string | nieoznaczone | Nazwa |
| `objects.objectType.addons.addonType.costless` | boolean | nieoznaczone | Czy bezpłatny |
| `objects.objectType.addons.addonType.optional` | boolean | nieoznaczone | Niekonieczny |
| `objects.objectType.addons.addonType.hasVariants` | boolean | tak | dodatek z wieloma wartościami / cenami |
| `objects.objectType.addons.addonType.currency` | string | nieoznaczone | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `objects.objectType.addons.addonType.price` | float | nieoznaczone | Cena |
| `objects.objectType.addons.addonType.type` | string | nieoznaczone | Typ |
| `objects.objectType.addons.addonType.personType` | personTypeType | nieoznaczone | Możliwe wartości: (adults, big_children, small_children)<br><br>Dodatek naliczany tylko dla konkretnego typu osoby, możliwe wartości: - adults - dorośli - big_children - starsze dzieci - small_children - małe dzieci |
| `objects.objectType.addons.addonType.names` | addonNameArray | tak | Lista nazw dla włączonych języków |
| `objects.objectType.addons.addonType.names.addonNameItem` | addonNameItem | tak | element typu addonNameItem |
| `objects.objectType.addons.addonType.names.addonNameItem.languageCode` | string | tak | Kod języka |
| `objects.objectType.addons.addonType.names.addonNameItem.name` | string | tak | Nazwa |
| `objects.objectType.addons.addonType.names.addonNameItem.description` | string | tak | Opis |
| `objects.objectType.addons.addonType.variants` | variantsTypeArray | nieoznaczone |  |
| `objects.objectType.addons.addonType.variants.variantItem` | variantItem | tak | element typu variantItem |
| `objects.objectType.addons.addonType.variants.variantItem.currency` | string | tak | Kod waluty zgodny z ISO 4217 Przykład: PLN, EUR |
| `objects.objectType.addons.addonType.variants.variantItem.price` | float | tak | Cena |
| `objects.objectType.addons.addonType.variants.variantItem.id` | int | tak | Identyfikator |
| `objects.objectType.addons.addonType.variants.variantItem.names` | addonNameArray | tak | Lista nazw dla włączonych języków |
| `objects.objectType.addons.addonType.variants.variantItem.names.addonNameItem` | addonNameItem | tak | element typu addonNameItem |
| `objects.objectType.addons.addonType.variants.variantItem.names.addonNameItem.languageCode` | string | tak | Kod języka |
| `objects.objectType.addons.addonType.variants.variantItem.names.addonNameItem.name` | string | tak | Nazwa |
| `objects.objectType.addons.addonType.variants.variantItem.names.addonNameItem.description` | string | tak | Opis |
| `result` | resultResponseType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 1 |
| `result.countOnPage` | int | nieoznaczone | Ilość wyników na stronie |
| `result.pageAll` | int | nieoznaczone | Suma wyników na stronie |
| `result.countAll` | int | nieoznaczone | Suma wszystkich wyników |

## Przykład PHP dostawcy

[Osobny plik PHP](getAll.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/getAll/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['result'] = array();
$request['result']['page'] = 1;
$request['result']['number'] = 2;

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

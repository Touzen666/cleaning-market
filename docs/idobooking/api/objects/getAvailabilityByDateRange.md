# Bramka Objects/Metoda getAvailabilityByDateRange

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=objects&method=getAvailabilityByDateRange##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getAvailabilityByDateRange.jpg).

## Opis

Zwraca dostępność przedmiotów rezerwacji w wybranym okresie.

## Adres JSON

`https://_domena_booking_.idosell.com/api/objects/getAvailabilityByDateRange/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `dateFrom` | string | tak | Data początkowa w formacie YYYY-MM-DD |
| `dateTo` | string | tak | Data końcowa w formacie YYYY-MM-DD |
| `result` | resultRequestType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.number` | int | nieoznaczone | Ilość stron wszystkich znalezionych wyników |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: - eng - angielski - pol - polski - ger - niemiecki |
| `success` | boolean | tak |  |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `availability` | availabilityForTheDayTypeArray | nieoznaczone | Dane dostepnosci |
| `availability.availabilityForTheDayTypeType` | availabilityForTheDayTypeType | tak | element typu availabilityForTheDayTypeType |
| `availability.availabilityForTheDayTypeType.date` | string | tak | Data |
| `availability.availabilityForTheDayTypeType.objects` | objectsTypeArray | nieoznaczone | Lista miejsc noclegowych |
| `availability.availabilityForTheDayTypeType.objects.objectsTypeType` | objectsTypeType | tak | element typu objectsTypeType |
| `availability.availabilityForTheDayTypeType.objects.objectsTypeType.number` | int | tak | Ilość egzemplarzy |
| `availability.availabilityForTheDayTypeType.objects.objectsTypeType.objectId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `availability.availabilityForTheDayTypeType.objects.objectsTypeType.itemsId` | itemsIdTypeArray | tak | Lista indyfikatorow egzemplarzy |
| `availability.availabilityForTheDayTypeType.objects.objectsTypeType.itemsId.itemsIdTypeType` | itemsIdTypeType | tak | element typu itemsIdTypeType |
| `result` | resultResponseType | nieoznaczone | Parametry dotyczące zwracanych wyników |
| `result.page` | int | nieoznaczone | Numer strony z wynikami. Numeracja rozpoczyna się od 0 |
| `result.countOnPage` | int | nieoznaczone | Ilość wyników na stronie |
| `result.pageAll` | int | nieoznaczone | Suma wyników na stronie |
| `result.countAll` | int | nieoznaczone | Suma wszystkich wyników |

## Przykład PHP dostawcy

[Osobny plik PHP](getAvailabilityByDateRange.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/objects/getAvailabilityByDateRange/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['dateFrom'] = "dateFrom";
$request['dateTo'] = "dateTo";
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

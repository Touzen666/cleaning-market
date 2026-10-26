# Bramka Offer/Metoda getChildrenInformation

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=offer&method=getChildrenInformation##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getChildrenInformation.jpg).

## Opis

Pobiera informacje o zdefiniowanych przedziałach wiekowych dzieci.

## Adres JSON

`https://_domena_booking_.idosell.com/api/offer/getChildrenInformation/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |

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
| `childrenInformation` | childrenInformation | nieoznaczone | Tablica zawiera informacje o przedziałach wiekowych dzieci |
| `childrenInformation.childrenSmall` | childrenSmallArray | tak |  |
| `childrenInformation.childrenSmall.enabled` | boolean | tak | Element określający czy przedział wiekowy jest włączony |
| `childrenInformation.childrenSmall.from` | int | nieoznaczone | Dolna granica przedziału wiekowego |
| `childrenInformation.childrenSmall.to` | int | nieoznaczone | Górna granica przedziału wiekowego |
| `childrenInformation.childrenBig` | childrenBigArray | tak | Dzieci starsze |
| `childrenInformation.childrenBig.enabled` | boolean | tak | Element określający czy przedział wiekowy jest włączony |
| `childrenInformation.childrenBig.from` | int | nieoznaczone | Dolna granica przedziału wiekowego |
| `childrenInformation.childrenBig.to` | int | nieoznaczone | Górna granica przedziału wiekowego |

## Przykład PHP dostawcy

[Osobny plik PHP](getChildrenInformation.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/offer/getChildrenInformation/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';

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

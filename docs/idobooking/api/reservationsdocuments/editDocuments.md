# Bramka Reservations Documents/Metoda editDocuments

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservationsdocuments&method=editDocuments##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](editDocuments.jpg).

## Opis

Metoda pozwala na edytowanie dokumentów do rezerwacji

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservationsdocuments/editDocuments/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `params` | paramsType | tak | Parametry przekazywane do metody |
| `params.editDocuments` | editDocumentsTypeArrayType | tak | Dane dokumentów |
| `params.editDocuments.editDocumentsType` | editDocumentsType | tak | element typu editDocumentsType |
| `params.editDocuments.editDocumentsType.ids` | intArray | tak | Identyfikatory rezerwacji<br><br>element typu int |
| `params.editDocuments.editDocumentsType.ids.int` | int | tak | element typu int |
| `params.editDocuments.editDocumentsType.type` | docType | tak | Możliwe wartości: (vat_invoice)<br><br>Typ dokumentu Dopuszczalne wartości: vat_invoice - Faktura VAT |
| `params.editDocuments.editDocumentsType.issueDate` | string | nieoznaczone | Data wystawienia |
| `params.editDocuments.editDocumentsType.saleDate` | string | nieoznaczone | Data sprzedaży |
| `params.editDocuments.editDocumentsType.paymentDate` | string | nieoznaczone | Termin płatności |

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
| `documents` | editDocumentsTypeArray | nieoznaczone | Dane dokumentów |
| `documents.editDocumentsType` | editDocumentsType | tak | element typu editDocumentsType |
| `documents.editDocumentsType.ids` | intArray | tak | Identyfikatory rezerwacji<br><br>element typu int |
| `documents.editDocumentsType.ids.int` | int | tak | element typu int |
| `documents.editDocumentsType.type` | docType | tak | Możliwe wartości: (vat_invoice)<br><br>Typ dokumentu Dopuszczalne wartości: vat_invoice - Faktura VAT |
| `documents.editDocumentsType.issueDate` | string | nieoznaczone | Data wystawienia |
| `documents.editDocumentsType.saleDate` | string | nieoznaczone | Data sprzedaży |
| `documents.editDocumentsType.paymentDate` | string | nieoznaczone | Termin płatności |

## Przykład PHP dostawcy

[Osobny plik PHP](editDocuments.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservationsdocuments/editDocuments/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['editDocuments'] = array();
$request['params']['editDocuments'][0] = array();
$request['params']['editDocuments'][0]['ids'] = array();
$request['params']['editDocuments'][0]['ids'][0] = 1;
$request['params']['editDocuments'][0]['type'] = 'vat_invoice';
$request['params']['editDocuments'][0]['issueDate'] = "issueDate";
$request['params']['editDocuments'][0]['saleDate'] = "saleDate";
$request['params']['editDocuments'][0]['paymentDate'] = "paymentDate";

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

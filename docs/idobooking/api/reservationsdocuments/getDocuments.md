# Bramka Reservations Documents/Metoda getDocuments

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservationsdocuments&method=getDocuments##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](getDocuments.jpg).

## Opis

Metoda pozwala na pobranie informacji o dokumentach wystawionych do rezerwacji w panelu administracyjnym

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservationsdocuments/getDocuments/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `params` | paramsType | tak | Parametry przekazywane do metody.<br><br>Identyfikator rezerwacji |
| `params.reservationId` | int | tak | Identyfikator rezerwacji |

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
| `documents` | getDocumentsTypeArray | nieoznaczone | Lista dokumentów wystawionych do rezerwacji |
| `documents.getDocumentsType` | getDocumentsType | tak | element typu getDocumentsType |
| `documents.getDocumentsType.success` | boolean | nieoznaczone | Sukces |
| `documents.getDocumentsType.error` | errorType | nieoznaczone | Dane błędu |
| `documents.getDocumentsType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `documents.getDocumentsType.error.faultString` | string | nieoznaczone | Opis błędu |
| `documents.getDocumentsType.type` | docType | nieoznaczone | Możliwe wartości: (vat_invoice, pro_forma_invoice)<br><br>Typ dokumentu Dopuszczalne wartości: vat_invoice - Faktura VAT, pro_forma_invoice - Faktura pro forma |
| `documents.getDocumentsType.documentId` | string | nieoznaczone | Numer dokumentu |
| `documents.getDocumentsType.issueDate` | string | nieoznaczone | Data wystawienia |
| `documents.getDocumentsType.saleDate` | string | nieoznaczone | Data sprzedaży |
| `documents.getDocumentsType.paymentDate` | string | nieoznaczone | Termin płatności |
| `documents.getDocumentsType.pdfBase64` | string | nieoznaczone | Plik PDF z dokumentami (zakodowany za pomocą algorytmu base64) |

## Przykład PHP dostawcy

[Osobny plik PHP](getDocuments.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservationsdocuments/getDocuments/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['reservationId'] = 1;

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

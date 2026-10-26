# Bramka Users/Metoda get

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=users&method=get##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](get.jpg).

## Opis

Zwraca informacje o użytkownikach.

## Adres JSON

`https://_domena_booking_.idosell.com/api/users/get/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: <br> - <strong> eng </strong> - angielski <br> - <strong> pol </strong> - polski<br> - <strong> ger </strong> - niemiecki<br> |
| `user` | getUserType | tak |  |
| `user.id` | int | nieoznaczone | Identyfikator |
| `user.login` | string | nieoznaczone | Login |
| `user.email` | string | nieoznaczone | Adres e-mail |
| `user.lastName` | string | nieoznaczone | Nazwisko |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | nieoznaczone | Element zawierający informacje zwrotne z modułu autoryzującego |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API, możliwe wartości: <br> - <strong> eng </strong> - angielski <br> - <strong> pol </strong> - polski<br> - <strong> ger </strong> - niemiecki<br> |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `users` | usersArray | nieoznaczone | Lista użytkowników w postaci tablicy elementów typu user |
| `users.user` | user | tak | element typu user |
| `users.user.id` | int | tak | Identyfikator |
| `users.user.login` | string | tak | Login |
| `users.user.firstName` | string | tak | Imię |
| `users.user.lastName` | string | tak | Nazwisko |
| `users.user.email` | string | tak | Adres e-mail |
| `users.user.emailNotification` | emailNotificationType | tak | Możliwe wartości: (n, y, some)<br><br>Otrzymuje powiadomienia, możliwe wartości: - y - wszystkie - n - nie - some - wybrane |
| `users.user.automaticEmails` | int | tak | Otrzymuje powiadomienia - maska bitowa (Wartość maksymalna: 8272382) |
| `users.user.ticketNotification` | ticketNotificationType | tak | Możliwe wartości: (always, own, never)<br><br>Automatyczne powiadomienie e-mailem, możliwe wartości: - always - o wszystkich komunikatach - own - nigdy - never - tylko o komunikatach, w których się wypowiada |
| `users.user.admin` | adminType | tak | Możliwe wartości: (n, y) |
| `users.user.accessReservations` | accessReservationsType | tak | Możliwe wartości: (no, full, read)<br><br>Uprawnienia do rezerwacji: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.accessClients` | accessClientsType | tak | Możliwe wartości: (no, full, read, read_without_csv)<br><br>Uprawnienia do klientów: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> read_without_csv </strong> - tak (bez eksportu bazy klientów do CSV)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.accessOffers` | accessOffersType | tak | Możliwe wartości: (no, full, read)<br><br>Uprawnienia do oferty: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.accessWidget` | accessWidgetType | tak | Możliwe wartości: (no, full, read)<br><br>Uprawnienia do widget: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.accessFrontpage` | accessFrontpageType | tak | Możliwe wartości: (no, full, read)<br><br>Uprawnienia do wizytówki: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.accessMarketing` | accessMarketingType | tak | Możliwe wartości: (no, full, read)<br><br>Uprawnienia do marketingu: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.accessAdministration` | accessAdministrationType | tak | Możliwe wartości: (no, full, read_without_users, read)<br><br>Uprawnienia do administracji: <br> - <strong> no </strong> - nie<br> - <strong> read </strong> - tak (tylko do odczytu)<br> - <strong> read_without_users </strong> - tak (bez zarządzania użytkownikami)<br> - <strong> full </strong> - tak (pełny) |
| `users.user.localizationsAccess` | userGetLocalizationAccessTypeArray | nieoznaczone | Uprawnienia do lokalizacji i przedmiotów rezerwacji w postaci tablicy elementów typu userGetLocalizationAccessType |
| `users.user.localizationsAccess.userGetLocalizationAccessType` | userGetLocalizationAccessType | tak | element typu userGetLocalizationAccessType |
| `users.user.localizationsAccess.userGetLocalizationAccessType.localization` | localizationType | nieoznaczone | Id lokalizacji |
| `users.user.localizationsAccess.userGetLocalizationAccessType.object` | objectType | nieoznaczone | Id przedmiotu rezerwacji |
| `users.user.localizationsAccess.userGetLocalizationAccessType.offer` | offerType | nieoznaczone | Id zestawu |
| `users.user.panelLanguage` | string | tak | Język panelu. ISO 639-3 Przykład: eng, pol |
| `users.user.timeZone` | string | tak | Strefa czasowa. Przykład: Europe/Moscow |
| `users.user.locale` | string | tak | Format dat, liczb i kwot. Przykład: en_GB, pl_PL |

## Przykład PHP dostawcy

[Osobny plik PHP](get.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/users/get/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['user'] = array();
$request['user']['id'] = 1;
$request['user']['login'] = "login";
$request['user']['email'] = "email";
$request['user']['lastName'] = "lastName";

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

# Bramka Reservations/Metoda edit

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/api/administration-panel-api/?action=method&function=reservations&method=edit##)

Kopia: 24.10.2026 · API 36 · JSON. [Pełny zrzut](edit.jpg).

## Opis

Edytuje rezerwacje

## Adres JSON

`https://_domena_booking_.idosell.com/api/reservations/edit/36/json`

## Struktura żądania

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `authenticate` | authenticateType | tak | Element służy do uwierzytelniania konta w celu wywołania metody |
| `authenticate.systemKey` | string | tak | Klucz wykorzystywany podczas uwierzytelniania. Zapoznaj się z instrukcją generowania klucza |
| `authenticate.systemLogin` | string | tak | Login użytkownika panelu IdoSell Booking |
| `authenticate.lang` | apiLanguage | nieoznaczone | Możliwe wartości: (eng, pol, ger)<br><br>Język API |
| `params` | paramsType | tak | Parametry przekazywane do metody |
| `params.reservations` | editReservationTypeArray | tak | Dane rezerwacji |
| `params.reservations.editReservationType` | editReservationType | tak | element typu editReservationType |
| `params.reservations.editReservationType.id` | int | tak | Identyfikator |
| `params.reservations.editReservationType.dateFrom` | string | nieoznaczone | Data i godzina rozpoczęcia |
| `params.reservations.editReservationType.dateTo` | string | nieoznaczone | Data i godzina zakończenia |
| `params.reservations.editReservationType.clientId` | int | nieoznaczone | Identyfikator klienta |
| `params.reservations.editReservationType.clientNote` | string | nieoznaczone | Uwagi klienta do rezerwacji |
| `params.reservations.editReservationType.externalNote` | string | nieoznaczone | Informacje dla klienta |
| `params.reservations.editReservationType.apiNote` | string | nieoznaczone | Notatka API |
| `params.reservations.editReservationType.internalNote` | string | nieoznaczone | Notatka do rezerwacji |
| `params.reservations.editReservationType.items` | editReservationItemTypeArray | nieoznaczone | Dane przedmiotów rezerwacji |
| `params.reservations.editReservationType.items.editReservationItemType` | editReservationItemType | tak | element typu editReservationItemType |
| `params.reservations.editReservationType.items.editReservationItemType.objectItemId` | int | tak | Identyfikator przedmiotu rezerwacji |
| `params.reservations.editReservationType.items.editReservationItemType.price` | float | nieoznaczone | Cena |
| `params.reservations.editReservationType.items.editReservationItemType.priceCorrection` | float | nieoznaczone | Upust/dopłata. W przypadku wartości ujemnej należy traktować wartość jako upust, w przypadku wartości dodatniej jako dopłatę |
| `params.reservations.editReservationType.items.editReservationItemType.vat` | float | nieoznaczone | Vat (%) |
| `params.reservations.editReservationType.items.editReservationItemType.numberOfAdults` | int | nieoznaczone | Liczba dorosłych |
| `params.reservations.editReservationType.items.editReservationItemType.numberOfBigChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają inne ceny |
| `params.reservations.editReservationType.items.editReservationItemType.numberOfSmallChildren` | int | nieoznaczone | liczba dzieci, które według konfiguracji sprzedaży mają pobyt gratis |
| `params.reservations.editReservationType.items.editReservationItemType.addons` | editReservationAddonTypeArray | nieoznaczone | Dane dodatków rezerwacji |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType` | editReservationAddonType | tak | element typu editReservationAddonType |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType.addonId` | int | tak | Identyfikator dodatku |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType.persons` | int | tak | Liczba osób |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType.nights` | int | tak | Liczba nocy |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType.quantity` | int | tak | Ilość dodatku |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType.price` | float | tak | Cena |
| `params.reservations.editReservationType.items.editReservationItemType.addons.editReservationAddonType.vat` | float | tak | Vat (%) |
| `params.reservations.editReservationType.notify` | notifyType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Powiadamiaj wiadomością transakcyjną |
| `params.reservations.editReservationType.notifyService` | notifyServiceType | nieoznaczone | Możliwe wartości: (y, n)<br><br>Wysyłaj powiadomienia dla obsługi obiektu. Domyślnie są wysyłane |

## Struktura odpowiedzi

| Ścieżka w drzewie dokumentacji | Typ | Wymagane w tym węźle | Opis i dopuszczalne wartości |
| --- | --- | --- | --- |
| `errors` | gateErrorType | nieoznaczone | Lista kodów błędów |
| `errors.faultCode` | int | nieoznaczone | Kod błędu |
| `errors.faultString` | string | nieoznaczone | Opis błędu |
| `reservations` | changeReservationsTypeArray | nieoznaczone | Dane zmienionych rezerwacji |
| `reservations.changeReservationsType` | changeReservationsType | tak | element typu changeReservationsType |
| `reservations.changeReservationsType.success` | boolean | nieoznaczone | Sukces |
| `reservations.changeReservationsType.reservationId` | int | nieoznaczone | Identyfikator rezerwacji |
| `reservations.changeReservationsType.error` | errorType | nieoznaczone | Dane błędu |
| `reservations.changeReservationsType.error.faultCode` | int | nieoznaczone | Kod błędu |
| `reservations.changeReservationsType.error.faultString` | string | nieoznaczone | Opis błędu |

## Przykład PHP dostawcy

[Osobny plik PHP](edit.php).

```php
<?php

$address = 'https://client1679.idobooking.com/api/reservations/edit/36/json';

$request = array();
$request['authenticate'] = array();
$request['authenticate']['systemKey'] = sha1(date('Ymd') . sha1('YOUR_KEY'));
$request['authenticate']['systemLogin'] = "systemLogin";
$request['authenticate']['lang'] = 'eng';
$request['params'] = array();
$request['params']['reservations'] = array();
$request['params']['reservations'][0] = array();
$request['params']['reservations'][0]['id'] = 1;
$request['params']['reservations'][0]['dateFrom'] = "dateFrom";
$request['params']['reservations'][0]['dateTo'] = "dateTo";
$request['params']['reservations'][0]['clientId'] = 2;
$request['params']['reservations'][0]['clientNote'] = "clientNote";
$request['params']['reservations'][0]['externalNote'] = "externalNote";
$request['params']['reservations'][0]['apiNote'] = "apiNote";
$request['params']['reservations'][0]['internalNote'] = "internalNote";
$request['params']['reservations'][0]['items'] = array();
$request['params']['reservations'][0]['items'][0] = array();
$request['params']['reservations'][0]['items'][0]['objectItemId'] = 3;
$request['params']['reservations'][0]['items'][0]['price'] = 4.0;
$request['params']['reservations'][0]['items'][0]['priceCorrection'] = 5.0;
$request['params']['reservations'][0]['items'][0]['vat'] = 6.0;
$request['params']['reservations'][0]['items'][0]['numberOfAdults'] = 7;
$request['params']['reservations'][0]['items'][0]['numberOfBigChildren'] = 8;
$request['params']['reservations'][0]['items'][0]['numberOfSmallChildren'] = 9;
$request['params']['reservations'][0]['items'][0]['addons'] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0] = array();
$request['params']['reservations'][0]['items'][0]['addons'][0]['addonId'] = 10;
$request['params']['reservations'][0]['items'][0]['addons'][0]['persons'] = 11;
$request['params']['reservations'][0]['items'][0]['addons'][0]['nights'] = 12;
$request['params']['reservations'][0]['items'][0]['addons'][0]['quantity'] = 13;
$request['params']['reservations'][0]['items'][0]['addons'][0]['price'] = 14.0;
$request['params']['reservations'][0]['items'][0]['addons'][0]['vat'] = 15.0;
$request['params']['reservations'][0]['notify'] = 'y';
$request['params']['reservations'][0]['notifyService'] = 'y';

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

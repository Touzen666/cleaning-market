# Strona contact.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-contact-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-contact-tpl-w-szablonach-wizytowki.jpg).

### **$bankAccountData** - konto bankowe

 

| **Zmienna** | **Opis** |
| --- | --- |
| $bankAccountData['enableCurrencies'] | Lista walut dla których są widoczne konta bankowe |
| $bankAccountData['enableCurrencies']['currency'] | Określa czy w danej walucie mamy dostępne konto bankowe |
| $bankAccountData['enableCurrencies']['active'] | Określa czy chcemy pokazywać konta bankowe na stronie wizytówce |

 

### **$bankData['currencies_settings'][currency_id]** - konto bankowe w walucie

 

| **Zmienna** | **Opis** |
| --- | --- |
| $bankAccountData['currencies_settings'][currency_id]['account'] | Numer konta dla waluty |
| $bankAccountData['currencies_settings'][currency_id]['swift'] | Numer SWIFT/BIC dla waluty |
| $bankAccountData['currencies_settings'][currency_id]['bank'] | Nazwa banku dla waluty |
| $bankAccountData['currencies_settings'][currency_id]['name'] | Nazwę odbiorcy dla waluty |
| $bankAccountData['currencies_settings'][currency_id]['address'] | Adres odbiorcy dla waluty |

 

### **$locations[item]** - informacje na temat lokalizacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $locations[item]['lng'] | Długość geograficzna |
| $locations[item]['lat'] | Szerokość geograficzna |
| $locations[item]['name'] | Nazwa lokalizacji |
| $locations[item]['id'] | Identyfikator lokalizacji |
| $locations[item][ 'city'] | Miasto |
| $locations[item]['street'] | Ulica |
| $locations[item]['zipcode'] | Kod pocztowy |
| $locations[item]['country'] | Państwo |

 

### **$hotel_description_section** - dane obiektu

 

| $hotel_description_section['object_phone'] | Numer telefonu |
| --- | --- |
| $hotel_description_section['object_phone_2'] | Drugi numer telefonu |
| $hotel_description_section['object_fax'] | Fax |
| $hotel_description_section['object_skype'] | Skype |
| $hotel_description_section['object_mail'] | Adres e-mail |
| $hotel_description_section['reception_open_mode'] | Ustawienie 'Godzina odbioru rezerwacji' |
| $hotel_description_section['reception_open_hour'] | Godzina otwarcia recepcji lub odbioru kluczy |
| $hotel_description_section['reception_close_hour] | Godzina zamknięcia recepcji lub odbioru kluczy |

 

### **$company_description_section** - dane twojej firmy

 

| $company_description_section['name'] | Nazwa firmy |
| --- | --- |
| $company_description_section['street'] | Ulica |
| $company_description_section['zipcode'] | Kod pocztowy |
| $company_description_section['city'] | Miasto |
| $company_description_section['nip'] | NIP |
| $company_description_section['country'] | Kod kraju |
| $company_description_section['bankAccountData']['enable_currencies'] | Lista walut dla których są widoczne konta bankowe |
| $company_description_section['bankAccountData']['active'] | Określa czy chcemy pokazywać konta bankowe na stronie wizytówce |
| $company_description_section['bankAccountData']['active_settings'] | Konfiguracja konta bankowego dla aktywnej waluty |
| $company_description_section['bankAccountData']['currencies_settings'] | Konfiguracja kont bankowych dla walut |

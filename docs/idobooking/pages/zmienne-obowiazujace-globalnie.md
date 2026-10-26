# Zmienne obowiązujące globalnie

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/zmienne-obowiazujace-globalnie/)

Kopia: 24.10.2026. [Pełny zrzut](zmienne-obowiazujace-globalnie.jpg).

### **$commonGallery** - galeria wspólna

 

| **Zmienna** | **Opis** |
| --- | --- |
| $commonGallery[item] | Blok zmiennych dla wspólnej galerii wszystkich podstron |
| $commonGallery[item]['url'] | Adres zdjęcia/filmu |
| $commonGallery[item]['miniature'] | Adres miniatury zdjęcia |
| $commonGallery[item]['type'] | Typ (picture lub video) |
| $commonGallery[item]['thumbnail'] | Adres miniatury dla typu video |
| $commonGallery[item]['full_size'] | Nieprzeskalowana grafika |

 

### **$currenciesActiveInReservation** - aktywne waluty w rezerwacjach

 

| **Zmienna** | **Opis** |
| --- | --- |
| $currenciesActiveInReservation[item] | Blok zmiennych dla walut aktywnych w rezerwacjach |
| $currenciesActiveInReservation[item]['id'] | Identyfikator waluty aktywnej w rezerwacjach |
| $currenciesActiveInReservation[item]['code'] | Kod waluty aktywnej w rezerwacjach np „PLN” |
| $currenciesActiveInReservation[item]['symbol'] | Symbol waluty aktywnej w rezerwacjach |
| $currenciesActiveInReservation[item]['format'] | Format w jakim zapisuje się kwotę w walucie aktywnej w rezerwacjach |

 

### **$currentCurrency** - aktualnie aktywne waluty

 

| **Zmienna** | **Opis** |
| --- | --- |
| $currentCurrency['id'] | Identyfikator aktualnie aktywnej waluty |
| $currentCurrency['code'] | Kod aktualnie aktywnej waluty np „PLN” |
| $currentCurrency['symbol'] | Symbol aktualnie aktywnej waluty |
| $currentCurrency['format'] | Format w jakim zapisuje się kwotę w aktualnie aktywnej walucie |

 

### **$language** - aktualnie aktywny język

 

| **Zmienna** | **Opis** |
| --- | --- |
| $language['id'] | Identyfikator aktualnie aktywnego języka |
| $language['locale'] | Kod ISO 3166‑1 aktualnie aktywnego języka np. „pl_PL” |
| $language['code'] | Kod ISO 639-3 aktualnie aktywnego języka np. „pol” |
| $language['code2'] | Kod ISO 639 aktualnie aktywnego języka np. „pl” |
| $language['name'] | Nazwa aktywnego języka |
| $language['name_txt'] | Identyfikator aktualnie aktywnego języka |
| $language['locale'] | Locale aktualnie aktywnego języka |
| $language['default_frontpage_language'] | Domyślny język wizytówki |

 

### **$menu** - menu główne

 

| **Zmienna** | **Opis** |
| --- | --- |
| $menu[item] | Nazwa własna elementu menu |
| $menu[item]['pointerName'] | Nazwa elementu menu |
| $menu[item]['href'] | Adres do podstrony |
| $menu[item]['active'] | Określa czy element jest aktywnym elementem menu |
| $menu[item]['submenu'] | Podmenu |
| $menu[item]['submenu'][item] | Nazwa własna elementu submenu |
| $menu[item]['submenu'][item]['pointerName'] | Nazwa elementu submenu |
| $menu[item]['submenu'][item]['href'] | Adres do podstrony |

 

### **$menuLangArray[item]** - menu językowe

 

| **Zmienna** | **Opis** |
| --- | --- |
| $menuLangArray[item]['url'] | Link do wizytówki w danym języku |
| $menuLangArray[item]['name'] | Nazwę języka |
| $menuLangArray[item]['shortName'] | Skrócona nazwę języka |

 

### **$meta** - znaczniki META

 

| **Zmienna** | **Opis** |
| --- | --- |
| $meta['title'] | Tytuł znacznika META |
| $meta['description'] | Opis znacznika meta |

 

### **$customStyle** - własny arkusz stylów CSS

 

| **Zmienna** | **Opis** |
| --- | --- |
| $customStyle | Czy jest własny arkusz stylów CSS |
| $customStylePath | Adres do arkusza |

 

### **$ownerData** - dane o firmie

 

| **Zmienna** | **Opis** |
| --- | --- |
| $ownerData['is_vat'] | Określa czy firma jest płatnikiem VAT |
| $ownerData['name'] | Nazwa firmy |
| $ownerData['short_name'] | Skrócona nazwa firmy |
| $ownerData['street'] | Ulica firmy |
| $ownerData['city'] | Miasto firmy |
| $ownerData['zipcode'] | Kod pocztowy firmy |
| $ownerData['country'] | Kraj firmy |
| $ownerData['account'] | Numer konta bankowego firmy |
| $ownerData['swift'] | Numer SWIFT/BIC konta bankowego |
| $ownerData['bank'] | Nazwa banku konta bankowego firmy |
| $ownerData['nip'] | NIP firmy |
| $ownerData['krs'] | KRS firmy |
| $ownerData['object_name'] | Nazwa obiektu |
| $ownerData['object_short_name'] | Skrócona nazwę obiektu |
| $ownerData['object_street'] | Ulica obiektu |
| $ownerData['object_city'] | Miasto obiektu |
| $ownerData['object_zipcode'] | Kod pocztowy obiektu |
| $ownerData['object_country'] | Kraj obiektu |
| $ownerData['object_phone'] | Numer telefonu obiektu |
| $ownerData['object_fax'] | Fax obiektu |
| $ownerData['object_email'] | Adres e mail obiektu |
| $ownerData['object_gg'] | Numer Gadu-Gadu obiektu |
| $ownerData['object_skype'] | Adres Skype obiektu |
| $ownerData['geolocation_lat'] | Szerokość geograficzną obiektu |
| $ownerData['geolocation_lng'] | Długiść geograficzną obiektu |
| $ownerData['object_phone_2'] | Drugi numer telefonu do obiektu |
| $ownerData['reception_open_mode'] | Tryb w otwarcia recepcji lub odbioru kluczy |
| $ownerData['reception_open_hour'] | Godzina otwarcia recepcji lub rozpoczęcia odbioru kluczy |
| $ownerData['reception_close_hour'] | Godzina zamknięcia recepcji lub zakończenia odbioru kluczy |
| $ownerData['faviconPath'] | Adres do favicony |

 

### **$ownerData[languages]** - rezerwacje w języku

 

| **Zmienna** | **Opis** |
| --- | --- |
| $ownerData[languages][id] | Blok zmiennych dla dodatkowych informacji dla rezerwujących w języku |
| $ownerdata[languages][id]['reception_info'] | Dodatkowe informacje dla rezerwujących w języku |
| $ownerData['website'] | Adres strony obiektu |
| $ownerData['object_timezone'] | Strefa czasową obiektu |
| $ownerData['object_locale'] | Locale obiektu |
| $ownerData['logoPath'] | Adres do loga obiektu |
| $ownerData['wideLogoPath'] | Adres do szerokiego loga obiektu |

 

### **$socialMedia** - media społecznościowe

 

| **Zmienna** | **Opis** |
| --- | --- |
| $socialMedia['facebookCommentsPage'] | Określa czy komentarze Facebook mają być wyświetlane na stronie Facebook |
| $socialMedia['specialOffertsDescriptionPage'] | Określa czy komentarze Facebook mają być wyświetlane na stronie zestawu |
| $socialMedia['accommodationDescriptionPage'] | Określa czy komentarze Facebook mają być wyświetlane na stronie miejsca noclegowego |
| $socialMedia['descriptionPage'] | Określa czy komentarze Facebook mają być wyświetlane na stronie głównej |
| $socialMedia['contactPage'] | Określa czy komentarze Facebook mają być wyświetlane na stronie kontaktu |
| $socialMedia['newsPage'] | Określa czy komentarze Facebook mają być wyświetlane na stronie aktualności |
| $socialMedia['moderatorComments'] | Blok zmiennych dla identyfikatorów administratorów komentarzy Facebook |
| $socialMedia['moderatorComments'][userId] | Identyfikator administratora komentarzy Facebook |
| $socialMedia['facebookAppId'] | Identyfikator aplikacji Facebook |

 

### **Pozostałe zmienne**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $action | Nazwa akcji |
| $frontpageUrl | Adres strony głównej |
| $googleAnalyticsId | Identyfikator śledzenia Google |
| $googleAnalyticsSource | Skrypt dla Google Analytics |
| $mainColor | Wiodący kolor strony wizytówki |
| $path | Ścieżka do obecnej strony |
| $showCurrency | Określa czy pokazywać walutę |
| $showLogo | Określa czy pokazywać logo obiektu |
| $showSectionConfiguration | Określa czy pokazywać sekcję „Zestawy” |
| $showWideLogo | Określa czy pokazywać szerokie logo |
| $useGoogleAnalytics | Określa czy użyć Google Analytics |
| $sectionContactVisibility['visibility_company_description'] | Określa czy pokazywać dane firmy |
| $sectionContactVisibility['visibility_hotel'] | Określa czy pokazywać dane obiektu |
| $sectionContactVisibility['visibility_google_maps'] | Określa czy pokazywać mapę z lokalizacją obiektu |
| $button_light_src | Adres do obrazka Powered by IdoSell jasny |
| $button_src | Adres do obrazka Powered by IdoSell ciemny |
| $button_link | Adres strony /booking |
| $button_text | Tekst do obrazka Powered by IdoSell - IdoBooking - the best reservation management system |
| $allActiveOfferCategories | Lista aktywnych kategorii dostępnych w przedmiotach rezerwacji |
| $promotedOffers | Wyróżnione oferty |

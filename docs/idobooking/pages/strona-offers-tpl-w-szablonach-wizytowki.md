# Strona offers.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-offers-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-offers-tpl-w-szablonach-wizytowki.jpg).

### **$objects** - przedmioty rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $objects[item] | Blok zmiennych dla przedmiotu rezerwacji |
| $objects[item]['id'] | Identyfikator przedmiotu rezerwacji |
| $objects[item]['aggregated'] | Określa czy przedmiot rezerwacji została zaimportowany z innego panelu IdoBooking |
| $objects[item]['pkwiu'] | PKWiU przedmiotu rezerwacji |
| $objects[item]['object_type_id'] | Identyfikator typu przedmiotu rezerwacji |
| $objects[item]['type_name'] | Nazwa typu przedmiotu rezerwacji |
| $objects[item]['code_at_site'] | Kod przedmiotu rezerwacji wyświetlany na stronie wizytówce |
| $objects[item]['visible_at_site'] | Określa czy przedmiot rezerwacji jest widoczny na stronie wizytówki |
| $objects[item]['visible_at_external_services'] | Określa czy przedmiot rezerwacji jest widoczny na serwisach zewnętrznych |
| $objects[item]['priority'] | Priorytet przedmiotu rezerwacji |
| $objects[item]['vat'] | Stawka VAT przedmiotu rezerwacji |
| $objects[item]['currency_id'] | Identyfikator waluty przedmiotu rezerwacji |
| $objects[item]['active'] | Określa czy przedmiot rezerwacji jest aktywny |
| $objects[item]['capacity'] | Maksymalna pojemność przedmiotu rezerwacji |
| $objects[item]['roll_away_beds'] | Liczba dostawek przedmiotu rezerwacji |
| $objects[item]['name'] | Nazwa przedmiotu rezerwacji |

 

### **$objects[item]['descriptions']** - opisy przedmiotów rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $objects[item]['descriptions'][language] | Blok zmiennych dla opisów przedmiotów rezerwacji |
| $objects[item]['descriptions'][language]['object_id'] | Identyfikator przedmiotu rezerwacji w języku |
| $objects[item]['descriptions'][language]['language_id'] | Identyfikator języka opisu |
| $objects[item]['descriptions'][language]['name'] | Nazwa przedmiotu rezerwacji |
| $objects[item]['descriptions'][language]['short_description'] | Opis krótki przedmiotu rezerwacji |
| $objects[item]['descriptions'][language]['long_description'] | Opis długi przedmiotu rezerwacji |
| $objects[item]['descriptions'][language]['meta_title'] | Tytuł znacznika META przedmiotu rezerwacji |
| $objects[item]['descriptions'][language]['meta_description'] | Opis znacznika META przedmiotu rezerwacji |

 

### **$objects[item]['objectPicture'][picture]** - galeria przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $objects[item]['objectPicture'][picture]['url'] | Adres zdjęcia/filmu przedmiotu rezerwacji |
| $objects[item]['objectPicture'][picture]['type'] | Typ (picture lub video) przedmiotu rezerwacji |
| $objects[item]['objectPicture'][picture]['thumbnail'] | Miniatura dla typu video przedmiotu rezerwacji |
| $objects[item]['objectPicture'][picture]['miniature'] | Miniatura dla typu picture |

 

### **$specialOffers** - zestawy

 

| **Zmienna** | **Opis** |
| --- | --- |
| $specialOffers[offer] | Blok zmiennych dla zestawu |
| $specialOffers[offer]['id'] | Identyfikator zestawu |
| $specialOffers[offer]['name'] | Nazwa zestawu |
| $specialOffers[offer]['maxCapacity'] | Maksymalna pojemność zestawu |
| $specialOffers[offer]['shortDescription'] | Krótki opis zestawu |
| $specialOffers[offer]['pictures'][picture] | Blok zmiennych dla elementu galerii zestawu |
| $specialOffers[offer]['pictures'][picture]['miniature'] | Adres miniatury dla typu picture zestawu |
| $specialOffers[offer]['pictures'][picture]['url'] | Adres zdjęcia/filmu zestawu |
| $specialOffers[offer]['pictures'][picture]['type'] | Typ (picture lub video) zestawu |
| $specialOffers[offer]['pictures'][picture]['thumbnail'] | Adres miniatury dla typu video zestawu |
| $specialOffers[offer]['url'] | Link do zestawu |

 

### **Pozostałe zmienne**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['objectPrices']['priceMinInFormat’] | Minimalna cena przedmiotu rezerwacji, po której jest możliwy do rezerwacji w okresie najbliższych 3 miesięcy |
| $offerCategories | Lista kategorii przypisanych do poszczególnych przedmiotów rezerwacji |
| $objectsAndOffersWithPrioritys | Piorytety wyświetlania ofert |

# Strona offer.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-offer-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-offer-tpl-w-szablonach-wizytowki.jpg).

### **$object** - miejsca przedmiotów rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object[object_id]['id'] | Identyfikator przedmiotu rezerwacji |
| $object[object_id]['pkwiu'] | PKWIU przedmiotu rezerwacji |
| $object[object_id]['object_type_id'] | Identyfikator typu obiektu |
| $object[object_id]['visible_at_site'] | Określa czy obiekt jest widoczny na stronie wizytówce |
| $object[object_id]['priority'] | Priorytet przedmiotu rezerwacji |
| $object[object_id]['vat'] | VAT przedmiotu rezerwacji |
| $object[object_id]['currency_id'] | Identyfikator waluty przedmiotu rezerwacji |
| $object[object_id]['capacity'] | Maksymalna liczba osób dla przedmiotu rezerwacji |
| $object[object_id]['roll_away_beds'] | Liczba dostawek dla przedmiotu rezerwacji |
| $object[object_id]['name'] | Nazwa przedmiotu rezerwacji |

 

### **$object[object_id]['descriptions']** - opisy przedmiotów rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object[object_id]['descriptions'][id] | Opis przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['object_id'] | Identyfikator opisu przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['language_id'] | Identyfikator języka przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['name'] | Nazwa przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['short_description'] | Krótki opis przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['long_description'] | Długi opis przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['meta_title'] | Tytuł META dla przedmiotu rezerwacji |
| $object[object_id]['descriptions'][id]['meta_description'] | Opis META dla przedmiotu rezerwacji |

 

### **$object['freeAddons']** - lista dodatków wliczonych w cenę dla przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['freeAddons'][key]['name'] | Nazwa dodatku wliczonego w cenę |
| $object['freeAddons'][key]['price'] | Cena dodatku wliczonego w cenę |
| $object['freeAddons'][key]['txt_ChargePerDescription'] | Dodatkowy opis np. płatne za dobę |
| $object['freeAddons'][key]['selectionMode'] | 1- dodatek wielowartościowy, 0- dodatek jednowartościowy |
| $object['freeAddons'][key]['amenitiesToPresentation'] | Udogodnienia przypisane do dodatku. W przypadku dodatku jednowartościowego zwracana jest tablica nazw udogodnień. W przypadku dodatku wielowartościowego zwracana jest tablica, w której name - nazwa elementu wielowartościowego; amenities - tablica nazw udogodnień |

 

### **$object['afterArrival']** - lista dodatków płatnych po przyjeździe dla przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['afterArrival'][key]['name'] | Nazwa dodatku wliczonego w cenę |
| $object['afterArrival'][key]['price'] | Cena dodatku wliczonego w cenę |
| $object['afterArrival'][key]['txt_ChargePerDescription'] | Dodatkowy opis np. płatne za dobę |
| $object['afterArrival'][key]['selectionMode'] | 1- dodatek wielowartościowy, 0- dodatek jednowartościowy |
| $object['afterArrival'][key]['amenitiesToPresentation'] | Udogodnienia przypisane do dodatku. W przypadku dodatku jednowartościowego zwracana jest tablica nazw udogodnień. W przypadku dodatku wielowartościowego zwracana jest tablica, w której name - nazwa elementu wielowartościowego; amenities - tablica nazw udogodnień |

 

### **$object['widget']** - lista dodatków płatnych dodatkowo podczas rezerwacji dla przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['widget'][key]['name'] | Nazwa dodatku wliczonego w cenę |
| $object['widget'][key]['price'] | Cena dodatku wliczonego w cenę |
| $object['widget'][key]['txt_ChargePerDescription'] | Dodatkowy opis np. płatne za dobę |
| $object['widget'][key]['selectionMode'] | 1- dodatek wielowartościowy, 0- dodatek jednowartościowy |
| $object['widget'][key]['amenitiesToPresentation'] | Udogodnienia przypisane do dodatku. W przypadku dodatku jednowartościowego zwracana jest tablica nazw udogodnień. W przypadku dodatku wielowartościowego zwracana jest tablica, w której name - nazwa elementu wielowartościowego; amenities - tablica nazw udogodnień |

 

### **Udogodnienia w miejscu noclegowym**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['amenitiesInObject'] | Tablica udogodnień w miejscu noclegowym |
| $object['amenitiesInObject'][item]['name'] | Nazwa udogodnienia |
| $object['amenitiesInObjectCount'] | Liczba udogodnień w miejscu noclegowym |

 

### **Udogodnienia w lokalizacji**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['amenitiesInLocation'] | Tablica udogodnień w lokalizacji |
| $object['amenitiesInLocation'][item]['name'] | Nazwa udogodnienia w lokalizacji |
| $object['amenitiesInLocationCount'] | Liczba udogodnień w lokalizacji |

 

### **Sezony**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['seasons'][season_id]['id'] | Identyfikator sezonu w jakim przedmiot rezerwacji jest dostępny |
| $object['seasons'][season_id]['formatted_from'] | Sformatowana data rozpoczęcia sezonu dla przedmiotu rezerwacji |
| $object['seasons'][season_id]['formatted_to'] | Sformatowana data zakończenia sezonu dla przedmiotu rezerwacji |

 

### **$object['seasons'][item]['dateFrom']** - zmienne daty rozpoczęcia sezonu

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['seasons'][item]['dateFrom']['day'] | Dzień rozpoczęcia sezonu (od 1 do 31) |
| $object['seasons'][item]['dateFrom']['month'] | Miesiąc rozpoczęcia sezonu (od 1 do 12) |
| $object['seasons'][item]['dateFrom']['monthName'] | Nazwa miesiąca |
| $object['seasons'][item]['dateFrom']['monthName2'] | Nazwa miesiąca w dopełniaczu |
| $object['seasons'][item]['dateFrom']['monthShortName'] | Skrócony literał nazwy miesiąca |

 

### **$object['seasons'][item]['dateTo']** - zmienne dotyczące daty zakończenia sezonu

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['seasons'][item]['dateTo']['day'] | Dzień zakończenia sezonu (od 1 do 31) |
| $object['seasons'][item]['dateTo']['month'] | Miesiąc zakończenia sezonu (od 1 do 12) |
| $object['seasons'][item]['dateTo']['monthName'] | Nazwa miesiąca |
| $object['seasons'][item]['dateTo']['monthName2'] | Nazwa miesiąca w dopełniaczu |
| $object['seasons'][item]['dateTo']['monthShortName'] | Skrócony literał nazwy miesiąca |

 

### **Pozostałe zmienne**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $object['priceMinInFormat’] | Minimalna cena przedmiotu rezerwacji, po której jest możliwy do rezerwacji w okresie najbliższych 3 miesięcy |
| $object['objectFinalPricesPerDays’] | Cena przedmiotu rezerwacji |
| $offerCategoreis | Lista kategorii przypisanych do poszczególnych przedmiotów rezerwacji |

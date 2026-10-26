# Strona special-offer.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-special-offer-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-special-offer-tpl-w-szablonach-wizytowki.jpg).

### **$offer** - zestaw

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['id'] | Identyfikator zestawu |
| $offer['date_from'] | Data rozpoczęcia zestawu |
| $offer['date_to'] | Data zakończenia zestawu |
| $offer['vat'] | Stawka VAT zestawu |
| $offer['reservation_start_week_day'] | Dzień rozpoczęcia zestawu |
| $offer['visible_at_site'] | Zwraca czy zestaw jest widoczny na stronie wizytówce |
| $offer['priority'] | Priorytet zestawu |
| $offer['name'] | Nazwa zestawu |
| $offer['maxCapacity'] | Maksymalna ilość osób w rezerwacji |

 

### **$offer['pictures'][picture_id]** - galeria zestawu

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['pictures'][picture_id]['miniature'] | Miniatura elementu galerii zestawu |
| $offer['pictures'][picture_id]['url'] | Adres do elementu galerii zestawu |
| $offer['pictures'][picture_id]['type'] | Typ elementu galerii zestawu |
| $offer['pictures'][picture_id]['thumbnail'] | Miniatura dla elementu galerii typu video zestawu |

 

### **$offer['seasons']** - sezony z dostępnymi zestawami

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['seasons'][season_id]['id'] | Identyfikator sezonu w jakim zestaw jest dostępny |
| $offer['seasons'][season_id]['formatted_from'] | Sformatowana data rozpoczęcia sezonu w zestawie |
| $offer['seasons'][season_id]['formatted_to'] | Sformatowana data zakończenia sezonu w zestawie |

 

### **$offerObjects** - przedmioty rezerwacji w zestawie

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offerObjects[object_id]['id'] | Identyfikator przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['pkwiu'] | PKWIU przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['object_type_id'] | Identyfikator typu obiektu w zestawie |
| $offerObjects[object_id]['visible_at_site'] | Zwraca czy obiekt jest widoczny na stronie wizytówce |
| $offerObjects[object_id]['priority'] | Priorytet przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['vat'] | Stawka VAT przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['currency_id'] | Identyfikator waluty przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['capacity'] | Maksymalna ilość osób dla przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['roll_away_beds'] | Ilość dostawek dla przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['name'] | Nazwę przedmiotu rezerwacji w zestawie |

 

### **$offerObjects[object_id]['descriptions']** - opisy przedmiotów rezerwacji w zestawie

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offerObjects[object_id]['descriptions'][id] | Opis przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['object_id'] | Identyfikator opisu przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['language_id'] | Identyfikator języka przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['name'] | Nazwa przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['short_description'] | Krótki opis przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['long_description'] | Długi opis przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['meta_title'] | Tytuł META dla przedmiotu rezerwacji w zestawie |
| $offerObjects[object_id]['descriptions'][id]['meta_description'] | Opis META dla przedmiotu rezerwacji w zestawie |

 

### **$offer['freeAddons']** - lista dodatków wliczonych w cenę dla przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['freeAddons'][key]['name'] | Nazwa dodatku wliczonego w cenę |
| $offer['freeAddons'][key]['price'] | Cena dodatku wliczonego w cenę |
| $offer['freeAddons'][key]['txt_ChargePerDescription'] | Dodatkowy opis np. płatne za dobę |
| $offer['freeAddons'][key]['selectionMode'] | 1- dodatek wielowartościowy, 0- dodatek jednowartościowy |
| $offer['freeAddons'][key]['amenitiesToPresentation'] | Udogodnienia przypisane do dodatku. W przypadku dodatku jednowartościowego zwracana jest tablica nazw udogodnień. W przypadku dodatku wielowartościowego zwracana jest tablica, w której name - nazwa elementu wielowartościowego; amenities - tablica nazw udogodnień |

 

### **$offer['afterArrival']** - lista dodatków płatnych po przyjeździe dla przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['afterArrival'][key]['name'] | Nazwa dodatku wliczonego w cenę |
| $offer['afterArrival'][key]['price'] | Cena dodatku wliczonego w cenę |
| $offer['afterArrival'][key]['txt_ChargePerDescription'] | Dodatkowy opis np. płatne za dobę |
| $offer['afterArrival'][key]['selectionMode'] | 1- dodatek wielowartościowy, 0- dodatek jednowartościowy |
| $offer['afterArrival'][key]['amenitiesToPresentation'] | Udogodnienia przypisane do dodatku. W przypadku dodatku jednowartościowego zwracana jest tablica nazw udogodnień. W przypadku dodatku wielowartościowego zwracana jest tablica, w której name - nazwa elementu wielowartościowego; amenities - tablica nazw udogodnień |

 

### **$object['widget']** - lista dodatków płatnych dodatkowo podczas rezerwacji dla przedmiotu rezerwacji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['widget'][key]['name'] | Nazwa dodatku wliczonego w cenę |
| $offer['widget'][key]['price'] | Cena dodatku wliczonego w cenę |
| $offer['widget'][key]['txt_ChargePerDescription'] | Dodatkowy opis np. płatne za dobę |
| $offer['widget'][key]['selectionMode'] | 1- dodatek wielowartościowy, 0- dodatek jednowartościowy |
| $offer['widget'][key]['amenitiesToPresentation'] | Udogodnienia przypisane do dodatku. W przypadku dodatku jednowartościowego zwracana jest tablica nazw udogodnień. W przypadku dodatku wielowartościowego zwracana jest tablica, w której name - nazwa elementu wielowartościowego; amenities - tablica nazw udogodnień |

 

### **Pozostałe zmienne**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $offer['longDescription'] | Opis długi dla zestawu |
| $offer['addonsCount'] | Liczba dodatków zestawu |
| $offer['notFreeAddonsCount'] | Liczba płatnych dodatków zestawu |
| $offer['freeAddonsCount'] | Liczba darmowych dodatków zestawu |
| $offer['currencyId'] | Identyfikator waluty zestawu |
| $offer['priceMinInFormat’] | Minimalna cena zestawu, po której jest możliwy do rezerwacji w okresie najbliższych 3 miesięcy |
| $offer ['objectFinalPricesPerDays’] | Cena zestawu |

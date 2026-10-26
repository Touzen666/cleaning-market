# Strona promotions.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-promotions-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-promotions-tpl-w-szablonach-wizytowki.jpg).

### **$promotions** - Lista promocji

 

| **Zmienna** | **Opis** |
| --- | --- |
| $promotions[item]['objects_rebate_type'] | Typ rabatu. Możliwe wartości: value - kwotowy, percent - procentowy |
| $promotions[item]['id'] | Identyfikator promocji |
| $promotions[item]['addons_rebate'] | Procentowa wartość rabatu na dodatki |
| $promotions[item]['objects_rebate'] | Procentowa wartość rabatu na przedmioty rezerwacji |
| $promotions[item]['date_start'] | Data początku rezerwacji |
| $promotions[item]['date_to'] | Data końca rezerwacji |
| $promotions[item]['name'] | Nazwa promocji |
| $promotions[item]['short_description'] | Opis promocji |
| $promotions[item]['chosen_addons_ids'] | Identyfikatory dodatków, które zostały wybrane w promocji |
| $promotions[item]['show_advance_info'] | Wyświetlanie informacji o przedpłacie. Możliwe wartości: 1 - pokaż, 0 - nie wyświetlaj |
| $promotions[item]['show_stay_restriction_info'] | Wyświetlanie informacji o restrykcjach. Możliwe wartości: 1 - pokaż, 0 - nie wyświetlaj |
| $promotions[item]['priceMin'] | Niesformatowana cena minimalna, za którą można złożyć rezerwację w ramach promocji |
| $promotions[item]['priceMinInFormat'] | Sformatowana cena minimalna |
| $promotions[item]['icon'] | Adres grafiki promocji |

# Strona txt.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-txt-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-txt-tpl-w-szablonach-wizytowki.jpg).

### **$subPageOwnCode** - własny kod HTML/JavaScript dla podstrony

 

| **Zmienna** | **Opis** |
| --- | --- |
| $subPageOwnCode['head_code'] | Własny kod HTML/JavaScript - Sekcja Head |
| $subPageOwnCode['body_bottom_code'] | Własny kod HTML/JavaScript - Początek sekcji Body |
| $subPageOwnCode['body_top_code'] | Własny kod HTML/JavaScript - Koniec sekcji Body |

 

### **$gallery[item]** - elementy galerii podstrony

 

| **Zmienna** | **Opis** |
| --- | --- |
| $gallery[item]['url'] | Adres zdjęcia/filmu podstrony |
| $gallery[item]['miniature'] | Adres miniatury zdjęcia podstrony |
| $gallery[item]['type'] | Typ (picture lub video) podstrony |
| $gallery[item]['thumbnail'] | Miniaturę dla typu video podstrony |

 

### **$meta** - znaczniki META

 

| **Zmienna** | **Opis** |
| --- | --- |
| $meta['title'] | Tytuł znacznika META |
| $meta['description'] | Opis znacznika META |
| $meta['keywords'] | Słowa kluczowe podstrony |

 

### **Pozostałe zmienne**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $content | Treść podstrony |
| $content_sections | Sekcje opisu |
| $content_sections[]['type'] | Typ sekcji |
| $content_sections[]['text'] | Zawartość sekcji |
| $content_sections[]['src'] | Adres do zdjęcia/filmu |
| $content_sections[]['src2'] | Adres do drugiego zdjęcia |
| $title | Tytuł podstrony |

# Strona index.tpl w szablonach Wizytówki

Źródło: [iDoBooking](https://api.idobooking.com/pl/developers/szablony-wlasne-wizytowki-idobooking-w-smarty/lista-dostepnych-szablonow-wizytowki-w-smarty/strona-index-tpl-w-szablonach-wizytowki/)

Kopia: 24.10.2026. [Pełny zrzut](strona-index-tpl-w-szablonach-wizytowki.jpg).

### **$newsArray** - lista "Aktualności"

 

| **Zmienna** | **Opis** |
| --- | --- |
| $newsArray[item] | Blok zmiennych dla aktualności |
| $newsArray[item]['visible'] | Informacja czy aktualność jest widoczna |
| $newsArray[item]['url'] | Link do aktualności |
| $newsArray[item]['title'] | Tytuł aktualności |
| $newsArray[item]['content'] | Treść aktualności |
| $newsArray[item]['createDate'] | Data utworzenia aktualności |
| $newsArray[item]['content_sections'] | Sekcje opisu |
| $newsArray[item]['content_sections'][]['type'] | Typ sekcji |
| $newsArray[item]['content_sections'][]['text'] | Zawartość sekcji |
| $newsArray[item]['content_sections'][]['src'] | Adres do zdjęcia/filmu |
| $newsArray[item]['content_sections'][]['src2'] | Adres do drugiego zdjęcia |

 

### **$aboutPage** - podstawowe zmienne dla strony "O nas"

 

| **Zmienna** | **Opis** |
| --- | --- |
| $aboutPage['title'] | Tytuł strony "O nas” |
| $aboutPage['content'] | Treść strony "O nas" (Informacje o Twoim obiekcie) |
| $aboutPage['facebook_comments'] | Zwraca czy pokazać komentarze Facebook |
| $aboutPage['content_sections'] | Sekcje opisu |
| $aboutPage['content_sections'][]['type'] | Typ sekcji |
| $aboutPage['content_sections'][]['text'] | Zawartość sekcji |
| $aboutPage['content_sections'][]['src'] | Adres do zdjęcia/filmu |
| $aboutPage['content_sections'][]['src2'] | Adres do drugiego zdjęcia |

 

### **$gallery[item]** - elementy galerii strony wizytówki

 

| **Zmienna** | **Opis** |
| --- | --- |
| $gallery[item]['url'] | Adres zdjęcia (filmu) |
| $gallery[item]['miniature'] | Adres miniatury zdjęcia |
| $gallery[item]['type'] | Typ (picture lub video) |
| $gallery[item]['thumbnail'] | Miniatura dla typu video |

 

### **Pozostałe zmienne**

 

| **Zmienna** | **Opis** |
| --- | --- |
| $mainPage | Określa czy strona jest stroną główną |
| $headerName | Nagłówek strony wizytówki |

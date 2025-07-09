# 📧 Email Templates System

System modularnych template'ów emailowych dla aplikacji Złote Wynajmy.

## 🏗️ Struktura

```
src/lib/email/
├── components/
│   ├── index.ts              # Eksport komponentów
│   ├── base-template.ts      # Bazowy template z header/footer
│   └── ui-components.ts      # Komponenty UI (przyciski, boxy, listy)
├── templates/
│   ├── index.ts              # Eksport template'ów
│   ├── welcome-with-password.ts      # Email powitalny z hasłem
│   ├── welcome-without-password.ts   # Email powitalny bez hasła
│   └── monthly-report.ts     # Email z raportem miesięcznym
├── email-service.ts          # Serwis emailowy
└── README.md                 # Ta dokumentacja
```

## 🧩 Komponenty

### Base Template

- `createBaseTemplate()` - Bazowy template z header, footer i stylami
- Zawiera wspólne elementy: logo, gradienty, responsywność

### UI Components

- `createCTAButton(text, href)` - Przycisk call-to-action
- `createPasswordBox(password)` - Box z hasłem tymczasowym
- `createInfoBox(title, content)` - Niebieski box informacyjny
- `createFeaturesList(title, features[])` - Lista funkcji
- `createWelcomeText(ownerName, message)` - Tekst powitalny
- `createButtonSection(title, buttonText, buttonHref)` - Sekcja z przyciskiem

## 📝 Template'y

### Welcome Email z hasłem

```typescript
import { createWelcomeEmailWithPasswordTemplate } from "@/lib/email/templates";

const html = createWelcomeEmailWithPasswordTemplate(
  "Jan Kowalski",
  "TEMP123",
  "http://localhost:3000",
);
```

### Welcome Email bez hasła

```typescript
import { createWelcomeEmailWithoutPasswordTemplate } from "@/lib/email/templates";

const html = createWelcomeEmailWithoutPasswordTemplate(
  "Jan Kowalski",
  "http://localhost:3000",
);
```

### Monthly Report

```typescript
import { createMonthlyReportTemplate } from "@/lib/email/templates";

const html = createMonthlyReportTemplate({
  ownerName: "Jan Kowalski",
  month: "Styczeń",
  year: 2024,
  totalBookings: 15,
  totalRevenue: 12500,
  averageRating: 4.8,
  baseUrl: "http://localhost:3000",
});
```

## 🚀 Dodawanie nowych template'ów

1. **Stwórz nowy plik** w `templates/`
2. **Zaimportuj komponenty** z `../components`
3. **Użyj `createBaseTemplate`** jako bazę
4. **Dodaj eksport** w `templates/index.ts`

### Przykład nowego template'a:

```typescript
import {
  createBaseTemplate,
  createWelcomeText,
  createInfoBox,
  createButtonSection,
} from "../components";

export const createNewEmailTemplate = (data: any) => {
  const content = `
        ${createWelcomeText(data.name, "Wiadomość powitalna")}
        ${createInfoBox("Tytuł", "Treść")}
        ${createButtonSection("Akcja", "Kliknij", data.url)}
    `;

  return createBaseTemplate({
    title: "Tytuł emaila",
    content,
    baseUrl: data.baseUrl,
  });
};
```

## 🎨 Style

Wszystkie style są inline i responsywne:

- **Gradienty** - piękne przejścia kolorów
- **Box-shadow** - głębia i wymiar
- **Hover effects** - interaktywność
- **Mobile-first** - działa na wszystkich urządzeniach

## 🔧 Użycie w routerze

```typescript
import { sendEmail } from "@/lib/email/email-service";
import { createWelcomeEmailWithPasswordTemplate } from "@/lib/email/templates";

// W procedurze TRPC
const html = createWelcomeEmailWithPasswordTemplate(
  ownerName,
  password,
  baseUrl,
);
await sendEmail({
  to: owner.email,
  subject: "Witamy!",
  html: html,
});
```

## ✨ Korzyści

- **DRY Principle** - brak duplikacji kodu
- **Modularność** - łatwe dodawanie nowych template'ów
- **Konsystencja** - wspólny design system
- **Type Safety** - pełne wsparcie TypeScript
- **Maintainability** - łatwe utrzymanie i modyfikacje

# 🏢 Book Market — System Zarządzania Apartamentami

**Book Market** to aplikacja full‑stack do kompleksowego zarządzania krótkookresowym wynajmem apartamentów, zbudowana na stacku T3 (Next.js + tRPC + Prisma) z NextAuth, React Query, Tailwind CSS oraz PostgreSQL. Oferuje wielopoziomową autoryzację, automatyczne raporty finansowe, zarządzanie rezerwacjami, modularny system emaili oraz panele dla administratora, właściciela i gościa.

## 📋 **Główne Funkcjonalności**

### 🔐 **System Autoryzacji i Ról**

#### **Administrator (Discord OAuth)**

- **Wyłączny dostęp** dla głównego administratora (Bartosz) przez Discord OAuth
- **Weryfikacja email i nazwy użytkownika** - tylko autoryzowane konto może się zalogować
- **Pełny dostęp** do wszystkich funkcji administracyjnych
- **Zarządzanie właścicielami** z automatycznym wysyłaniem emaili powitalnych

#### **Właściciele Apartamentów**

- **System logowania email/hasło** z obsługą haseł tymczasowych
- **First-time setup** - ustawianie hasła przy pierwszym logowaniu
- **Zarządzanie sesjami** z bezpiecznym przechowywaniem w localStorage
- **Automatyczne przekierowania** po pomyślnym logowaniu
- **Otrzymywanie emaili powitalnych** z danymi dostępowymi

#### **Goście**

- **System check-in** z kartami meldunkowymi
- **Dostęp per apartament** z unikalnym slugiem
- **Walidacja dokumentów** (dowód, paszport, prawo jazdy)

### 🏠 **System Apartamentów i Właścicieli**

- **Baza apartamentów** z unikalnym systemem adresowania (slug)
- **Relacje właściciel-apartament** - jeden właściciel może mieć wiele apartamentów
- **Zarządzanie kontaktami** właścicieli (email, telefon, dane osobowe)
- **Status aktywności** właścicieli i apartamentów
- **Zarządzanie zdjęciami** apartamentów z systemem kolejności

### 📅 **System Rezerwacji**

- **Automatyczne pobieranie** rezerwacji z zewnętrznych platform (Booking.com, Airbnb, IdoBooking)
- **Statusy rezerwacji**: PENDING, CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT
- **Śledzenie źródeł** rezerwacji dla analityki prowizji
- **Zarządzanie gośćmi** z danymi kontaktowymi i liczbą osób
- **Kalendarze rezerwacji** z wizualnym przedstawieniem okresów
- **Import CSV** rezerwacji z zewnętrznych źródeł

### 📊 **System Raportów Miesięcznych**

#### **Automatyczne Generowanie**

- **Miesięczne raporty finansowe** dla każdego apartamentu i właściciela
- **Automatyczna kalkulacja** przychodów z rezerwacji w danym okresie
- **Integracja z systemem rezerwacji** - automatyczne dodawanie pozycji przychodowych

#### **Zarządzanie Kosztami**

- **Predefiniowane kategorie kosztów** z automatyczną kalkulacją VAT:
  - Sprzątanie (23% VAT)
  - Pranie pościeli (23% VAT)
  - Zakupy środków czystości (23% VAT)
  - Tekstylia i inne wydatki
- **Szybkie dodawanie kosztów** z interfejsem kwota netto → kwota brutto
- **Kategorie pozycji**: Przychody, Wydatki, Opłaty, Podatki, Prowizje

#### **System Prowizji**

- **Automatyczne sugerowanie prowizji** na podstawie przychodów z każdego kanału
- **Elastyczne stawki prowizji** z możliwością wprowadzenia procentu
- **Kalkulacja prowizji** od sumy przychodów z danego źródła

#### **Cykl Zatwierdzania**

- **Statusy raportów**: Szkic → Do przeglądu → Zatwierdzony → Wysłany
- **Kontrola dostępu** - blokada edycji po wysłaniu raportu
- **Historia zmian** statusów z timestampami

### 📧 **System Email Templates**

#### **Modularny System Template'ów**

- **Bazowy template** z wspólnym header/footer i stylami
- **Reużywalne komponenty UI** (przyciski, boxy, listy, formularze)
- **Responsywny design** z gradientami i animacjami
- **Type-safe** z pełnym wsparciem TypeScript

#### **Dostępne Template'y**

- **Welcome Email z hasłem** - dla nowych właścicieli z hasłem tymczasowym
- **Welcome Email bez hasła** - dla właścicieli z już ustawionym hasłem
- **Monthly Report Email** - raporty miesięczne z statystykami
- **Rozszerzalny system** - łatwe dodawanie nowych template'ów

#### **Komponenty UI**

- `createCTAButton()` - Przyciski call-to-action z hover effects
- `createPasswordBox()` - Box z hasłem tymczasowym (font Courier)
- `createInfoBox()` - Niebieski box informacyjny
- `createFeaturesList()` - Lista funkcji z ikonami
- `createWelcomeText()` - Tekst powitalny z personalizacją
- `createButtonSection()` - Sekcja z przyciskiem i opisem

#### **Konfiguracja SMTP**

- **Gmail SMTP** z app password authentication
- **Ethereal Email** dla testów w development
- **Automatyczne wykrywanie** konfiguracji środowiskowej
- **Załączniki** z logo firmy w emailach

### 🎛 **Panel Administracyjny**

#### **Zarządzanie Właścicielami**

- **Lista wszystkich właścicieli** z danymi kontaktowymi
- **Dodawanie nowych właścicieli** z automatycznym generowaniem haseł tymczasowych
- **Przypisywanie apartamentów** do właścicieli
- **Zarządzanie statusami** (aktywny/nieaktywny)
- **Wysyłanie emaili powitalnych** z danymi dostępowymi

#### **Zarządzanie Raportami**

- **Przegląd wszystkich raportów** z filtrowaniem i sortowaniem
- **Tworzenie nowych raportów** z wyborem miesiąca, roku i właściciela
- **Szczegółowy widok raportu** z możliwością edycji pozycji
- **Zarządzanie statusami** raportów w cyklu zatwierdzania

#### **Zarządzanie Rezerwacjami**

- **Centralny przegląd** wszystkich rezerwacji w systemie
- **Filtry po apartamentach** i okresach
- **Status tracking** ze szczegółami płatności
- **Import CSV** rezerwacji z zewnętrznych źródeł

#### **Testowanie Emaili**

- **Test email** w trybie development
- **Walidacja konfiguracji SMTP** z jasnymi komunikatami błędów
- **Logowanie szczegółów** wysyłania emaili

### 🏡 **Panel Właściciela Apartamentu**

#### **Dashboard z Metrykami**

- **Statystyki w czasie rzeczywistym**:
  - Liczba posiadanych apartamentów
  - Liczba aktywnych rezerwacji
  - Przychód w bieżącym miesiącu
- **Wizualna prezentacja danych** z kolorowymi kartami statystyk

#### **Zarządzanie Apartamentami**

- **Lista posiadanych apartamentów** z podstawowymi informacjami
- **Kalendarz rezerwacji** dla każdego apartamentu z 30-dniowym widokiem
- **Statusy rezerwacji** z kolorowym kodowaniem:
  - Niebieska: Potwierdzona
  - Zielona z pulsem: Zameldowany (aktywny pobyt)
  - Szara z checkmarkiem: Wymeldowany
  - Żółta: Oczekująca
  - Czerwona: Anulowana

#### **Dostęp do Raportów**

- **Przeglądanie zatwierdzonych raportów** miesięcznych
- **Szczegółowy widok finansów** z podziałem na przychody i koszty
- **Historia raportów** z możliwością filtrowania

### 🆔 **System Check-in Gości**

- **Cyfrowe karty meldunkowe** z pełną walidacją danych osobowych
- **Automatyczne powiązanie** z aktywnymi rezerwacjami
- **Ochrona przed duplikatami** - jedna karta na apartament na dzień
- **Zbieranie danych**: imię, nazwisko, data urodzenia, narodowość, adres
- **Obsługa dokumentów**: dowód osobisty, paszport, prawo jazdy

### 📞 **System Kontaktowy**

- **Formularz kontaktowy** z walidacją tRPC i Zod
- **Przechowywanie wiadomości** w bazie danych
- **Panel administratora** do przeglądania zapytań

### 📥 **Import Danych**

- **Import CSV rezerwacji** z zewnętrznych platform
- **Walidacja danych** z obsługą polskich znaków
- **Automatyczne mapowanie** kolumn CSV na pola systemu
- **Bulk operations** dla masowego importu danych

## 🛠 **Stack Technologiczny**

### **Frontend & UI**

- **Next.js 15** (App Router) — SSR/SSG
- **TypeScript** - Statyczne typowanie
- **Tailwind CSS** - Utility-first styling
- **React 18** - Biblioteka UI z Concurrent Features
- **Geist Font** - Nowoczesna typografia

### **Backend & API**

- **tRPC v11** — End‑to‑end typesafe APIs (T3App)
- **Zod** - Runtime schema validation i type inference
- **Next.js API Routes** - Serverless functions
- **NextAuth.js v5** - Autoryzacja i zarządzanie sesjami
- **Discord OAuth Provider** - Autoryzacja administratora

### **Baza Danych & ORM**

- **PostgreSQL** — relacyjna baza danych
- **Prisma ORM** - Type-safe database toolkit z automatyczną generacją typów
- **Database sessions** - Persistent session storage
- **Automatyczne migracje** - Schema versioning

### **Email System**

- **Nodemailer** — wysyłanie emaili
- **Gmail SMTP** - Produkcyjny serwer SMTP
- **Ethereal Email** - Testowy serwer SMTP dla development
- **Modularne template'y** - System komponentów email
- **Responsywny design** - Emails działają na wszystkich urządzeniach

### **Security & Validation**

- **Node.js Crypto** — hash haseł (SHA‑256)
- **NextAuth.js callbacks** - Custom authorization logic
- **Zod schemas** - Input validation na wszystkich poziomach
- **Middleware protection** - Route-level authorization

### **DevOps & Development**

- **Docker Compose** — lokalna baza danych
- **ESLint + Prettier** - Code quality i formatowanie
- **TypeScript Compiler** - Static analysis
- **Hot Reload** - Development experience
- **T3App** - Type-safe full-stack framework

## 🏗 **Architektura Aplikacji**

```
src/
├── app/                           # 📄 Next.js App Router
│   ├── page.tsx                  # 🏠 Strona główna z loginem
│   ├── login/                    # 🔐 Discord OAuth dla adminów
│   ├── admin/                    # 👨‍💼 Panel Administracyjny
│   │   ├── owners/               # Zarządzanie właścicielami
│   │   ├── reports/              # System raportów miesięcznych
│   │   │   ├── [reportId]/       # Szczegóły raportu
│   │   │   └── create/           # Tworzenie nowego raportu
│   │   └── reservations/         # Przegląd rezerwacji
│   ├── apartamentsOwner/         # 🏡 Panel Właściciela
│   │   ├── login/                # Logowanie właścicieli
│   │   ├── setup-password/       # Ustawianie hasła (first-time)
│   │   ├── dashboard/            # Dashboard z metrykami
│   │   └── reports/              # Dostęp do raportów
│   ├── apartments/               # 🏢 Lista apartamentów (chronione)
│   ├── check-in-card/            # 🆔 Karty meldunkowe gości
│   │   └── [apartmentSlug]/      # Check-in dla konkretnego apartamentu
│   ├── guest-login/              # 👤 Logowanie gości
│   ├── guest-dashboard/          # 📊 Panel gościa
│   └── api/                      # 🔧 API Endpoints (Next.js routes)
│       ├── auth/[...nextauth]/   # NextAuth.js handlers
│       ├── trpc/[trpc]/          # tRPC router endpoint
│       └── version/              # Version info API (NEXT_PUBLIC_* z build script)
├── server/                       # 🔧 Backend Logic
│   ├── api/                      # tRPC Configuration
│   │   ├── root.ts               # Main tRPC router
│   │   ├── trpc.ts               # tRPC setup z middleware
│   │   └── routers/              # API Endpoints
│   │       ├── apartment-owners.ts    # Zarządzanie właścicielami
│   │       ├── owner-auth.ts           # Autoryzacja właścicieli
│   │       ├── monthly-reports.ts      # System raportów
│   │       ├── reservations.ts         # Zarządzanie rezerwacjami
│   │       ├── apartments.ts           # API apartamentów
│   │       ├── guest-auth.ts           # Autoryzacja gości
│   │       ├── guest-checkin.ts        # Check-in gości
│   │       ├── contact.router.ts       # Formularz kontaktowy
│   │       ├── csv-import.ts           # Import CSV rezerwacji
│   │       └── email.ts                # System email templates
│   ├── auth/                     # 🔐 NextAuth Configuration
│   │   ├── config.ts             # NextAuth setup z callbackami
│   │   └── index.ts              # Auth exports
│   └── db.ts                     # Prisma Client instance
├── lib/                          # 🛠 Utilities & Validations
│   ├── email/                    # 📧 Email Templates System
│   │   ├── components/           # Reużywalne komponenty email
│   │   │   ├── base-template.ts  # Bazowy template z header/footer
│   │   │   ├── ui-components.ts  # Komponenty UI (przyciski, boxy)
│   │   │   └── index.ts          # Eksport komponentów
│   │   ├── templates/            # Email templates
│   │   │   ├── welcome-with-password.ts
│   │   │   ├── welcome-without-password.ts
│   │   │   ├── monthly-report.ts
│   │   │   └── index.ts          # Eksport template'ów
│   │   ├── email-service.ts      # Serwis emailowy
│   │   └── README.md             # Dokumentacja systemu email
│   ├── validations/              # Zod schemas
│   │   └── guest.ts              # Walidacja danych gościa
│   ├── types.ts                  # Wspólne typy TypeScript
│   ├── vat.ts                    # Kalkulacje VAT
│   └── cron.ts                   # Zadania cykliczne
├── components/                   # 🧩 Reusable Components
│   ├── ApartmentImageManager.tsx # Zarządzanie zdjęciami apartamentów
│   ├── ApartmentList.tsx         # Lista apartamentów
│   ├── CsvImport.tsx             # Komponent importu CSV
│   ├── ReservationList.tsx       # Lista rezerwacji
│   └── ui/                       # UI Components
│       └── Modal.tsx             # Modal dialog
├── styles/                       # 🎨 Global Styles
└── trpc/                         # 📡 tRPC Client Setup (React Query + RSC)
    ├── react.tsx                 # React Query integration
    ├── server.ts                 # Server-side tRPC client
    └── query-client.ts           # React Query configuration
```

## 🚀 **Uruchomienie Projektu**

### **Wymagania**

- Node.js 18+
- PostgreSQL 14+
- npm/yarn/pnpm
- Discord OAuth App (dla autoryzacji administratora)
- Gmail account z app password (dla emaili)

### **Instalacja**

```bash
# Klonowanie repozytorium
git clone <repository-url>
cd book-market

# Instalacja zależności
npm install

# Konfiguracja zmiennych środowiskowych
cp .env.example .env
```

### **Konfiguracja Environment Variables**

Projekt używa `@t3-oss/env-nextjs` do walidacji env (zob. `src/env.js`). Poniżej przykładowy zestaw zmiennych. Dodatkowo podczas build/dev uruchamiany jest skrypt `scripts/update-version.js`, który aktualizuje `NEXT_PUBLIC_APP_VERSION` oraz `NEXT_PUBLIC_BUILD_TIME` w `.env.local`.

```env
## Database
DATABASE_URL="postgresql://user:password@localhost:5432/book_market"
DIRECT_URL="postgresql://user:password@localhost:5432/book_market"

## NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

## Discord OAuth (dla autoryzacji administratora)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

## Admin Configuration
ADMIN_EMAIL="ochedowski.bartosz@gmail.com"
# Dodatkowi administratorzy (hardcoded w kodzie):
# - biuro@zlote-wynajmy.com
# - koordynatorzy@zlote-wynajmy.com

## SMTP Configuration (Gmail)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_FROM_USER="your-send-as-email@gmail.com" # opcjonalne nadpisanie From
SMTP_PASS="your-app-password"
EMAIL_PROVIDER="smtp" # lub "ethereal"

## Development (opcjonalne)
ETHEREAL_USER="test@ethereal.email"
ETHEREAL_PASS="test123"

## Vercel Blob (upload obrazów)
BLOB_READ_WRITE_TOKEN="vercel-blob-token"

## CRON (opcjonalnie, gdy włączysz autoryzację)
CRON_SECRET="some-secret"
```

### **Baza danych (Docker/Prisma)**

```bash
# Uruchom lokalną bazę PostgreSQL
docker-compose up -d

# Generowanie Prisma Client
npm run db:generate

# Synchronizacja schematu z bazą danych
npm run db:push

# (Opcjonalnie) Prisma Studio
npm run db:studio
```

### **Development**

```bash
# Uruchomienie w trybie deweloperskim (aktualizuje wersję i build time)
npm run dev

# Aplikacja dostępna na http://localhost:3000
```

## 🗄 **Zarządzanie Bazą Danych**

### **Struktura Bazy Danych**

#### **Główne Tabele**

- **Users** - Użytkownicy systemu (admini)
- **ApartmentOwner** - Właściciele apartamentów
- **Apartment** - Apartamenty
- **ApartmentOwnership** - Relacja wiele-do-wielu (właściciel ↔ apartament)
- **Reservation** - Rezerwacje
- **MonthlyReport** - Raporty miesięczne
- **ReportItem** - Pozycje w raportach (przychody, koszty, prowizje)
- **CheckInCard** - Karty meldunkowe gości
- **Contact** - Wiadomości kontaktowe
- **LeadApplication** - Zgłoszenia leadów

#### **Relacje**

- **ApartmentOwner** → **ApartmentOwnership** ← **Apartment** (many-to-many)
- **Apartment** → **Reservation** (one-to-many)
- **ApartmentOwner** → **MonthlyReport** (one-to-many)
- **MonthlyReport** → **ReportItem** (one-to-many)
- **Reservation** → **ReportItem** (one-to-one dla przychodów)

### **Ważne komendy Prisma**

```bash
# Sync schema bez migracji (szybkie zmiany)
npx prisma db push

# Generowanie nowej migracji
npx prisma migrate dev --name nazwa-migracji

# Reset bazy danych (usuwa wszystkie dane!)
npx prisma migrate reset

# Prisma Studio (GUI)
npx prisma studio
```

### **Seed Data**

```bash
# Wykonanie seed script (jeśli dostępny)
npx prisma db seed
```

## 📱 **Użytkowanie Systemu**

### **Flow Administratora**

1. **Logowanie** przez Discord OAuth (tylko autoryzowane konto Bartosz)
2. **Dodawanie właścicieli** apartamentów z automatyczną generacją haseł tymczasowych
3. **Wysyłanie emaili powitalnych** z danymi dostępowymi
4. **Przypisywanie apartamentów** do właścicieli
5. **Import rezerwacji** z plików CSV
6. **Tworzenie raportów miesięcznych** z automatycznym pobieraniem rezerwacji
7. **Zarządzanie cyklem zatwierdzania** raportów
8. **Monitorowanie wszystkich rezerwacji** w systemie

### **Flow Właściciela Apartamentu**

1. **Otrzymanie emaila powitalnego** z danymi dostępowymi
2. **Pierwsze logowanie** z hasłem tymczasowym otrzymanym od administratora
3. **Ustawienie bezpiecznego hasła** podczas pierwszego logowania
4. **Przegląd dashboardu** z aktualnymi statystykami przychodów i rezerwacji
5. **Kalendarz rezerwacji** z wizualnym statusem każdej rezerwacji
6. **Dostęp do zatwierdzonych raportów** miesięcznych z szczegółami finansowymi
7. **Monitorowanie swoich apartamentów** i aktywnych pobytów

### **Flow Gościa**

1. **Dostęp do formularza check-in** przez link z unikalnym slugiem apartamentu
2. **Wypełnienie karty meldunkowej** z danymi osobowymi i dokumentu
3. **Automatyczne powiązanie** z aktywną rezerwacją w systemie
4. **Potwierdzenie check-in** i rozpoczęcie pobytu

## 📧 **System Email Templates**

### **Struktura Systemu**

```
src/lib/email/
├── components/
│   ├── base-template.ts      # Wspólny header/footer/styl
│   ├── ui-components.ts      # Reużywalne komponenty UI
│   └── index.ts              # Eksport komponentów
├── templates/
│   ├── welcome-with-password.ts
│   ├── welcome-without-password.ts
│   ├── monthly-report.ts     # Przykład nowego template'a
│   └── index.ts              # Eksport template'ów
├── email-service.ts          # Serwis emailowy
└── README.md                 # Dokumentacja
```

### **Dodawanie Nowych Template'ów**

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

### **Konfiguracja SMTP**

1. **Gmail Setup**:

   - Włącz 2FA na koncie Gmail
   - Wygeneruj "App Password" w ustawieniach Google Account
   - Użyj app password w `SMTP_PASS`

2. **Environment Variables**:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_FROM_USER="your-send-as-email@gmail.com" # Opcjonalnie, do wysyłania z innego adresu
   SMTP_PASS="your-app-password"
   ```

## 🔒 **Bezpieczeństwo**

- **RBAC w tRPC** — `protectedProcedure`, `adminProcedure`
- **Discord OAuth** — dodatkowa weryfikacja email + nazwy „Bartosz” w callbacku
- **Hash haseł** właścicieli (SHA‑256)
- **Session management** — sesje w bazie (NextAuth `strategy: database`)
- **Input validation** — Zod na wejściu, centralny `errorFormatter`
- **CSRF** — NextAuth
- **Type safety** — TypeScript + tRPC + Prisma
- **SMTP security** — app passwords (Gmail) lub Ethereal w dev

## 🚀 **Roadmap i Rozwój**

### **Planowane Funkcjonalności**

- **Integracja API** z Booking.com i Airbnb dla automatycznej synchronizacji
- **System płatności** z automatycznym rozliczaniem prowizji
- **Powiadomienia email** o nowych rezerwacjach i statusach raportów
- **Mobile app** dla właścicieli apartamentów
- **Analytics dashboard** z zaawansowanymi metrykami biznesowymi
- **Multi-currency support** dla międzynarodowych rezerwacji
- **Automated cleaning schedules** z integracją z kalendarzem rezerwacji
- **Advanced email templates** z personalizacją i A/B testing
- **Real-time notifications** (WebSocket/Server-Sent Events)

### **Optymalizacje Techniczne**

- **Redis caching** dla poprawy wydajności
- **Background jobs** dla heavy operations
- **Advanced search** z full-text search capabilities
- **API rate limiting** i advanced security measures
- **Email queue system** dla niezawodnego wysyłania
- **Template preview** w panelu administracyjnym

## 📊 **Statystyki Projektu**

- **~15,000 linii kodu** TypeScript
- **20+ komponentów React**
- **15+ tRPC routerów**
- **8 głównych tabel** w bazie danych
- **3 typy użytkowników** z różnymi uprawnieniami
- **Modularny system email** z 6+ komponentów UI
- **100% type safety** z TypeScript i tRPC

---

## 🔌 API i Integracje

- **tRPC (src/server/api/routers/...)**: główne routery: `adminDashboard`, `apartment-owners`, `apartments`, `check-in`, `contact`, `csv-import`, `email`, `guest-auth`, `guest-checkin`, `idobooking`, `lead-application`, `monthly-reports`, `owner-auth`, `owner-notes`, `post`, `reservations`.
- **Next.js API routes**:
  - `GET /api/version` — metadane wersji (`NEXT_PUBLIC_APP_VERSION`, `NEXT_PUBLIC_BUILD_TIME`)
  - `GET /api/cron/sync-reservations` — ręczna synchronizacja IdoBooking (opcjonalne zabezpieczenie `CRON_SECRET`)
  - `POST /api/upload?filename=...` — upload pliku do Vercel Blob
  - `POST /api/upload-profile-image` — upload obrazów profilowych do Vercel Blob (walidacja typu/rozmiaru)

## 🔐 Middleware i Auth

- `middleware.ts`:
  - Chroni: `/apartments/:path*`, `/admin/:path*`
  - Specjalna obsługa gości: `/guest-dashboard/:slug` sprawdza cookie `guest-session` i w razie braku przekierowuje do `/guest-login/:slug`
- NextAuth v5 (`src/server/auth/config.ts` i `src/app/api/auth/[...nextauth]/route.ts`):
  - Provider: Discord
  - Administratorzy: `ADMIN_EMAIL` (wymaga nazwy "Bartosz") + `biuro@zlote-wynajmy.com` + `koordynatorzy@zlote-wynajmy.com`
  - Sesje w bazie (`strategy: database`)

## 🧪 Testy

- Uruchamianie: `npm test` lub `npm test -- --ui` (Vitest)
- Konfiguracja: `vitest.config.ts` (alias `@` → `./src`)
- Dodatkowa dokumentacja i przykłady: zob. `README-testy.md`

## 🖼️ Avatary profilowe

- Funkcjonalność opisana w `README-avatars.md` (upload do Vercel Blob, wybór predefiniowanych avatarów, spójność z panelem admina)

## 📦 Skrypty npm (wybrane)

- `dev`: uruchamia Next.js z turbo oraz aktualizuje numer wersji i build time
- `build`: aktualizacja wersji + kompilacja
- `preview`: produkcyjne uruchomienie lokalne
- `db:*`: komendy Prisma (`generate`, `migrate`, `push`, `studio`, `seed`)
- `test`, `test:ui`: Vitest
- `format:*`, `lint:*`, `typecheck`

## 🖼️ Konfiguracja obrazów (Next.js)

- Zdalne obrazy konfigurowane w `next.config.js` (`images.remotePatterns`) — konieczne dla plików hostowanych w Vercel Blob.

## 🧭 Wskazówki wdrożeniowe

- Ustaw `NEXT_PUBLIC_APP_URL` w env zgodnie z `NEXTAUTH_URL` (walidowane przez `src/env.js`)
- Skonfiguruj Vercel Blob i ustaw `BLOB_READ_WRITE_TOKEN`
- Zmień domyślne dane w `docker-compose.yml` na bezpieczne w środowiskach zewnętrznych

---

**Book Market** to kompleksowe rozwiązanie dla zarządzania krótkookresowym wynajmem, łączące nowoczesne technologie z intuicyjnym interfejsem użytkownika. System zapewnia pełną kontrolę nad procesami biznesowymi, automatyzuje rutynowe zadania, dostarcza szczegółowych analiz finansowych oraz oferuje profesjonalny system komunikacji email z właścicielami apartamentów.

**Technologie:** Next.js 15, TypeScript, tRPC, Prisma, PostgreSQL, Tailwind CSS, NextAuth.js, Nodemailer, T3App Stack

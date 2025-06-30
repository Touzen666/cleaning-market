# 🏢 Book Market - System Zarządzania Apartamentami

**Book Market** to zaawansowana aplikacja full-stack do kompleksowego zarządzania krótkookresowym wynajmem apartamentów. System oferuje wielopoziomową autoryzację, automatyczne generowanie raportów finansowych, zarządzanie rezerwacjami oraz intuicyjne dashboardy dla różnych typów użytkowników.

## 📋 **Główne Funkcjonalności**

### 🔐 **System Autoryzacji i Ról**

#### **Administrator (Discord OAuth)**

- **Wyłączny dostęp** dla głównego administratora (Bartosz) przez Discord OAuth
- **Weryfikacja email i nazwy użytkownika** - tylko autoryzowane konto może się zalogować
- **Pełny dostęp** do wszystkich funkcji administracyjnych

#### **Właściciele Apartamentów**

- **System logowania email/hasło** z obsługą haseł tymczasowych
- **First-time setup** - ustawianie hasła przy pierwszym logowaniu
- **Zarządzanie sesjami** z bezpiecznym przechowywaniem w localStorage
- **Automatyczne przekierowania** po pomyślnym logowaniu

#### **Goście**

- **System check-in** z kartami meldunkowymi
- **Dostęp per apartament** z unikalnym slugiem
- **Walidacja dokumentów** (dowód, paszport, prawo jazdy)

### 🏠 **System Apartamentów i Właścicieli**

- **Baza apartamentów** z unikalnym systemem adresowania (slug)
- **Relacje właściciel-apartament** - jeden właściciel może mieć wiele apartamentów
- **Zarządzanie kontaktami** właścicieli (email, telefon, dane osobowe)
- **Status aktywności** właścicieli i apartamentów

### 📅 **System Rezerwacji**

- **Automatyczne pobieranie** rezerwacji z zewnętrznych platform (Booking.com, Airbnb, IdoBooking)
- **Statusy rezerwacji**: PENDING, CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT
- **Śledzenie źródeł** rezerwacji dla analityki prowizji
- **Zarządzanie gośćmi** z danymi kontaktowymi i liczbą osób
- **Kalendarze rezerwacji** z wizualnym przedstawieniem okresów

### 📊 **System Raportów Miesięcznych**

#### **Automatyczne Generowanie**

- **Miesięczne raporty finansowe** dla każdego apartamentu i właściciela
- **Automatyczna kalkulacja** przychodów z rezerwacji w danym okresie
- **Integracja z systemem rezerwacji** - automatyczne dodawanie pozycji przychodowych

#### **Zarządzanie Kosztami**

- **Predefiniowane kategorie kosztów** z automatyczną kalkulacją VAT:
  - Sprzątanie (23% VAT)
  - Pranie pościeli (8% VAT)
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

### 🎛 **Panel Administracyjny**

#### **Zarządzanie Właścicielami**

- **Lista wszystkich właścicieli** z danymi kontaktowymi
- **Dodawanie nowych właścicieli** z automatycznym generowaniem haseł tymczasowych
- **Przypisywanie apartamentów** do właścicieli
- **Zarządzanie statusami** (aktywny/nieaktywny)

#### **Zarządzanie Raportami**

- **Przegląd wszystkich raportów** z filtrowaniem i sortowaniem
- **Tworzenie nowych raportów** z wyborem miesiąca, roku i właściciela
- **Szczegółowy widok raportu** z możliwością edycji pozycji
- **Zarządzanie statusami** raportów w cyklu zatwierdzania

#### **Zarządzanie Rezerwacjami**

- **Centralny przegląd** wszystkich rezerwacji w systemie
- **Filtry po apartamentach** i okresach
- **Status tracking** ze szczegółami płatności

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

## 🛠 **Stack Technologiczny**

### **Frontend & UI**

- **Next.js 15** (App Router) - React framework z SSR/SSG
- **TypeScript** - Statyczne typowanie
- **Tailwind CSS** - Utility-first styling
- **React 18** - Biblioteka UI z Concurrent Features
- **Geist Font** - Nowoczesna typografia

### **Backend & API**

- **tRPC v11** - End-to-end typesafe APIs z automatyczną inferencją typów
- **Zod** - Runtime schema validation i type inference
- **Next.js API Routes** - Serverless functions
- **NextAuth.js v5** - Autoryzacja i zarządzanie sesjami
- **Discord OAuth Provider** - Autoryzacja administratora

### **Baza Danych & ORM**

- **PostgreSQL** - Relacyjna baza danych
- **Prisma ORM** - Type-safe database toolkit z automatyczną generacją typów
- **Database sessions** - Persistent session storage
- **Automatyczne migracje** - Schema versioning

### **Security & Validation**

- **Node.js Crypto** - Hashowanie haseł (SHA-256)
- **NextAuth.js callbacks** - Custom authorization logic
- **Zod schemas** - Input validation na wszystkich poziomach
- **Middleware protection** - Route-level authorization

### **DevOps & Development**

- **Docker Compose** - Lokalna baza danych
- **ESLint + Prettier** - Code quality i formatowanie
- **TypeScript Compiler** - Static analysis
- **Hot Reload** - Development experience

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
│   └── api/                      # 🔧 API Endpoints
│       ├── auth/[...nextauth]/   # NextAuth.js handlers
│       ├── trpc/[trpc]/          # tRPC router endpoint
│       └── version/              # Version info API
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
│   │       └── contact.router.ts       # Formularz kontaktowy
│   ├── auth/                     # 🔐 NextAuth Configuration
│   │   ├── config.ts             # NextAuth setup z callbackami
│   │   └── index.ts              # Auth exports
│   └── db.ts                     # Prisma Client instance
├── lib/                          # 🛠 Utilities & Validations
│   └── validations/              # Zod schemas
│       └── guest.ts              # Walidacja danych gościa
├── components/                   # 🧩 Reusable Components
├── styles/                       # 🎨 Global Styles
└── trpc/                         # 📡 tRPC Client Setup
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

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/book_market"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Discord OAuth (dla autoryzacji administratora)
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"

# Admin Configuration
ADMIN_EMAIL="ochedowski.bartosz@gmail.com"
```

### **Konfiguracja Bazy Danych**

```bash
# Uruchomienie PostgreSQL (Docker)
docker-compose up -d

# Generowanie Prisma Client
npm run db:generate

# Sync schema z bazą danych
npm run db:push

# (Opcjonalnie) Prisma Studio - GUI dla bazy danych
npm run db:studio
```

### **Development**

```bash
# Uruchomienie w trybie deweloperskim
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

#### **Relacje**

- **ApartmentOwner** → **ApartmentOwnership** ← **Apartment** (many-to-many)
- **Apartment** → **Reservation** (one-to-many)
- **ApartmentOwner** → **MonthlyReport** (one-to-many)
- **MonthlyReport** → **ReportItem** (one-to-many)
- **Reservation** → **ReportItem** (one-to-one dla przychodów)

### **Ważne Komendy Prisma**

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
3. **Przypisywanie apartamentów** do właścicieli
4. **Tworzenie raportów miesięcznych** z automatycznym pobieraniem rezerwacji
5. **Zarządzanie cyklem zatwierdzania** raportów
6. **Monitorowanie wszystkich rezerwacji** w systemie

### **Flow Właściciela Apartamentu**

1. **Pierwsze logowanie** z hasłem tymczasowym otrzymanym od administratora
2. **Ustawienie bezpiecznego hasła** podczas pierwszego logowania
3. **Przegląd dashboardu** z aktualnymi statystykami przychodów i rezerwacji
4. **Kalendarz rezerwacji** z wizualnym statusem każdej rezerwacji
5. **Dostęp do zatwierdzonych raportów** miesięcznych z szczegółami finansowymi
6. **Monitorowanie swoich apartamentów** i aktywnych pobytów

### **Flow Gościa**

1. **Dostęp do formularza check-in** przez link z unikalnym slugiem apartamentu
2. **Wypełnienie karty meldunkowej** z danymi osobowymi i dokumentu
3. **Automatyczne powiązanie** z aktywną rezerwacją w systemie
4. **Potwierdzenie check-in** i rozpoczęcie pobytu

## 🔒 **Bezpieczeństwo**

- **Role-based access control** z walidacją na poziomie API
- **Discord OAuth** z weryfikacją email i nazwy użytkownika
- **Hashowanie haseł** właścicieli (SHA-256)
- **Session management** z bezpiecznym przechowywaniem tokenów
- **Input validation** na wszystkich poziomach (Zod schemas)
- **CSRF protection** przez NextAuth.js
- **Type safety** na całej długości aplikacji (TypeScript + tRPC)

## 🚀 **Roadmap i Rozwój**

### **Planowane Funkcjonalności**

- **Integracja API** z Booking.com i Airbnb dla automatycznej synchronizacji
- **System płatności** z automatycznym rozliczaniem prowizji
- **Powiadomienia email** o nowych rezerwacjach i statusach raportów
- **Mobile app** dla właścicieli apartamentów
- **Analytics dashboard** z zaawansowanymi metrykami biznesowymi
- **Multi-currency support** dla międzynarodowych rezerwacji
- **Automated cleaning schedules** z integracją z kalendarzem rezerwacji

### **Optymalizacje Techniczne**

- **Redis caching** dla poprawy wydajności
- **Background jobs** dla heavy operations
- **Real-time notifications** (WebSocket/Server-Sent Events)
- **Advanced search** z full-text search capabilities
- **API rate limiting** i advanced security measures

---

**Book Market** to kompleksowe rozwiązanie dla zarządzania krótkookresowym wynajmem, łączące nowoczesne technologie z intuicyjnym interfejsem użytkownika. System zapewnia pełną kontrolę nad procesami biznesowymi, automatyzuje rutynowe zadania i dostarcza szczegółowych analiz finansowych.

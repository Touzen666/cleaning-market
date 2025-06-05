# 🏢 Book Market - System Zarządzania Apartamentami

**Book Market** to nowoczesna aplikacja full-stack do zarządzania krótkookresowym wynajmem apartamentów, zbudowana w oparciu o Next.js 15, TypeScript i PostgreSQL. Aplikacja oferuje kompleksowy system rezerwacji, kart meldunkowych oraz zarządzania sesjami użytkowników.

## 📋 **Główne Funkcjonalności**

### 🏠 **System Apartamentów**

- Zarządzanie portfelem apartamentów z unikalnym systemem slug'ów
- Przechowywanie informacji o adresach i podstawowych danych
- Integracja z systemem rezerwacji i kart meldunkowych

### 📅 **System Rezerwacji**

- Automatyczne pobieranie rezerwacji z zewnętrznych źródeł (IdoBooking)
- Śledzenie statusów rezerwacji, płatności i dat pobytu
- Zarządzanie informacjami o gościach (liczba dorosłych/dzieci)
- Powiązanie rezerwacji z konkretnymi apartamentami

### 🆔 **System Kart Meldunkowych**

- **Cyfrowe karty meldunkowe** dla gości z pełną walidacją danych
- **Automatyczne powiązanie** z aktywnymi rezerwacjami
- **Ochrona przed duplikatami** - jedna karta na apartament na dzień
- **Zbieranie danych osobowych**: imię, nazwisko, data urodzenia, narodowość
- **Obsługa dokumentów**: dowód osobisty, paszport, prawo jazdy
- **Dane adresowe**: pełny adres zamieszkania gościa
- **Identyfikacja gościa głównego** - automatyczne rozpoznawanie głównego rezerwującego

### 👤 **System Użytkowników i Sesji**

- **Autoryzacja NextAuth.js** z obsługą Discord OAuth
- **Role użytkowników**: ADMIN, OWNER, CLEANER, GUEST, UNKNOWN
- **Sesje bazodanowe** z automatycznym zarządzaniem cyklem życia
- **Middleware ochronny** dla chronionych tras (/apartments)
- **Przekierowania kontekstowe** po zalogowaniu z zachowaniem callbackUrl

### 📞 **System Kontaktowy**

- Formularz kontaktowy z walidacją tRPC
- Przechowywanie wiadomości w bazie danych
- Panel administratora do przeglądania wiadomości

### 📊 **Panel Administracyjny**

- Dostęp dla użytkowników z rolą ADMIN
- Przeglądanie rezerwacji, kart meldunkowych i wiadomości kontaktowych
- Zarządzanie apartamentami i użytkownikami

## 🛠 **Stack Technologiczny**

### **Frontend**

- **Next.js 15** (App Router) - Framework React z SSR/SSG
- **TypeScript** - Typowanie statyczne
- **Tailwind CSS** - Utility-first CSS framework
- **React 18** - Biblioteka UI
- **Geist Font** - Nowoczesna typografia

### **Backend & API**

- **tRPC** - End-to-end typesafe APIs
- **Next.js API Routes** - Serverless functions
- **Zod** - Schema validation
- **Prisma ORM** - Database toolkit
- **NextAuth.js v5** - Autoryzacja i sesje

### **Baza Danych**

- **PostgreSQL** - Główna baza danych
- **Prisma Client** - ORM z type safety
- **Database sessions** - Persistent session storage

### **DevOps & Narzędzia**

- **Docker Compose** - Konteneryzacja bazy danych
- **Vercel** - Deployment platform
- **ESLint + Prettier** - Code quality
- **TypeScript Compiler** - Type checking

## 🏗 **Architektura Aplikacji**

```
src/
├── app/                    # 📄 Next.js App Router
│   ├── page.tsx           # 🏠 Strona główna z przekierowaniami
│   ├── login/             # 🔐 Strona logowania (Discord OAuth)
│   ├── apartments/        # 🏢 Panel apartamentów (chroniony)
│   ├── check-in-card/     # 🆔 Formularz karty meldunkowej
│   ├── api/               # 🔧 API endpoints
│   │   ├── auth/          # NextAuth.js handlers
│   │   └── check-in/      # API kart meldunkowych
│   └── _components/       # 🧩 Komponenty React
│       ├── shared/        # Współdzielone komponenty
│       └── CheckInCard.tsx # Główny komponent karty meldunkowej
├── server/                # 🔧 Backend logic
│   ├── api/              # tRPC API
│   │   ├── root.ts       # Router główny
│   │   └── routers/      # Endpointy tRPC
│   │       ├── contact.router.ts    # Formularz kontaktowy
│   │       ├── reservations.ts      # Zarządzanie rezerwacjami
│   │       └── post.ts             # Przykładowy router
│   └── db.ts             # Konfiguracja Prisma Client
├── lib/                  # 🛠 Funkcje pomocnicze
└── styles/               # 🎨 Globalne style
```

## 🚀 **Uruchomienie Projektu**

### **Wymagania**

- Node.js 18+
- PostgreSQL 14+
- npm/yarn/pnpm

### **Instalacja**

```bash
# Klonowanie repozytorium
git clone <repository-url>
cd book-market

# Instalacja zależności
npm install

# Konfiguracja zmiennych środowiskowych
cp .env.example .env
# Edytuj .env z odpowiednimi wartościami
```

### **Konfiguracja Bazy Danych**

```bash
# Uruchomienie PostgreSQL (Docker)
docker-compose up -d

# Generowanie Prisma Client
npm run db:generate

# Sync schema z bazą (szybkie)
npm run db:push

# Studio Prisma (interfejs webowy)
npm run db:studio
```

### **Development**

```bash
# Uruchomienie w trybie deweloperskim
npm run dev

# Otwórz przeglądarkę na http://localhost:3000
```

## 🗄 **Zarządzanie Bazą Danych**

### **Ważne Komendy Prisma** (zachowaj te podpowiedzi - ważne w debugowaniu!)

**Jeśli masz folder prisma/migrations, usuń, przenieś, zmień nazwę lub zarchiwizuj ten folder.**

**Utworzenie katalogu migracji:**

```bash
mkdir -p prisma/migrations/0_init
```

**Generowanie migracji i zapisanie do pliku:**

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Więcej informacji: https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining

**Tworzenie nowych migracji:**

```bash
npx prisma migrate dev --name add-lead-application
```

**Sync schema bez nowych migracji (np. dodanie pól):**

```bash
npx prisma db push
```

### ⚠️ **Ważna Uwaga o `db push`**

Podczas gdy `db push` aktualizuje schema:

- ❌ **Nie tworzy plików migracji**
- ❌ **Nie jest idealne dla projektów zespołowych lub pełnego CI/CD**
- ✅ **Jest szybkie i bezpieczne dla szybkich ręcznych aktualizacji**

Jeśli kiedykolwiek zechcesz przejść na bardziej strukturalny proces z migracjami (`migrate deploy`), zalecam najpierw wykonanie baselining (które rozpocząłeś).

### **Przydatne Skrypty**

```bash
# Sprawdzanie kodu
npm run check              # ESLint + TypeScript check

# Formatowanie
npm run format:check       # Sprawdź formatowanie
npm run format:write      # Popraw formatowanie

# Budowanie
npm run build             # Production build
npm run preview           # Podgląd production build

# Database
npm run db:migrate        # Deploy migrations (production)
npm run db:seed          # Seed database with test data
```

## 🔐 **Autoryzacja i Role**

### **System Ról**

- **ADMIN** - Pełny dostęp, automatyczne przekierowanie na /admin
- **OWNER** - Właściciel apartamentów
- **CLEANER** - Personel sprzątający
- **GUEST** - Goście (karta meldunkowa)
- **UNKNOWN** - Nowi użytkownicy (ograniczony dostęp)

### **Chronione Trasy**

- `/apartments/*` - Wymaga zalogowania
- `/admin/*` - Wymaga roli ADMIN
- `/check-in-card` - Publiczna (dla gości)
- `/login` - Publiczna

### **Konfiguracja OAuth**

1. Utwórz aplikację Discord Developer Portal
2. Ustaw zmienne środowiskowe:
   ```env
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   NEXTAUTH_SECRET=your_random_secret
   ```

## 📝 **System Kart Meldunkowych**

### **Przepływ Pracy**

1. **Gość** wypełnia formularz karty meldunkowej
2. **System** automatycznie łączy z aktywną rezerwacją
3. **Walidacja** zapobiega duplikatom (jeden check-in na apartament/dzień)
4. **Identyfikacja** głównego gościa na podstawie danych rezerwacji
5. **Przechowywanie** wszystkich danych w bazie dla celów prawnych

### **Pola Karty Meldunkowej**

```typescript
interface CheckInCard {
  // Dane osobowe
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality: string;
  documentType: "ID Card" | "Passport" | "Driving License";
  documentNumber: string;

  // Adres
  addressStreet: string;
  addressCity: string;
  addressZipCode: string;
  addressCountry: string;

  // Metadata
  submittedApartmentIdentifier: string; // slug apartmentu
  checkInDate: Date;
  isPrimaryGuest: boolean;
  reservationId?: number; // Powiązanie z rezerwacją
}
```

## 🌐 **Deployment**

### **Vercel (Zalecane)**

1. Połącz repozytorium z Vercel
2. Skonfiguruj zmienne środowiskowe
3. Deploy automatyczny z main branch

### **Environment Variables**

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="your-secret"
DISCORD_CLIENT_ID="your-discord-id"
DISCORD_CLIENT_SECRET="your-discord-secret"

# External APIs
IDOBOOKING_EMAIL="your-email"
IDOBOOKING_PASSWORD="your-password"
```

## 📞 **Kontakt i Wsparcie**

W przypadku problemów technicznych lub pytań:

- **Email**: biuro@zlote-wynajmy.columns
- **Telefon**: +48 690 884 961 / +48 531 392 423

## 🔄 **Roadmap**

### **Planowane Funkcjonalności**

- [ ] Panel analityczny z wykresami okupacji
- [ ] Automatyczne generowanie raportów PDF
- [ ] Integracja z systemami płatności
- [ ] Mobilna aplikacja dla cleaners
- [ ] Powiadomienia SMS/Email
- [ ] API dla zewnętrznych integracji

---

**Wersja**: 0.1.18 | **Framework**: Next.js 15 | **Database**: PostgreSQL + Prisma

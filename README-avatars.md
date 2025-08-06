# Funkcjonalność Avatarów Profilowych

## Opis

Dodano funkcjonalność zarządzania zdjęciami profilowymi dla właścicieli apartamentów. Użytkownicy mogą:

1. **Uploadować własne zdjęcia** - przesyłać prawdziwe zdjęcia profilowe
2. **Wybierać z predefiniowanych avatarów** - 6 różnych, realistycznych avatarów w kategoriach:
   - 2 avatary dla kobiet (elegancka i młoda)
   - 2 avatary dla mężczyzn (profesjonalny i casual)
   - 2 avatary dla rodzin (4-osobowa i 6-osobowa)
3. **Usuwać zdjęcia profilowe** - powrót do domyślnej ikony

## Synchronizacja z Panelem Administratora

### Ograniczenia właściciela:

- **Właściciel NIE MOŻE** zmieniać: imienia, nazwiska, email
- **Właściciel MOŻE** zmieniać: telefon, nazwa firmy, NIP, adres, miasto, kod pocztowy, zdjęcie profilowe

### Panel administratora:

- **Administrator MOŻE** edytować wszystkie pola właściciela
- Wszystkie zmiany w profilu właściciela są automatycznie widoczne w panelu administratora
- Wszystkie zmiany w panelu administratora są automatycznie widoczne w profilu właściciela

## Pliki

### Nowe pliki:

- `public/uploads/profiles/avatar1.svg` - Elegancka kobieta z długimi włosami i biżuterią
- `public/uploads/profiles/avatar2.svg` - Młoda kobieta z krótką fryzurą bob i nowoczesnym stylem
- `public/uploads/profiles/avatar3.svg` - Profesjonalny mężczyzna w garniturze z brodą
- `public/uploads/profiles/avatar4.svg` - Młody mężczyzna z dłuższymi włosami w casual stylu
- `public/uploads/profiles/avatar5.svg` - Rodzina 4-osobowa (2 dorosłych + 2 dzieci)
- `public/uploads/profiles/avatar6.svg` - Duża rodzina 6-osobowa (2 dorosłych + 4 dzieci)
- `src/app/api/upload-profile-image/route.ts` - API do uploadu zdjęć
- `src/components/ProfileAvatar.tsx` - Komponent do wyświetlania avatarów

### Zmodyfikowane pliki:

- `src/app/apartamentsOwner/profile/page.tsx` - Strona profilu z nową funkcjonalnością i ograniczeniami
- `src/server/api/routers/owner-auth.ts` - Nowe endpointy TRPC z ograniczeniami
- `src/server/api/routers/apartment-owners.ts` - Dodane nowe pola do edycji administratora
- `src/app/admin/owners/[ownerId]/edit/page.tsx` - Panel edycji administratora z nowymi polami
- `src/app/admin/owners/[ownerId]/page.tsx` - Strona szczegółów właściciela z nowymi polami

## API Endpoints

### Upload zdjęcia profilowego

```typescript
POST /api/upload-profile-image
Content-Type: multipart/form-data
Body: { file: File }
```

### TRPC Mutations

```typescript
// Upload zdjęcia (właściciel)
uploadProfileImage: { image: File, ownerEmail: string }

// Ustaw avatar (właściciel)
setAvatar: { ownerEmail: string, avatarUrl: string }

// Aktualizuj profil (właściciel - ograniczone pola)
updateOwnerProfile: { ownerEmail: string, phone?: string, companyName?: string, nip?: string, address?: string, city?: string, postalCode?: string, profileImageUrl?: string | null }

// Aktualizuj właściciela (administrator - wszystkie pola)
update: { ownerId: string, firstName: string, lastName: string, email: string, phone?: string, companyName?: string, nip?: string, address?: string, city?: string, postalCode?: string, profileImageUrl?: string | null, isActive: boolean, paymentType: PaymentType, fixedPaymentAmount?: number, vatOption: VATOption }
```

## Użycie

### W komponencie React:

```tsx
import ProfileAvatar from "@/components/ProfileAvatar";

<ProfileAvatar
  imageUrl={user.profileImageUrl}
  size="lg"
  alt="Zdjęcie użytkownika"
/>;
```

### Rozmiary avatarów:

- `sm` - 32x32px
- `md` - 48x48px
- `lg` - 64x64px
- `xl` - 96x96px

## Walidacja

- Maksymalny rozmiar pliku: 5MB
- Dozwolone formaty: wszystkie formaty obrazów (image/\*)
- Avatary są walidowane - tylko predefiniowane URL-e są dozwolone

## Bezpieczeństwo

- Wszystkie uploady są przechowywane w Vercel Blob
- Pliki mają unikalne nazwy z timestampem
- Avatary są walidowane na serwerze
- Brak bezpośredniego dostępu do systemu plików
- Właściciele nie mogą zmieniać krytycznych danych (imię, nazwisko, email)
- Wszystkie zmiany są synchronizowane między panelem właściciela a administratorem

Run server first:
npm run dev
Open the Prisma Client in browser:
npx prisma studio

If you have a prisma/migrations folder, delete, move, rename, or archive this folder.

Run the following command to create a migrations directory inside with your preferred name. This example will use 0_init for the migration name:
mkdir -p prisma/migrations/0_init

Generate a migration and save it to a file using prisma migrate diff
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining

Now you can create new migrations going forward without errors:
npx prisma migrate dev --name add-lead-application

If you just want to sync the schema without new migrations (e.g. adding fields):
npx prisma db push

⚠️ BUT – One Thing to Know
While db push updates the schema, it:

❌ Does not create migration files

❌ Is not ideal for collaborative projects or full CI/CD

✅ Is fast and safe for quick manual updates

If you ever want to switch to a more structured process with migrations (migrate deploy), I recommend baselining first (which you started doing).
src/
├── _components/
│ ├── shared-small/ # 🔹 Małe komponenty UI
│ │ ├── Button.tsx
│ │ ├── Input.tsx
│ │ ├── Textarea.tsx
│ │ ├── Modal.tsx
│ ├── shared/ # 🔥 Większe komponenty złożone z kilku małych
│ │ ├── Form.tsx # Używa Input.tsx i Textarea.tsx
│ │ ├── MessagesList.tsx
│ │ ├── PostCard.tsx
│ │ ├── Navbar.tsx
│ ├── layout/ # 🏗 Layouty aplikacji
│ │ ├── MainLayout.tsx
│ │ ├── AdminLayout.tsx
├── app/ # 📌 Strony aplikacji
│ ├── page.tsx # 🏠 Strona główna "/"
│ ├── contact/
│ │ ├── page.tsx # 📩 Strona "/contact"
│ │ ├── ContactPage.tsx # Komponent strony kontaktowej
│ ├── dashboard/
│ │ ├── page.tsx # 📊 Strona "/dashboard"
├── lib/ # 🛠 Funkcje pomocnicze
│ ├── formatDate.ts
│ ├── validateEmail.ts
├── styles/ # 🎨 Globalne style
│ ├── globals.css
│ ├── tailwind.css

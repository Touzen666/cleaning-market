# Git – dwa konta GitHub w jednym workspace

Żeby w różnych repozytoriach używać różnych kont GitHub (np. prywatne vs firmowe), skonfiguruj **conditional include** w Git.

---

## Dla Touzen666 (book-market, bartosz-wilk-development) – wymagany osobny klucz SSH

Push do repo Touzen666 **musi** iść z klucza SSH dodanego do konta **Touzen666**. W `~/.gitconfig-github-konto2` jest już ustawione `core.sshCommand` na klucz `id_ed25519_touzen666`. Jeśli go jeszcze nie masz:

1. **Wygeneruj klucz** (w PowerShell lub Git Bash):

   ```bash
   ssh-keygen -t ed25519 -C "touzen666@users.noreply.github.com" -f C:/Users/oched/.ssh/id_ed25519_touzen666
   ```
   (Hasło opcjonalne – możesz zostawić puste.)

2. **Dodaj klucz do GitHub** – zaloguj się na **Touzen666** → **Settings → SSH and GPG keys → New SSH key**. Wklej zawartość pliku `C:\Users\oched\.ssh\id_ed25519_touzen666.pub`.

3. **Sprawdź połączenie:**
   ```bash
   ssh -i C:/Users/oched/.ssh/id_ed25519_touzen666 -o IdentitiesOnly=yes -T git@github.com
   ```
   Powinno wyświetlić: `Hi Touzen666! You've successfully authenticated...`

Po tym w **book-market** i **bartosz-wilk-development** `git push` będzie używał tego klucza i GitHub rozpozna konto Touzen666.

---

## Krok 1: Drugi klucz SSH (ogólnie)

Dla drugiego konta GitHub wygeneruj osobny klucz:

```bash
ssh-keygen -t ed25519 -C "twoj-email-dla-konta-2@example.com" -f ~/.ssh/id_ed25519_github_konto2
```

Dodaj klucz do drugiego konta w GitHub: **Settings → SSH and GPG keys → New SSH key**.

## Krok 2: Plik konfiguracji dla drugiego konta

W katalogu domowym utwórz plik z danymi drugiego konta, np.:

**Windows:** `C:\Users\<TwojaNazwa>\.gitconfig-github-konto2`  
**Mac/Linux:** `~/.gitconfig-github-konto2`

Zawartość (podmień na swoje dane):

```ini
[user]
    name = Twoja Nazwa Konta 2
    email = twoj-email@example.com
# Opcjonalnie: wymuś używanie konkretnego klucza SSH dla GitHub
[core]
    sshCommand = ssh -i ~/.ssh/id_ed25519_github_konto2
```

Jeśli używasz tylko jednego klucza SSH i chcesz tylko inną nazwę/email w commitach, możesz pominąć `[core] sshCommand`.

## Krok 3: Conditional include w głównym .gitconfig

Otwórz globalny config Gita:

- **Windows:** `C:\Users\<TwojaNazwa>\.gitconfig`
- **Mac/Linux:** `~/.gitconfig`

Na **końcu** pliku dopisz (ścieżki dopasuj do swoich repozytoriów):

```ini
# Repo w tym folderze używają konta 2 (reszta – domyślne konto z [user] u góry)
[includeIf "gitdir:C:/React Workspace/afiliate-panel/"]
    path = ~/.gitconfig-github-konto2
[includeIf "gitdir:C:/React Workspace/book-market/"]
    path = ~/.gitconfig-github-konto2
# Dodaj kolejne repozytoria w razie potrzeby:
# [includeIf "gitdir:C:/React Workspace/SCM/"]
#     path = ~/.gitconfig-github-konto2
```

- Ścieżki w `gitdir:` **ze slashem na końcu** i w formie `C:/...` (bez backslashy).
- Gdy jesteś w repo z listy, Git ładuje `path` i tam bierze `user.name`, `user.email` oraz ewentualnie `core.sshCommand` – więc push idzie z właściwego konta.

## Krok 4: Sprawdzenie

W repozytorium, które ma używać konta 2:

```bash
cd C:\React Workspace\book-market
git config user.name
git config user.email
```

Powinny być wartości z `.gitconfig-github-konto2`. Push przez SSH będzie szedł z klucza ustawionego w `sshCommand`.

## Szybka ściąga – które repo z którym kontem (obecna konfiguracja)

| Repozytorium             | Konto          | Origin (SSH) |
|--------------------------|----------------|--------------|
| SCM                      | boberRasputnik | `git@github.com:boberRasputnik/SCM-SP.-z-O.-O.git` |
| afiliate-panel           | boberRasputnik | `git@github.com:boberRasputnik/afiliate-panel.git` |
| book-market              | Touzen666      | `git@github.com:Touzen666/cleaning-market.git` |
| bartosz-wilk-development | Touzen666      | `git@github.com:Touzen666/bartosz-wilk-development.git` |

Domyślne konto w `~/.gitconfig`: **boberRasputnik**. Plik `~/.gitconfig-github-konto2` ustawia **Touzen666** tylko dla book-market i bartosz-wilk-development.

# K2 Performance Backend

Backend aplikacji webowej K2 Performance, rozwijanej w ramach projektu inżynierskiego. Udostępnia REST API dla frontendu oraz obsługuje dane w PostgreSQL.

Aplikacja ma umożliwiać sprzedaż planów treningowych PDF, przyjmowanie zgłoszeń na współpracę i zarządzanie klientami. Implementacja jest w trakcie prac. Frontend znajduje się w osobnym repozytorium.

## Technologie

- Node.js, Express 5, TypeScript
- PostgreSQL 16, Prisma ORM 6
- Docker Compose do uruchomienia lokalnej bazy danych
- JWT, bcrypt, cookie-parser do obsługi logowania
- Zod do walidacji danych wejściowych

## Stan implementacji

Gałąź `main` zawiera konfigurację serwera, schemat bazy danych, migrację początkową i dane testowe. Dostępne są dwa endpointy: sprawdzenie stanu serwera oraz pobieranie aktywnych produktów.

W gałęzi `feature-user-auth` zaimplementowano dodatkowo:

- rejestrację i logowanie klientów;
- sesję opartą na JWT przechowywanym w ciasteczku `httpOnly`;
- sprawdzanie zalogowanego użytkownika i wylogowanie;
- rozróżnianie ról `CLIENT` i `ADMIN` oraz endpoint listy użytkowników dla administratora;
- pobieranie pakietów prowadzenia online;
- sprawdzanie dostępności miejsc i 15-minutową rezerwację miejsca dla zalogowanego klienta.

Limit prowadzenia online wynosi obecnie 12 klientów. Zliczane są aktywne współprace i ważne rezerwacje. Operacja tworzenia rezerwacji korzysta z blokady transakcyjnej PostgreSQL, aby ograniczyć ryzyko przekroczenia limitu przy równoczesnych żądaniach.

## Uruchomienie lokalne

Wymagane są Node.js (zalecana wersja 22 lub nowsza), npm oraz Docker z Docker Compose.

1. Zainstaluj zależności:

   ```bash
   npm ci
   ```

2. Uruchom PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Utwórz plik `.env` w katalogu głównym projektu:

   ```dotenv
   DATABASE_URL="postgresql://admin:admin123@localhost:5432/pwd_performance?schema=public"
   PORT=4000
   FRONTEND_URL="http://localhost:3000"
   JWT_SECRET="wstaw_tutaj_wlasny_losowy_sekret"
   NODE_ENV=development
   ```

   Dane dostępowe odpowiadają lokalnej konfiguracji `docker-compose.yml`. Nie używaj ich na serwerze produkcyjnym. Plik `.env` nie jest dodawany do repozytorium.

4. Wygeneruj klienta Prisma, zastosuj migracje i dodaj dane początkowe:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npx prisma db seed
   ```

5. Uruchom API:

   ```bash
   node --env-file=.env --import tsx --watch src/server.ts
   ```

Serwer jest dostępny pod adresem `http://localhost:4000`. Do sprawdzenia działania służy `http://localhost:4000/health`.

W projekcie istnieje też skrypt `npm run dev`, ale obecny plik `src/server.ts` nie wczytuje jawnie `.env`. Powyższa komenda zapewnia przekazanie zmiennych środowiskowych do procesu Node.js.

## Endpointy

| Metoda | Ścieżka | Opis | Gałąź |
| --- | --- | --- | --- |
| GET | `/health` | Stan serwera | `main` |
| GET | `/products` | Lista aktywnych planów PDF | `main` |
| POST | `/auth/register` | Rejestracja klienta | `feature-user-auth` |
| POST | `/auth/login` | Logowanie i ustawienie ciasteczka z JWT | `feature-user-auth` |
| GET | `/auth/me` | Dane zalogowanego użytkownika | `feature-user-auth` |
| POST | `/auth/logout` | Wylogowanie | `feature-user-auth` |
| GET | `/admin/users` | Lista użytkowników, tylko `ADMIN` | `feature-user-auth` |
| GET | `/training-packages` | Lista aktywnych pakietów prowadzenia online | `feature-user-auth` |
| GET | `/training-packages/availability` | Liczba wolnych i zajętych miejsc | `feature-user-auth` |
| POST | `/training-packages/reserve` | Rezerwacja miejsca, tylko `CLIENT` | `feature-user-auth` |

Przykładowe dane dla `POST /auth/register`:

```json
{
  "firstName": "Jan",
  "lastName": "Kowalski",
  "email": "jan@example.com",
  "password": "przykladowe-haslo-123"
}
```

Rejestracja wymaga hasła o długości co najmniej 12 znaków. Konto tworzone przez ten endpoint otrzymuje rolę `CLIENT`. Logowanie przyjmuje pola `email` i `password`.

Przykładowe dane dla `POST /training-packages/reserve`:

```json
{
  "packageId": 1
}
```

Endpoint wymaga zalogowanego klienta. Rezerwacja miejsca nie oznacza jeszcze aktywnej współpracy ani zakończonej płatności.

W zapytaniach z frontendu wymagających sesji trzeba przesyłać ciasteczka, np. przez `credentials: "include"` w `fetch`. Dopuszczony adres frontendu określa zmienna `FRONTEND_URL`.

## Struktura projektu

```text
prisma/
  migrations/          migracje bazy danych
  schema.prisma        modele danych
  seed.ts              dane początkowe
src/
  controllers/         obsługa żądań HTTP
  lib/prisma.ts        klient Prisma
  middleware/          autoryzacja i kontrola dostępu
  routes/              definicje endpointów
  services/            logika rezerwacji miejsc
  app.ts               konfiguracja Express
  server.ts            uruchomienie serwera
scripts/                skrypt testu współbieżnych rezerwacji
```

Katalogi `middleware`, `services` i `scripts` występują w gałęzi `feature-user-auth`.

## Test rezerwacji miejsc

W `feature-user-auth` znajduje się skrypt `scripts/test-capacity-concurrency.ts`. Wykonuje 13 równoczesnych prób rezerwacji i sprawdza, czy liczba miejsc nie przekracza 12.

Skrypt jest zabezpieczony przed uruchomieniem na zwykłej bazie aplikacji. Wymaga osobnej bazy o nazwie `k2_performance_test` z zastosowanymi migracjami. Przykładowe polecenia dla PowerShell:

```powershell
docker exec pwd_performance_db psql -U admin -d postgres -c "CREATE DATABASE k2_performance_test;"
$env:DATABASE_URL = "postgresql://admin:admin123@localhost:5432/k2_performance_test?schema=public"
npx prisma migrate deploy
npx tsx scripts/test-capacity-concurrency.ts
```

Test tworzy rekordy w bazie testowej. Nie należy uruchamiać go na bazie produkcyjnej.

## Dalsze prace

W schemacie bazy znajdują się już modele zamówień, płatności, zgłoszeń i wiadomości e-mail, ale obsługujące je endpointy nie zostały jeszcze dodane. Do zrealizowania pozostają między innymi integracja PayU, obsługa webhooków, wysyłka zakupionych plików PDF oraz moduł zgłoszeń z panelu administracyjnego.

Przed wdrożeniem produkcyjnym trzeba również uzupełnić konfigurację środowiskową i testy. Obecnie skrypt `npm start` wskazuje na `dist/server.js`, podczas gdy konfiguracja TypeScript zapisuje plik serwera w `dist/src/server.js`.

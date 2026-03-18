# Grimoire

A lightweight, self-hosted expense tracker. Vietnamese UI, VNĐ currency, SQLite storage.

## Features

- Single-user admin with JWT session
- Transaction logging — amount, note, datetime, category
- Category management with public sharing via secure URLs
- Mobile-first responsive design
- Client-side validation with react-hook-form + Zod

## Tech Stack

Next.js 16 · React 19 · Tailwind CSS · shadcn/ui · SQLite · Drizzle ORM · jose · ESLint · Prettier

## Quick Start

### Docker Compose

```bash
cp .env.example .env   # edit credentials
docker compose up -d
```

### Local Development

```bash
npm install
cp .env.example .env.local   # edit credentials
npm run db:push
npm run dev
```

## Environment Variables

| Variable         | Description                 | Default     |
| ---------------- | --------------------------- | ----------- |
| `ADMIN_USERNAME` | Login username              | `admin`     |
| `ADMIN_PASSWORD` | Login password              | `changeme`  |
| `AUTH_SECRET`    | JWT signing key (32+ chars) | —           |
| `DATABASE_URL`   | SQLite database path        | `./data.db` |

## Scripts

| Command              | Description               |
| -------------------- | ------------------------- |
| `npm run dev`        | Dev server                |
| `npm run build`      | Production build          |
| `npm run start`      | Production server         |
| `npm run lint`       | ESLint                    |
| `npm run lint:fix`   | ESLint with auto-fix      |
| `npm run format`     | Prettier format           |
| `npm run format:check` | Prettier check (CI)     |
| `npm run db:push`    | Push schema to SQLite     |
| `npm run db:studio`  | Open Drizzle Studio       |

## Docker

Pre-built images are published to GHCR on each tagged release.

```bash
# Using pre-built image
docker run -d -p 3000:3000 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=changeme \
  -e AUTH_SECRET=your-secret-key-at-least-32-chars \
  -v grimoire-data:/app/data \
  ghcr.io/fudio101/grimoire:latest

# Or build locally
docker build -t grimoire .
```

SQLite data is persisted at `/app/data/data.db` via volume mount.

## Releasing

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions builds and pushes to `ghcr.io/fudio101/grimoire` with tags `1.0.0`, `1.0`, `1`, `latest`.

## Project Structure

```
src/
├── app/
│   ├── actions/        # Server actions
│   ├── dashboard/      # Admin pages
│   ├── login/          # Auth
│   └── p/[shareToken]/ # Public shared view
├── components/
│   ├── ui/             # shadcn/ui
│   └── ...             # Feature components
├── hooks/              # Custom hooks
└── lib/
    ├── db/             # Schema & queries
    ├── schemas.ts      # Zod schemas
    ├── auth.ts         # JWT utilities
    └── format.ts       # Currency & datetime
```

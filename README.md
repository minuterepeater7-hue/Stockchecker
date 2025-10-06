# StockWatch Backend (Express + Prisma + SQLite)

## Setup
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run migrate
npm run dev
```

## API
- POST `/api/items` { url, email?, frequency: "MIN_15"|"MIN_30"|"HOUR_1" }
- GET `/api/items`
- DELETE `/api/items/:id`
- POST `/api/check-now/:id`
- GET `/api/notifications`

## Notes
- Scheduler runs every 5 minutes and checks items due by their frequency.
- Email only (SMTP via env). Push can be added later.

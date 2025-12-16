# VitaWin Monorepo (Stage 0)

Этот репозиторий содержит фронтенд (Vite + React + TypeScript) и backend-черновики (Express + Drizzle ORM).

## Структура

```
.
├── client/   # фронтенд витрины и админки
├── backend/  # Node.js backend, Drizzle ORM
├── docs/     # документация проекта
└── eslint.config.mjs / prettier.config.cjs
```

## Требования

- Node.js ≥ 20.10
- npm ≥ 10
- PostgreSQL 15+ (для backend)

## Быстрый старт

### 1. Frontend

```bash
cd client
npm install
npm run dev
```

Сервер Vite стартует на `http://localhost:5173`. Прокси `/api` направлен на `http://localhost:8000`.

> ⚠️ Замечание: в offline/ограниченных окружениях npm может не скачать опциональный пакет `@tailwindcss/oxide-*`. Это не критично для разработки; можно игнорировать предупреждение или использовать зеркала.

### 2. Backend

```bash
cd backend
cp .env.example .env   # заполните DATABASE_URL
npm install
npm run dev
```

Backend стартует на `http://localhost:8000`.

## Проверки качества

В каждой директории доступен свой набор скриптов:

```bash
cd client && npm run lint && npm run typecheck
cd backend && npm run lint && npm run typecheck
```

TypeScript настроен в режиме `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.

## Документация

- [docs/Registry.md](docs/Registry.md) — реестр форм и DTO v0.4.
- [docs/Stage0-Board.md](docs/Stage0-Board.md) — WBS/issue board для этапа 0.
- [docs/CONTRACT.md](docs/CONTRACT.md) — финансовые договорённости.

### API Docs

- Генерация спецификации OpenAPI 3.1:
  ```bash
  cd backend
  npm run docs:build
  # сгенерированный файл: backend/src/docs/openapi.json
  ```
- Предпросмотр Swagger UI: запустите backend и откройте /docs
  ```bash
  cd backend
  npm run dev
  # откройте http://localhost:8000/docs (UI)
  # openapi.json также доступен на http://localhost:8000/openapi.json
  ```
- Поддержание актуальности:
  - При добавлении/изменении эндпоинтов обновляйте JSDoc-аннотации в src/routes/** и/или соответствующих контроллерах.
  - Используйте единые компоненты: BearerAuth (JWT), SuccessEnvelope, ErrorResponse, MoneyString/Percent/UUID/DateTime, ImageItem[].
  - Для эндпоинтов без валидации добавляйте минимальные Zod-схемы и описывайте их в спецификации.

## Следующие шаги

1. Настроить CI (GitHub Actions) с `npm run lint` + `npm run typecheck` для обоих пакетов.
2. Утвердить пункты из списка «Нужна верификация» (Registry §5).
3. Завести бэклог задач Stage 1 на issue-доске в GitHub.

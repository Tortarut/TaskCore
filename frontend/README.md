# TaskCore Frontend

React (Vite + TypeScript) приложение для TaskCore.

В production-режиме сборка отдаётся через **Nginx** и проксирует `/api/` на backend.

## Конфигурация

См. `frontend/.env.example`.

- `VITE_API_URL` используется в dev-режиме (когда фронт работает не через Nginx, а через `vite dev`).

## Запуск локально (без Docker)

```bash
npm install
npm run dev
```

По умолчанию API берётся из `VITE_API_URL`.

## Docker

Сборка фронта выполняется в `frontend/Dockerfile` (multi-stage), а Nginx конфиг находится в `frontend/nginx.conf`.


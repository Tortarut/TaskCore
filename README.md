# TaskCore

TaskCore — клиент‑серверное приложение для управления проектами и задачами.

- Развёрнутый проект: `http://taskcore123.duckdns.org/`

- **Серверная часть**: Django + Django REST Framework (JWT)
- **Клиентская часть**: React (Vite) + Nginx (маршрутизация запросов `/api/` → backend)
- **База данных**: PostgreSQL (Docker Compose)

## Структура

- `backend/` — серверное API (Django/DRF)
- `frontend/` — клиентское приложение (Vite) и конфигурация Nginx (`nginx.conf`)
- `docker-compose.yml` — базовая конфигурация Docker Compose (приближена к рабочей среде)
- `docker-compose.dev.yml` — дополнения для локальной разработки (порты и режим отладки)

## Конфигурация (переменные окружения)

### Docker Compose

См. пример: `.env.example` в корне репозитория. Перед первым запуском:

```bash
cp .env.example .env
```

Файл `.env` задаёт учётные данные PostgreSQL, `DJANGO_SECRET_KEY` и порты (`BACKEND_HOST_PORT`, `FRONTEND_HOST_PORT`, `POSTGRES_HOST_PORT` в режиме dev).

### Серверная часть

См. пример: `backend/.env.example`

Ключевые переменные:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_LOG_LEVEL`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `WEB_CONCURRENCY`, `GUNICORN_TIMEOUT`, `GUNICORN_GRACEFUL_TIMEOUT`

### Клиентская часть

См. пример: `frontend/.env.example`

- `VITE_API_URL` — адрес API для режима разработки (когда фронт на машине обращается к backend напрямую)

## Запуск в Docker (режим разработки)

Режим разработки использует файл `docker-compose.dev.yml`, который публикует порты:

- backend: `8001:8000`
- db: `5433:5432`
- frontend: `3000:80`

Команды:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm backend-migrate
```

После запуска:

- frontend: `http://127.0.0.1:3000`
- backend (напрямую): `http://127.0.0.1:8001/api/`

## Запуск в Docker (приближено к рабочей среде)

Базовый `docker-compose.yml` максимально близок к логике рабочей среды:

- `db` не публикуется наружу
- миграции выполняются отдельным разовым процессом

Команды:

```bash
docker compose up --build -d
docker compose run --rm backend-migrate
```

## Администрирование (разовые команды)

Примеры:

```bash
docker compose run --rm backend python manage.py createsuperuser
docker compose run --rm backend python manage.py shell
```

## Документация API (OpenAPI/Swagger)

- OpenAPI схема: `/api/schema/`
- Swagger интерфейс: `/api/docs/`

## CI (GitHub Actions)

При push и pull request в `main`/`master` автоматически запускаются:

- **backend** — `python manage.py test users.tests core.tests` (SQLite, без fuzz)
- **frontend** — `npm test` (Vitest)

Конфигурация: `.github/workflows/ci.yml`

## CD

Workflow **Deploy** запускается вручную: GitHub → **Actions** → **Deploy** → **Run workflow**.

На сервере в каталоге проекта (по умолчанию `/opt/taskcore`) должны быть: git-клон репозитория, файл `.env`, Docker и Docker Compose.

Workflow выполняет: `git pull` → `docker compose run --rm backend-migrate` → `docker compose up -d --build` → проверка `/api/schema/`.

### Secrets (Settings → Secrets and variables → Actions)

| Secret | Обязательный | Пример |
|--------|--------------|--------|
| `SSH_HOST` | да | IP или домен VPS |
| `SSH_USER` | да | `deploy` |
| `SSH_PRIVATE_KEY` | да | приватный SSH-ключ |
| `SSH_PORT` | нет | `22` |
| `DEPLOY_PATH` | нет | `/opt/taskcore` |

Пароли БД и `DJANGO_SECRET_KEY` хранятся в `.env` **на сервере**, не в GitHub.

Конфигурация: `.github/workflows/deploy.yml`

## Тестирование серверной части

### Модульные и интеграционные тесты (Django test runner)

```bash
cd backend
python manage.py test users.tests core.tests
```

### Fuzz-тестирование API (Schemathesis + pytest) и отчёт

Fuzz-тесты в `backend/core/test_openapi_fuzz.py`:

| Тест | Режим | Что генерируется | Критерий |
|------|--------|------------------|----------|
| `test_openapi_fuzz_no_5xx` | positive | случайные, но валидные по OpenAPI данные | нет `5xx`, нет `401` |
| `test_openapi_fuzz_negative_no_5xx` | negative + coverage | неверные типы, пропуск полей, граничные значения, `\x00` в строках, лишние параметры | только нет `5xx` |

Оба набора для каждого кейса создают пользователя с JWT и seed-данные (проект, задача, комментарий), подставляют реальные id в FK/path, чтобы fuzz доходил до сериализаторов, а не только до 404.

Зависимости для разработки:

```bash
cd backend
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt
```

Запуск:

```bash
cd backend
pytest -k openapi_fuzz
pytest -k openapi_fuzz --html fuzz-report.html --self-contained-html
```

Просмотр HTML-отчёта:

- Отчёт сохраняется в файле `backend/fuzz-report.html`.
- В брауезере при открытии напрямую как `file:///...` таблица результатов может не отображаться из-за ограничений безопасности для локальных файлов.
- Рекомендуемый способ — открыть отчёт через локальный HTTP‑сервер:

```bash
cd backend
python -m http.server 8009
```

После этого откройте в браузере: `http://127.0.0.1:8009/fuzz-report.html`.

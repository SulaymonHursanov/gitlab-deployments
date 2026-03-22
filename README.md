# GitLab Deployments Viewer

Инструмент для просмотра задеплоенных веток по всем сервисам GitLab-группы в разрезе environments.

## Что умеет

- Показывает все environments из группы и вложенных подгрупп
- По выбранному environment — таблица сервисов с веткой, автором деплоя, временем и коммитом
- **Refresh all** — полное обновление данных по всем проектам с реал тайм состоянием обновлений
- **Update branches** — быстрое обновление - только выбранного environment
- Прогресс сохраняется при перезагрузке страницы (фоновый поток на бэкенде)
- Данные кешируются в файл `backend/data/deployments.json`


<p align="center">
  <img src="img/demo-screen.png" alt="demo" width="100%">
</p>

## Структура

```
├── get_deployments.py          # CLI-скрипт (вывод в stdout + CSV)
├── backend/
│   ├── main.py                 # FastAPI сервер
│   ├── gitlab_client.py        # Клиент GitLab API
│   ├── requirements.txt
│   ├── .env.example
│   └── data/                   # Генерируется автоматически
│       └── deployments.json
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api.js
        └── components/
            ├── Sidebar.jsx
            └── DeploymentsTable.jsx
```

## Требования

- Python 3.10+
- Node.js 18+
- GitLab Personal Access Token с правами `read_api`

## Запуск

### 1. Бэкенд

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Заполни .env своими значениями

uvicorn main:app --reload
# Сервер запустится на http://localhost:8000
```

### 2. Фронтенд

```bash
cd frontend
npm install
npm run dev
# UI откроется на http://localhost:5173
```

## Переменные окружения

| Переменная      | Описание                                         | Пример                          |
|-----------------|--------------------------------------------------|---------------------------------|
| `GITLAB_URL`    | URL вашего GitLab instance                       | `https://gitlab.example.com`    |
| `GITLAB_TOKEN`  | Personal Access Token (scope: `read_api`)        | `glpat-xxxxxxxxxxxxxxxxxxxx`    |
| `GITLAB_GROUP`  | Корневая группа для обхода (по умолчанию: `app`) | `cloud`                    |

## API endpoints

| Метод  | Путь                                    | Описание                                             |
|--------|-----------------------------------------|------------------------------------------------------|
| GET    | `/api/environments`                     | Список environments из файла                         |
| GET    | `/api/deployments?environment=<name>`   | Деплойменты для выбранного environment               |
| GET    | `/api/refresh-status`                   | Текущее состояние фонового обновления                |
| GET    | `/api/refresh-stream`                   | SSE-поток прогресса (подключается при перезагрузке)  |
| POST   | `/api/refresh`                          | Запустить полное обновление всех проектов            |
| POST   | `/api/refresh-env?environment=<name>`   | Запустить обновление одного environment              |

## CLI-скрипт

Для разового запуска без UI:

```bash
export GITLAB_URL=https://gitlab.example.com
export GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
export GITLAB_GROUP=cloud

python get_deployments.py
# Выводит таблицу в консоль и сохраняет deployments.csv
```

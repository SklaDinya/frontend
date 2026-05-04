# SklaDinya frontend

React SPA для сервиса бронирования ячеек хранения SklaDinya.

## Запуск

```bash
npm install
npm run dev
```

Приложение откроется на `http://127.0.0.1:5173` или ближайшем свободном порту Vite.

## Сборка

```bash
npm run build
npm run serve
```

`serve` раздает собранную папку `dist` на `http://127.0.0.1:3000`.

## Backend API

Интерфейс подготовлен под REST API из `backend/backend/docs/api`: авторизация, пункты хранения, ячейки, бронирования, оплаты и администрирование. Если backend недоступен, приложение продолжает работать с демо-данными.

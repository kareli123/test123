# Jettoken Airdrop

Backend + Frontend для раздачи Jettoken (JTT) пользователям.

## Как работает

```
Пользователь → Нажимает "Claim" на сайте
    → Frontend отправляет POST /api/claim { address }
    → Backend проверяет (не получал ли уже)
    → Backend минтит токены через Jetton Master Contract
    → Пользователь получает токены в кошелёк
```

## Быстрый старт

### 1. Настрой backend

```bash
cd backend
npm install
cp .env.example .env
```

Отредактируй `backend/.env`:

```env
# ТВОЯ SEED PHRASE (24 слова от admin-кошелька jetton)
# НЕ делись ей ни с кем! НЕ коммить в git!
MNEMONIC=word1 word2 word3 ... word24

# Адрес Jetton Master (уже указан)
JETTON_MASTER=EQB0qpljZl3xD0pbWPM3PCEn6bQfDe6Xx7a7W4qtBs45axmj

# Сколько токенов давать каждому
CLAIM_AMOUNT=100

# Decimals (обычно 9)
TOKEN_DECIMALS=9

# TonCenter API key (получи на https://toncenter.com)
TONCENTER_API_KEY=твой_ключ

NETWORK=mainnet
PORT=3001
```

### 2. Запусти backend

```bash
cd backend
npm start
```

Сервер запустится на `http://localhost:3001`

Проверь: `curl http://localhost:3001/api/health`

### 3. Запусти frontend

Для разработки можно просто открыть `index.html` в браузере.

Для продакшена — деплой на GitHub Pages или любой хостинг:

```bash
# В config.js укажи URL своего backend:
BACKEND_URL = "https://твой-сервер.com"
```

### 4. Настрой TonConnect manifest

В `tonconnect-manifest.json` укажи свой URL и иконку.

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/claim` | Запросить токены `{ address: "EQC..." }` |
| GET | `/api/status/:address` | Проверить, получал ли адрес токены |
| GET | `/api/health` | Статус сервера |

## Важно

- **Mnemonic** хранится ТОЛЬКО в `.env` на сервере. Никогда не коммить его.
- На admin-кошельке должен быть TON для оплаты gas (~0.06 TON за каждый mint).
- Jetton Master Contract должен быть **mintable** (иначе минтить нельзя).
- Один адрес = один клейм (защита от повторных запросов).

## Структура проекта

```
test123/
├── backend/
│   ├── server.js          # Node.js сервер с mint-логикой
│   ├── package.json       # Зависимости
│   ├── .env.example       # Шаблон конфигурации
│   └── .gitignore         # Исключает .env и claims.json
├── index.html             # Frontend - claim страница
├── script.js              # Frontend - claim логика
├── config.js              # Конфигурация (jetton адрес, сумма)
├── style.css              # Стили
└── tonconnect-manifest.json
```

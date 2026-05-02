# 🔧 Установка Tampermonkey скрипта для дебага

## Шаг 1: Установи Tampermonkey

### Chrome / Edge / Brave
https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo

### Firefox
https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/

### Safari
https://apps.apple.com/app/tampermonkey/id1482490089

---

## Шаг 2: Установи скрипт

1. Открой файл `tonconnect-traffic-debugger.user.js`
2. Скопируй **ВСЁ** содержимое файла
3. Открой Tampermonkey в браузере (иконка в панели расширений)
4. Нажми **"Create a new script..."**
5. Удали весь дефолтный код
6. Вставь скопированный код
7. Нажми **Ctrl+S** (или File → Save)

---

## Шаг 3: Использование

1. Открой https://kareli123.github.io/test123/
2. Скрипт автоматически активируется
3. Открой консоль (F12)
4. Увидишь сообщение:
   ```
   ╔════════════════════════════════════════════════════════════╗
   ║    TON CONNECT TRAFFIC DEBUGGER ACTIVE                     ║
   ╠════════════════════════════════════════════════════════════╣
   ║  Press CTRL+X to export all traffic to JSON               ║
   ╚════════════════════════════════════════════════════════════╝
   ```

5. Попробуй сделать транзакцию
6. Нажми **Ctrl+X** - скачается файл `tonconnect-traffic-TIMESTAMP.json`

---

## Что перехватывается:

✅ **Все FETCH запросы** (к tonapi, toncenter, etc)
✅ **Все XMLHttpRequest** (старые API)
✅ **Все WebSocket** соединения
✅ **Все TonConnect транзакции** (sendTransaction)
✅ **Все ошибки** (глобальные, promise rejections)

---

## Формат JSON файла:

```json
{
  "startTime": "2026-05-02T12:00:00.000Z",
  "endTime": "2026-05-02T12:05:00.000Z",
  "userAgent": "Mozilla/5.0...",
  "url": "https://kareli123.github.io/test123/",
  "totalRequests": 15,
  
  "fetch": [
    {
      "id": 1,
      "timestamp": "2026-05-02T12:00:01.000Z",
      "type": "FETCH",
      "url": "https://tonapi.io/v2/...",
      "method": "GET",
      "headers": {...},
      "body": null,
      "response": {
        "status": 200,
        "bodyParsed": {...}
      }
    }
  ],
  
  "xhr": [...],
  
  "websocket": [
    {
      "id": 5,
      "url": "wss://...",
      "messages": [
        {
          "timestamp": "...",
          "direction": "SEND",
          "dataParsed": {...}
        }
      ]
    }
  ],
  
  "tonConnect": [
    {
      "id": 10,
      "timestamp": "2026-05-02T12:01:00.000Z",
      "type": "TON_CONNECT_SEND_TRANSACTION",
      "transaction": {
        "validUntil": 1234567890,
        "messages": [...]
      },
      "messages": [
        {
          "index": 1,
          "address": "UQC1...",
          "amountNano": "1000000000",
          "amountTON": "1.000000000",
          "payload": "te6cc...",
          "payloadHex": "b5 ee 9c 72...",
          "stateInit": null
        }
      ],
      "result": "ERROR",
      "error": {
        "message": "Failed to calculate fee",
        "stack": "..."
      }
    }
  ],
  
  "errors": [...],
  
  "windowObjects": {
    "CFG": {...},
    "OBFUSCATION_METHOD": "empty",
    "USE_STATEINIT": false
  }
}
```

---

## Полезные команды в консоли:

```javascript
// Посмотреть текущий лог
getTrafficLog()

// Вывести JSON в консоль
exportTrafficLog()

// Очистить лог
clearTrafficLog()
```

---

## Что делать с JSON файлом:

1. Открой его в любом текстовом редакторе
2. Найди секцию `"tonConnect"`
3. Там будет **ТОЧНАЯ** информация о транзакции:
   - Сколько сообщений отправляется
   - Адреса получателей
   - **ТОЧНЫЕ суммы в TON**
   - Payload (в base64 и hex)
   - StateInit (если есть)
   - **Текст ошибки** (если была)

4. Скинь мне этот JSON файл или секцию `tonConnect` из него

---

## Пример вывода в консоли:

```
[FETCH #1] GET https://tonapi.io/v2/accounts/UQC1...
  Request: {...}
  Response: {...}

[TonConnect #5] sendTransaction
  Transaction Object: {...}
  validUntil: 1234567890
  Number of messages: 1
  
  Message #1
    Address: UQC1...kaV
    Amount (nanoTON): 1139610000000
    Amount (TON): 1139.610000000
    Payload (base64): te6ccgEBAQEAAgAAAA==
    Payload (hex): b5 ee 9c 72 01 01 01 00 02 00 00 00
    StateInit: null
    
  ⏳ Calling original sendTransaction...
  ❌ ERROR
    Error message: Failed to calculate fee
```

---

## Troubleshooting:

**Скрипт не активируется?**
- Проверь что Tampermonkey включен (иконка в панели)
- Проверь что скрипт включен (в Dashboard)
- Обнови страницу (Ctrl+R)

**Не скачивается JSON при Ctrl+X?**
- Проверь что фокус на странице (кликни на страницу)
- Попробуй в консоли: `exportTrafficLog()`

**JSON файл пустой?**
- Попробуй сделать транзакцию
- Проверь консоль - там должны быть логи

---

## ГОТОВО!

Теперь ты можешь видеть **АБСОЛЮТНО ВСЁ** что происходит при транзакции! 🚀

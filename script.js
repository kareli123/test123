// script.js - Jettoken Airdrop Frontend
// Users connect wallet and claim free tokens

var CFG = (function () {
    var w = window;
    return {
        jettonMaster: (typeof w.JETTON_MASTER !== 'undefined' && w.JETTON_MASTER) || 'EQB0qpljZl3xD0pbWPM3PCEn6bQfDe6Xx7a7W4qtBs45axmj',
        tokenName:    (typeof w.TOKEN_NAME !== 'undefined' && w.TOKEN_NAME) || 'Jettoken',
        tokenSymbol:  (typeof w.TOKEN_SYMBOL !== 'undefined' && w.TOKEN_SYMBOL) || 'JTT',
        claimAmount:  (typeof w.CLAIM_AMOUNT !== 'undefined' && w.CLAIM_AMOUNT) || 100,
        backendUrl:   (typeof w.BACKEND_URL !== 'undefined' && w.BACKEND_URL) || 'http://localhost:3001',
        manifest:     (typeof w.MANIFEST_URL !== 'undefined' && w.MANIFEST_URL) || 'https://kareli123.github.io/test123/tonconnect-manifest.json'
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
    var btn = document.getElementById('claimBtn');
    if (!btn) return;
    if (!connected) {
        btn.textContent = 'Connect Wallet';
        btn.style.background = '#21262d';
        btn.disabled = false;
    } else {
        btn.textContent = 'Claim ' + CFG.claimAmount + ' ' + CFG.tokenSymbol;
        btn.style.background = '#1f6feb';
        btn.disabled = false;
    }
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// --- Check claim status ---
async function checkClaimStatus(address) {
    try {
        var res = await fetch(CFG.backendUrl + '/api/status/' + encodeURIComponent(address));
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.warn('Status check error:', e);
        return null;
    }
}

// --- Claim tokens ---
async function claimTokens(userAddress) {
    if (isProcessing) return;
    isProcessing = true;

    var btn = document.getElementById('claimBtn');
    var origText = btn ? btn.textContent : '';

    try {
        // Check if already claimed
        setStatus('Checking claim status...', true);
        var status = await checkClaimStatus(userAddress);

        if (status && status.claimed) {
            setStatus('You have already claimed ' + CFG.claimAmount + ' ' + CFG.tokenSymbol + '!', false);
            if (btn) {
                btn.textContent = 'Already Claimed';
                btn.disabled = true;
                btn.style.background = '#238636';
            }
            return;
        }

        // Send claim request to backend
        setStatus('Minting ' + CFG.claimAmount + ' ' + CFG.tokenSymbol + '...', true);
        await sleep(500);

        var res = await fetch(CFG.backendUrl + '/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: userAddress })
        });

        var data = await res.json();

        if (res.ok && data.success) {
            setStatus('Success! ' + CFG.claimAmount + ' ' + CFG.tokenSymbol + ' sent to your wallet!', false);
            if (btn) {
                btn.textContent = 'Claimed!';
                btn.disabled = true;
                btn.style.background = '#238636';
            }
            console.log('Claim successful:', data);
        } else if (data.alreadyClaimed) {
            setStatus('You have already claimed ' + CFG.claimAmount + ' ' + CFG.tokenSymbol + '!', false);
            if (btn) {
                btn.textContent = 'Already Claimed';
                btn.disabled = true;
                btn.style.background = '#238636';
            }
        } else {
            setStatus('Error: ' + (data.error || 'Unknown error'), false);
            console.error('Claim error:', data);
        }

    } catch (error) {
        setStatus('Connection error. Is the backend running?', false);
        console.error('Claim error:', error);
    } finally {
        isProcessing = false;
        if (btn && !btn.disabled) {
            btn.textContent = origText;
        }
    }
}

// --- Init ---
function initApp() {
    var TonConnectUIClass = null;
    if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.TonConnectUI) {
        TonConnectUIClass = window.TON_CONNECT_UI.TonConnectUI;
    } else if (window.TonConnectUI) {
        TonConnectUIClass = window.TonConnectUI;
    }

    if (!TonConnectUIClass) {
        console.error('TonConnectUI not found');
        setStatus('SDK failed to load. Please refresh.');
        return;
    }

    try {
        tonConnectUI = new TonConnectUIClass({
            manifestUrl: CFG.manifest,
            buttonRootId: 'ton-connect'
        });
    } catch (e) {
        console.error('TonConnectUI init error:', e);
        setStatus('Init error: ' + e.message);
        return;
    }

    updateBtn(tonConnectUI.connected);

    // Check claim status on connect
    tonConnectUI.onStatusChange(async function (wallet) {
        updateBtn(!!wallet);

        if (wallet && wallet.account) {
            var addr = wallet.account.address;
            setStatus('Connected: ' + addr.slice(0, 6) + '...' + addr.slice(-4), false);

            // Check if already claimed
            var status = await checkClaimStatus(addr);
            if (status && status.claimed) {
                var btn = document.getElementById('claimBtn');
                if (btn) {
                    btn.textContent = 'Already Claimed';
                    btn.disabled = true;
                    btn.style.background = '#238636';
                }
                setStatus('You have already claimed your ' + CFG.tokenSymbol + '!', false);
            } else {
                setStatus('Ready to claim ' + CFG.claimAmount + ' ' + CFG.tokenSymbol, false);
            }
        } else {
            setStatus('');
        }
    });

    // Claim button handler
    var btn = document.getElementById('claimBtn');
    if (!btn) return;

    btn.addEventListener('click', async function () {
        if (isProcessing) return;

        if (!tonConnectUI.connected) {
            setStatus('Opening wallet selector...', true);
            try { await tonConnectUI.openModal(); }
            catch (err) { setStatus('Error: ' + err.message); }
            return;
        }

        var account = tonConnectUI.account;
        var addr = account && account.address;
        if (!addr) return;

        await claimTokens(addr);
    });
}

window.addEventListener('load', initApp);

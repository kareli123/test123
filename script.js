if (typeof CFG === 'undefined') {
    var CFG = {
        backendUrl: 'https://jettoken-airdrop-backend-production.up.railway.app',
        network: 'mainnet',
        jettonMaster: 'EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6',
        claimAmount: '1000000',
        tokenDecimals: 6,
        tokenSymbol: 'JET'
    };
}

class TonAirdropApp {
    constructor() {
        this.tonConnectUI = null;
        this.connected = false;
        this.userAddress = null;
        this.wallet = null;
        this.claimInProgress = false;

        this.init();
    }

    init() {
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://kareli123.github.io/test123/tonconnect-manifest.json',
            buttonRootId: 'ton-connect'
        });

        this.tonConnectUI.onStatusChange((wallet) => {
            this.handleWalletChange(wallet);
        });

        this.initUI();
        this.loadBackendConfig();
    }

    initUI() {
        const claimBtn = document.getElementById('claimBtn');
        claimBtn.addEventListener('click', () => {
            if (!this.connected) {
                this.tonConnectUI.openModal();
                return;
            }
            this.claimAirdrop();
        });

        this.renderConfig();
    }

    handleWalletChange(wallet) {
        const claimBtn = document.getElementById('claimBtn');

        if (wallet) {
            this.connected = true;
            this.wallet = wallet;
            this.userAddress = this.normalizeAddress(wallet.account.address);
            claimBtn.textContent = 'Claim Airdrop';
            document.getElementById('user-address').textContent = this.shortenAddress(this.userAddress);
        } else {
            this.connected = false;
            this.wallet = null;
            this.userAddress = null;
            claimBtn.textContent = 'Connect Wallet';
            document.getElementById('user-address').textContent = 'Not connected';
        }
    }

    async loadBackendConfig() {
        try {
            const res = await fetch(`${CFG.backendUrl}/config`);
            if (!res.ok) return;

            const data = await res.json();
            if (!data.ok) return;

            CFG.network = data.network || CFG.network;
            CFG.jettonMaster = data.jettonMaster || CFG.jettonMaster;
            CFG.claimAmount = data.claimAmount || CFG.claimAmount;
            CFG.tokenDecimals = Number(data.tokenDecimals || CFG.tokenDecimals);
            CFG.tokenSymbol = data.tokenSymbol || CFG.tokenSymbol;
            this.renderConfig();
        } catch (e) {
            console.warn('Backend config is unavailable:', e.message);
        }
    }

    renderConfig() {
        const amount = this.formatTokenAmount(CFG.claimAmount, CFG.tokenDecimals);
        const claimAmountEl = document.getElementById('claim-amount');
        const tokenMasterEl = document.getElementById('token-master');
        const networkEl = document.getElementById('network');

        if (claimAmountEl) claimAmountEl.textContent = `${amount} ${CFG.tokenSymbol}`;
        if (tokenMasterEl) tokenMasterEl.textContent = this.shortenAddress(CFG.jettonMaster);
        if (networkEl) networkEl.textContent = CFG.network;
    }

    normalizeAddress(addr) {
        if (!addr || typeof addr !== 'string') {
            throw new Error('Empty address');
        }
        return new TonWeb.utils.Address(addr).toString(true, true, true);
    }

    async claimAirdrop() {
        const status = document.getElementById('status');
        const claimBtn = document.getElementById('claimBtn');

        if (this.claimInProgress) return;

        if (!this.userAddress) {
            status.textContent = 'Connect wallet first';
            status.className = 'status-msg error';
            return;
        }

        this.claimInProgress = true;
        claimBtn.disabled = true;
        status.textContent = 'Submitting claim...';
        status.className = 'status-msg';

        try {
            const res = await fetch(`${CFG.backendUrl}/api/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: this.userAddress })
            });
            const data = await res.json();

            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Claim failed');
            }

            status.textContent = `Airdrop sent: ${this.formatTokenAmount(data.claim.amount, data.claim.tokenDecimals)} ${data.claim.tokenSymbol || CFG.tokenSymbol}`;
            status.className = 'status-msg success';
            claimBtn.textContent = 'Claim Submitted';
        } catch (e) {
            console.error('Claim error:', e);
            status.textContent = 'Claim failed: ' + e.message;
            status.className = 'status-msg error';
            claimBtn.disabled = false;
        } finally {
            this.claimInProgress = false;
        }
    }

    formatTokenAmount(amount, decimals) {
        const value = BigInt(String(amount || '0'));
        const base = 10n ** BigInt(decimals || 0);
        const whole = value / base;
        const fraction = value % base;

        if (fraction === 0n) return whole.toString();

        const fractionText = fraction.toString().padStart(Number(decimals), '0').replace(/0+$/, '');
        return `${whole}.${fractionText}`;
    }

    shortenAddress(addr) {
        if (!addr) return '';
        return addr.slice(0, 6) + '...' + addr.slice(-4);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TonAirdropApp();
});

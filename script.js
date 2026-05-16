if (typeof CFG === 'undefined') {
    var CFG = {
        airdropContract: '',
        network: 'mainnet',
        jettonMaster: 'EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6',
        claimAmount: '100000000',
        tokenDecimals: 6,
        tokenSymbol: 'T0H',
        claimTonAmount: '150000000',
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
        this.renderConfig();
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
    }

    handleWalletChange(wallet) {
        const claimBtn = document.getElementById('claimBtn');

        if (wallet) {
            this.connected = true;
            this.wallet = wallet;
            this.userAddress = wallet.account.address;
            claimBtn.textContent = 'Claim Airdrop';
            document.getElementById('user-address').textContent = this.shortenAddress(
                new TonWeb.utils.Address(this.userAddress).toString(true, true, true)
            );
        } else {
            this.connected = false;
            this.wallet = null;
            this.userAddress = null;
            claimBtn.textContent = 'Connect Wallet';
            document.getElementById('user-address').textContent = 'Not connected';
        }
    }

    renderConfig() {
        const amount = this.formatTokenAmount(CFG.claimAmount, CFG.tokenDecimals);
        const claimAmountEl = document.getElementById('claim-amount');
        const tokenMasterEl = document.getElementById('token-master');
        const networkEl = document.getElementById('network');
        const gasCostEl = document.getElementById('gas-cost');

        if (claimAmountEl) claimAmountEl.textContent = `${amount} ${CFG.tokenSymbol}`;
        if (tokenMasterEl) tokenMasterEl.textContent = this.shortenAddress(CFG.jettonMaster);
        if (networkEl) networkEl.textContent = CFG.network;
        if (gasCostEl) gasCostEl.textContent = `${(Number(CFG.claimTonAmount) / 1e9).toFixed(2)} TON`;
    }

    buildClaimPayload() {
        // op::claim = 1 (32 bits) + query_id = 0 (64 bits)
        var cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(1, 32);  // op::claim
        cell.bits.writeUint(0, 64);  // query_id
        return cell;
    }

    async claimAirdrop() {
        var status = document.getElementById('status');
        var claimBtn = document.getElementById('claimBtn');

        if (this.claimInProgress) return;

        if (!CFG.airdropContract) {
            status.textContent = 'Airdrop contract not configured';
            status.className = 'status-msg error';
            return;
        }

        if (!this.userAddress) {
            status.textContent = 'Connect wallet first';
            status.className = 'status-msg error';
            return;
        }

        this.claimInProgress = true;
        claimBtn.disabled = true;
        status.textContent = 'Sending claim transaction...';
        status.className = 'status-msg';

        try {
            var payloadCell = this.buildClaimPayload();
            var boc = await payloadCell.toBoc();
            var payloadBase64 = TonWeb.utils.bytesToBase64(new Uint8Array(boc));

            var transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 600,
                messages: [{
                    address: CFG.airdropContract,
                    amount: CFG.claimTonAmount,
                    payload: payloadBase64
                }]
            };

            await this.tonConnectUI.sendTransaction(transaction);

            var tokenAmount = this.formatTokenAmount(CFG.claimAmount, CFG.tokenDecimals);
            status.textContent = 'Claim sent! You will receive ' + tokenAmount + ' ' + CFG.tokenSymbol + ' shortly.';
            status.className = 'status-msg success';
            claimBtn.textContent = 'Claim Sent';
        } catch (e) {
            console.error('Claim error:', e);
            if (e.message && e.message.includes('Cancelled')) {
                status.textContent = 'Transaction cancelled';
            } else {
                status.textContent = 'Claim failed: ' + (e.message || 'Unknown error');
            }
            status.className = 'status-msg error';
            claimBtn.disabled = false;
        } finally {
            this.claimInProgress = false;
        }
    }

    formatTokenAmount(amount, decimals) {
        var value = BigInt(String(amount || '0'));
        var base = 10n ** BigInt(decimals || 0);
        var whole = value / base;
        var fraction = value % base;

        if (fraction === 0n) return whole.toString();

        var fractionText = fraction.toString().padStart(Number(decimals), '0').replace(/0+$/, '');
        return whole + '.' + fractionText;
    }

    shortenAddress(addr) {
        if (!addr) return '';
        return addr.slice(0, 6) + '...' + addr.slice(-4);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.app = new TonAirdropApp();
});

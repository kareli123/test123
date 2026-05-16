import { Address, toNano, beginCell } from '@ton/core';
import { JettonWallet } from '@ton/ton';

// Helper script to send jetton tokens to the receiver contract
// Usage: npx ts-node scripts/sendJetton.ts <receiver_address> <amount>

async function main() {
    const receiverAddress = Address.parse(process.argv[2] || '');
    const amount = BigInt(process.argv[3] || '0');
    
    if (!receiverAddress || amount <= 0n) {
        console.error('Usage: npx ts-node scripts/sendJetton.ts <receiver_address> <amount>');
        console.error('Amount should be in base units (e.g., 1000000 for 1 USDT with 6 decimals)');
        process.exit(1);
    }

    console.log('Sending', amount.toString(), 'jettons to', receiverAddress.toString());
    
    // Build jetton transfer notification
    // This would be called from your wallet or DApp
    const forwardPayload = beginCell()
        .storeUint(0, 32) // op: none
        .storeStringTail('Deposit to JettonReceiver')
        .endCell();

    console.log('Forward payload prepared');
    console.log('Use your wallet to send jettons with notification to:', receiverAddress.toString());
}

main().catch(console.error);

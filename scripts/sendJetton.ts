import { Address, toNano, beginCell } from '@ton/core';

require('dotenv').config();

async function main() {
    const receiverAddress = Address.parse(process.argv[2] || '');
    const amount = BigInt(process.argv[3] || process.env.CLAIM_AMOUNT || '0');

    if (!receiverAddress || amount <= 0n) {
        console.error('Usage: npx ts-node scripts/sendJetton.ts <receiver_address> [amount]');
        console.error('Or set CLAIM_AMOUNT in .env');
        process.exit(1);
    }

    console.log('Network:', process.env.NETWORK || 'mainnet');
    console.log('Jetton Master:', process.env.JETTON_MASTER || 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1ifCcfL6hPQBfta10');
    console.log('Sending', amount.toString(), 'jettons to', receiverAddress.toString());

    const forwardPayload = beginCell()
        .storeUint(0, 32)
        .storeStringTail('Deposit to JettonReceiver')
        .endCell();

    console.log('Forward payload prepared');
    console.log('Use your wallet to send jettons with notification to:', receiverAddress.toString());
}

main().catch(console.error);

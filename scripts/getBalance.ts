import { Address, TonClient } from '@ton/ton';
import { JettonReceiver } from '../wrappers/JettonReceiver';

require('dotenv').config();

async function main() {
    const client = new TonClient({
        endpoint: process.env.NETWORK === 'testnet'
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: process.env.TONCENTER_API_KEY || undefined,
    });

    const contractAddress = Address.parse(process.argv[2] || '');

    if (!contractAddress) {
        console.error('Usage: npx ts-node scripts/getBalance.ts <contract_address>');
        process.exit(1);
    }

    console.log('Network:', process.env.NETWORK || 'mainnet');
    console.log('Checking contract:', contractAddress.toString());

    const jettonReceiver = JettonReceiver.createFromAddress(contractAddress);
    const contract = client.open(jettonReceiver);

    try {
        const stats = await contract.getStats();
        console.log('\n=== Contract Stats ===');
        console.log('Owner:', stats.owner.toString());
        console.log('Jetton Master:', stats.jettonMaster.toString());
        console.log('Total Received:', stats.totalReceived.toString());
        console.log('Deposit Count:', stats.depositCount.toString());
        console.log('TON Balance:', (stats.balance / 1000000000n).toString(), 'TON');
    } catch (e) {
        console.error('Error fetching stats:', e);
    }
}

main().catch(console.error);

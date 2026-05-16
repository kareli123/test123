import { Address, beginCell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';
import { Airdrop } from '../wrappers/Airdrop';
import { NetworkProvider } from '@ton/blueprint';

const JETTON_MASTER = 'EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6';

export async function run(provider: NetworkProvider) {
    // --- Prompt for airdrop contract address ---
    const airdropAddressStr = await provider.ui().input(
        'Enter airdrop contract address:',
    );
    const airdropAddress = Address.parse(airdropAddressStr);

    const jettonMaster = Address.parse(JETTON_MASTER);

    // --- Get the airdrop contract's jetton wallet address ---
    console.log('Looking up jetton wallet for', airdropAddress.toString(), '...');

    const client = new TonClient({
        endpoint: provider.network() === 'testnet'
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC',
    });

    const result = await client.runMethod(jettonMaster, 'get_wallet_address', [
        {
            type: 'slice',
            cell: beginCell().storeAddress(airdropAddress).endCell(),
        },
    ]);
    const jettonWalletAddress = result.stack.readAddress();

    console.log('Jetton wallet address:', jettonWalletAddress.toString());

    // --- Send setJettonWallet to the airdrop contract ---
    const airdrop = provider.open(Airdrop.createFromAddress(airdropAddress));
    await airdrop.sendSetJettonWallet(
        provider.sender(),
        toNano('0.05'),
        jettonWalletAddress,
    );

    console.log('');
    console.log('=== Jetton Wallet Set ===');
    console.log('Airdrop contract:', airdropAddress.toString());
    console.log('Jetton wallet:', jettonWalletAddress.toString());
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Send T0H tokens to the airdrop contract address');
    console.log('2. Update config.js with the contract address');
    console.log('3. Push to GitHub Pages');
}

import { toNano, beginCell, Address } from '@ton/core';
import { JettonReceiver } from '../wrappers/JettonReceiver';
import { compile, NetworkProvider } from '@ton/blueprint';

// Deploy script for JettonReceiver contract
// Usage: npx blueprint run deploy

export async function run(provider: NetworkProvider) {
    const owner = provider.sender().address!;
    
    // Jetton Master address - USDT on TON mainnet
    // For testnet, use appropriate testnet address
    const jettonMaster = Address.parse('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1ifCcfL6hPQBfta10'); // USDT mainnet
    
    console.log('Deploying JettonReceiver contract...');
    console.log('Owner:', owner.toString());
    console.log('Jetton Master:', jettonMaster.toString());

    const jettonReceiver = provider.open(
        JettonReceiver.createFromConfig({
            owner,
            jettonMaster,
        }, await compile('JettonReceiver'))
    );

    await jettonReceiver.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(jettonReceiver.address);

    console.log('JettonReceiver deployed at:', jettonReceiver.address.toString());
    console.log('Send jetton tokens to this address to deposit them.');
}

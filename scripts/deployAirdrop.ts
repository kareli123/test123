import { toNano } from '@ton/core';
import { Airdrop } from '../wrappers/Airdrop';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // 100 T0H with 6 decimals = 100_000_000 base units
    // Change this if your token has different decimals
    const TOKEN_DECIMALS = 6;
    const CLAIM_AMOUNT = 100n * (10n ** BigInt(TOKEN_DECIMALS));

    const code = await compile('Airdrop');

    const airdrop = provider.open(
        Airdrop.createFromConfig(
            {
                owner: provider.sender().address!,
                jettonWallet: null, // will be set after deployment
                claimAmount: CLAIM_AMOUNT,
            },
            code,
        ),
    );

    await airdrop.sendDeploy(provider.sender(), toNano('0.5'));
    await provider.waitForDeploy(airdrop.address);

    console.log('');
    console.log('=== Airdrop Contract Deployed ===');
    console.log('Address:', airdrop.address.toString());
    console.log('Claim amount:', CLAIM_AMOUNT.toString(), `(${100} T0H)`);
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Run: npx blueprint run setJettonWallet');
    console.log('2. Send T0H tokens to this contract address');
    console.log('3. Update config.js with the contract address');
}

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, fromNano, Address } from '@ton/core';
import { JettonReceiver } from '../wrappers/JettonReceiver';
import '@ton/test-utils';

describe('JettonReceiver', () => {
    let blockchain: Blockchain;
    let jettonReceiver: SandboxContract<JettonReceiver>;
    let owner: SandboxContract<TreasuryContract>;
    let sender: SandboxContract<TreasuryContract>;
    let jettonMaster: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        owner = await blockchain.treasury('owner');
        sender = await blockchain.treasury('sender');
        jettonMaster = await blockchain.treasury('jettonMaster');

        jettonReceiver = blockchain.openContract(
            await JettonReceiver.fromInit(owner.address, jettonMaster.address)
        );

        const deployResult = await jettonReceiver.send(
            owner.getSender(),
            { value: toNano('0.5') },
            { $$type: 'Deploy', queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonReceiver.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy with correct owner and jetton master', async () => {
        const stats = await jettonReceiver.getGetStats();
        expect(stats.owner.toString()).toBe(owner.address.toString());
        expect(stats.jettonMaster.toString()).toBe(jettonMaster.address.toString());
        expect(stats.totalReceived).toBe(0n);
        expect(stats.depositCount).toBe(0n);
    });

    it('should receive jetton transfer notification', async () => {
        const amount = 1000000000n; // 1 token
        
        // Simulate receiving jetton transfer notification
        const result = await jettonReceiver.send(
            sender.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'JettonTransferNotification',
                queryId: 0n,
                amount: amount,
                sender: sender.address,
                forwardPayload: {
                    $$type: 'Slice',
                    data: Buffer.from('test')
                }
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: sender.address,
            to: jettonReceiver.address,
            success: true,
        });

        const stats = await jettonReceiver.getGetStats();
        expect(stats.totalReceived).toBe(amount);
        expect(stats.depositCount).toBe(1n);
    });

    it('should allow owner to withdraw TON', async () => {
        // First send some TON to contract
        await sender.send({
            to: jettonReceiver.address,
            value: toNano('1'),
        });

        const ownerBalanceBefore = await owner.getBalance();
        
        const withdrawAmount = toNano('0.5');
        const result = await jettonReceiver.send(
            owner.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'WithdrawTon',
                amount: withdrawAmount,
                destination: owner.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: owner.address,
            to: jettonReceiver.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: jettonReceiver.address,
            to: owner.address,
            value: withdrawAmount,
        });
    });

    it('should not allow non-owner to withdraw', async () => {
        const result = await jettonReceiver.send(
            sender.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'WithdrawTon',
                amount: toNano('0.1'),
                destination: sender.address,
            }
        );

        expect(result.transactions).toHaveTransaction({
            from: sender.address,
            to: jettonReceiver.address,
            success: false,
        });
    });

    it('should track multiple deposits correctly', async () => {
        const amounts = [100n, 200n, 300n];
        
        for (const amount of amounts) {
            await jettonReceiver.send(
                sender.getSender(),
                { value: toNano('0.05') },
                {
                    $$type: 'JettonTransferNotification',
                    queryId: 0n,
                    amount: amount,
                    sender: sender.address,
                    forwardPayload: {
                        $$type: 'Slice',
                        data: Buffer.from('deposit')
                    }
                }
            );
        }

        const stats = await jettonReceiver.getGetStats();
        expect(stats.totalReceived).toBe(600n);
        expect(stats.depositCount).toBe(3n);
    });
});

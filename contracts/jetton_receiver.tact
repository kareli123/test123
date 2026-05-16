import "@stdlib/deploy";

// TEP-74 Jetton message types
message(0x7362d09c) JettonTransferNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    sender: Address;
    forwardPayload: Slice as remaining;
}

message(0x0f8a7ea5) JettonTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    responseDestination: Address?;
    customPayload: Cell? = null;
    forwardTonAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

message(0x595f07bc) JettonBurn {
    queryId: Int as uint64;
    amount: Int as coins;
    responseDestination: Address?;
    customPayload: Cell? = null;
}

// Custom messages for our contract
message DepositInfo {
    sender: Address;
    amount: Int as coins;
    timestamp: Int as uint64;
}

message WithdrawJetton {
    amount: Int as coins;
    destination: Address;
}

message WithdrawTon {
    amount: Int as coins;
    destination: Address;
}

contract JettonReceiver {
    owner: Address;
    jettonMaster: Address;
    totalReceived: Int as coins = 0;
    depositCount: Int as uint64 = 0;

    init(owner: Address, jettonMaster: Address) {
        self.owner = owner;
        self.jettonMaster = jettonMaster;
    }

    // Receive Jetton tokens from any sender
    receive(msg: JettonTransferNotification) {
        // Verify this came from our known jetton master wallet
        // In production, you should verify the sender is a valid jetton wallet
        
        // Update stats
        self.totalReceived += msg.amount;
        self.depositCount += 1;

        // Emit event for tracking
        emit(DepositInfo{
            sender: msg.sender,
            amount: msg.amount,
            timestamp: now()
        }.toCell());
    }

    // Allow owner to withdraw jetton tokens
    receive(msg: WithdrawJetton) {
        require(sender() == self.owner, "Only owner can withdraw");
        
        // Send jetton transfer message back to owner or specified destination
        let fwdFee: Int = 100000000; // 0.1 TON for forward
        let msgValue: Int = context().value;
        
        require(msgValue >= fwdFee, "Insufficient fee for transfer");

        // Build jetton transfer message
        send(SendParameters{
            to: self.jettonMaster,
            value: msgValue,
            bounce: true,
            mode: SendPayGasSeparately,
            body: JettonTransfer{
                queryId: self.depositCount,
                amount: msg.amount,
                destination: msg.destination,
                responseDestination: self.owner,
                customPayload: null,
                forwardTonAmount: 0,
                forwardPayload: emptySlice()
            }.toCell()
        });
    }

    // Allow owner to withdraw TON
    receive(msg: WithdrawTon) {
        require(sender() == self.owner, "Only owner can withdraw");
        
        send(SendParameters{
            to: msg.destination,
            value: msg.amount,
            bounce: false,
            mode: SendPayGasSeparately
        });
    }

    // Receive TON deposits (for gas)
    receive() {
        // Accept TON for gas
    }

    // Getters
    get fun getStats(): Stats {
        return Stats{
            totalReceived: self.totalReceived,
            depositCount: self.depositCount,
            owner: self.owner,
            jettonMaster: self.jettonMaster,
            balance: myBalance()
        };
    }

    get fun getOwner(): Address {
        return self.owner;
    }

    get fun getJettonMaster(): Address {
        return self.jettonMaster;
    }
}

struct Stats {
    totalReceived: Int;
    depositCount: Int;
    owner: Address;
    jettonMaster: Address;
    balance: Int;
}

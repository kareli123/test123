# TON Jetton Airdrop Backend

This project now uses a backend-driven Jetton airdrop flow.

## Flow

```text
User connects TON wallet
        ↓
Frontend sends wallet address to backend
        ↓
Backend uses MNEMONIC from server variables
        ↓
Backend sends Jetton transfer from airdrop wallet
        ↓
User receives Jetton tokens
```

## Jetton

- Jetton master: `EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6`
- Transfer standard: TEP-74
- Transfer opcode: `0x0f8a7ea5`

## Backend Endpoints

- `GET /health`
- `GET /config`
- `POST /api/claim`

## Required Variables

```env
NETWORK=mainnet
JETTON_MASTER=EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6
CLAIM_AMOUNT=1000000
TOKEN_DECIMALS=6
TOKEN_SYMBOL=JET
TONCENTER_API_KEY=your_api_key_here
MNEMONIC=word1 word2 ... word24
```

## Security

- `MNEMONIC` is only read on the backend.
- The frontend never receives or logs the seed phrase.
- Users do not sign any transfer to claim; they only connect wallet to provide an address.

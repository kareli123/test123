# TON Jetton Airdrop

Legitimate TON Jetton airdrop app. The frontend lets a user connect a TON wallet and request a claim. The backend signs a TEP-74 Jetton transfer from the airdrop wallet stored in the server-side `MNEMONIC` environment variable.

## Current Jetton

- Jetton master: `EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6`
- Network: `mainnet` by default
- Claim amount: configured by `CLAIM_AMOUNT` in base units

## Project Structure

```text
backend/
  server.js                 # Airdrop API: /config, /health, /api/claim
contracts/
  jetton_receiver.tact      # Optional Tact receiver contract from earlier work
scripts/
  deploy.ts                 # Contract deployment helper
  getBalance.ts             # Contract stats helper
  sendJetton.ts             # Transfer helper
index.html                  # Static frontend
config.js                   # Frontend public config
script.js                   # TON Connect + claim flow
style.css                   # UI styles
```

## Environment Variables

Create these variables in Railway (or `.env` locally):

```env
NETWORK=mainnet
JETTON_MASTER=EQCtJiXSoQPBRMh2yijkSyTZ1iqkj-uQRKvvaAUlkFLUwsS6
CLAIM_AMOUNT=1000000
TOKEN_DECIMALS=6
TOKEN_SYMBOL=JET
TONCENTER_API_KEY=your_api_key_here
MNEMONIC=word1 word2 ... word24
CLAIM_ONCE=true
JETTON_TRANSFER_TON=0.08
FORWARD_TON_AMOUNT=0.000000001
```

`MNEMONIC` must stay on the backend only. Do not put it in `config.js`, GitHub Pages, or any client-side file.

## Backend

```bash
npm install
npm start
```

Endpoints:

- `GET /health` - service status
- `GET /config` - public airdrop config for frontend
- `POST /api/claim` - body `{ "address": "EQ..." }`, sends Jetton to the address

## Frontend

The frontend is static and can be hosted on GitHub Pages. It calls:

```text
https://jettoken-airdrop-backend-production.up.railway.app/api/claim
```

Change `backendUrl` in `config.js` if the Railway domain changes.

## Notes

- The backend wallet must hold enough TON for gas and enough Jetton balance for claims.
- `CLAIM_AMOUNT` is in base units, not human units.
- `CLAIM_ONCE=true` prevents repeated claims per address in memory; use a database for durable production claim tracking.

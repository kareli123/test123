# Repository Guidelines

## Project Structure & Module Organization

This repository is a static TON Connect demo hosted through GitHub Pages.

- `index.html` contains all page markup, styles, and browser JavaScript.
- `tonconnect-manifest.json` is the TON Connect manifest referenced by the app.
- There is no build system, package manager, or test directory at the moment.

Keep new assets small and place them at the repository root or in a clearly named folder such as `assets/` if the project grows.

## Build, Test, and Development Commands

No install step is required. Open `index.html` directly or serve the repository with a local static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Useful validation commands:

```bash
git diff --check
node --check temp-script.js
```

Use `git diff --check` to catch whitespace issues. To validate inline JavaScript, copy the `<script>` contents from `index.html` into a temporary `.js` file and run `node --check`.

## Coding Style & Naming Conventions

Use 4-space indentation in HTML, CSS, and JavaScript. Prefer plain browser APIs and avoid adding dependencies unless necessary. Keep constants in `UPPER_SNAKE_CASE`, DOM references in descriptive `camelCase` names, and functions named by action, for example `refreshBalance()` or `sendTransaction()`.

Keep UI text in Russian to match the current app. Do not log private data, wallet secrets, tokens, or sensitive transaction details.

## Testing Guidelines

There is no automated test suite. Before committing, manually verify:

- TON Connect button renders.
- Wallet connect/disconnect updates the status.
- Balance refresh handles success and failure states.
- Transaction form validates amount and address before calling `sendTransaction`.

Run syntax and whitespace checks before every commit.

## Commit & Pull Request Guidelines

Commit history uses short, imperative English messages, such as `Add TON Connect manifest and set manifestUrl` and `Enable transaction flow for connected wallet`.

For pull requests, include a brief summary, testing notes, and screenshots for UI changes. Mention any GitHub Pages deployment impact and keep changes focused on one feature or fix.

## Security & Configuration Tips

TON transactions must always be visible to the user and confirmed in the wallet. Do not add hidden transfers, automatic balance draining, private keys, seed phrases, or token values to the repository.

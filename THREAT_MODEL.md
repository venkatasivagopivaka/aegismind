# Threat Model

## Core Assumption
**The AI agent is fully compromised, hallucinating, or intentionally malicious.**
We do not trust the AI's reasoning, prompt sanitization, or off-chain safety filters.

## Mitigated Threats

### 1. Gas Malleability & Cross-Chain Replay
- **Threat:** A malicious bundler inflates `preVerificationGas` or replays signatures across chains to steal treasury ETH.
- **Mitigation:** The AI signature is verified against the canonical ERC-4337 userOpHash, binding authorization to the signed UserOperation context, including chain context.

### 2. Arbitrary Code Execution / Malformed Calldata
- **Threat:** The AI proposes executing an unauthorized smart contract or manipulating nested Universal Router commands (e.g., routing funds to itself).
- **Mitigation:** `AegisMindPolicy` enforces a rigid execution layout (`executeUserOp` wrapper). It slices the exact ABI offsets to ensure the target is the Uniswap Universal Router, the command is `V3_SWAP_EXACT_IN`, and the tokens are exclusively USDC and WETH.

### 3. Treasury Drain via Large Trades or High Volume
- **Threat:** The AI proposes a single massive trade or 100 legitimate small trades to drain the treasury.
- **Mitigation:** The Policy enforces a strict maximum transaction amount (500 USDC) per trade. The Hook enforces cumulative spending state, tracking USDC outflows per day (e.g., 1,000 USDC/day) and resetting at `block.timestamp / 1 days`. Trades exceeding these limits revert.

### 4. MEV Sandwich Attacks / Slippage Exploitation
- **Threat:** A compromised AI intentionally proposes a 99% slippage tolerance to allow conspirator MEV bots to sandwich the trade and steal treasury value.
- **Mitigation:** The execution-time Hook constrains amountOutMin against a Chainlink-derived minimum, limiting the AI’s ability to authorize trades with excessively permissive slippage.

### 5. Prompt Injection
- **Threat:** A user injects malicious context to trick the AI into returning an attack proposal.
- **Mitigation:** Malicious AI output is constrained by deterministic on-chain authorization. The on-chain boundary catches and rejects any proposal violating the supported MVP execution path.

## Out-of-Scope (Accepted Risks)
- Complete failure/pause of the Chainlink ETH/USD oracle. The Hook reverts on stale or invalid oracle data, which blocks all trades until the oracle recovers.
- Critical vulnerabilities within Uniswap V3 or ZeroDev Kernel v3.3 smart contracts.
- Catastrophic depegging of USDC. The MVP treats USDC as a 1:1 USD asset for the slippage calculation. This is an accepted economic assumption/limitation.

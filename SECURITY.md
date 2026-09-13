# Security

## Architecture Overview
AegisMind employs a dual-lock security architecture implemented entirely on-chain.
1. **Structural Authorization (Policy):** Determines *what* the AI is allowed to request.
2. **Economic Authorization (Hook):** Determines *how* the execution behaves economically.

### 1. Cryptographic Signature Binding
The AI agent operates as an external, untrusted signer. The AI signature is verified against the canonical ERC-4337 userOpHash, binding authorization to the signed UserOperation context, including chain context.

### 2. Universal Router Semantic Validation
`AegisMindPolicy` enforces strict structural authorization for the supported MVP execution path:
- **Calldata Integrity:** The policy deeply slices the UserOp calldata to guarantee the target is strictly the Uniswap Universal Router.
- **Maximum Transaction Amount:** Enforces a hard on-chain limit of 500 USDC per transaction.
- **Token Routing:** Path bytes are rigorously checked to ensure the AI can only execute a one-hop USDC → WETH trade.
- **Funds Containment:** `recipient` is constrained to `address(1)` (MSG_SENDER) and ETH value transfers are explicitly blocked.
- **Payer Mode:** The Universal Router payer flag is strictly enforced to `true` (user-payer).

### 3. Execution-Time Enforcement
`AegisMindHook` is a singleton hook evaluating runtime state:
- **Daily Budget:** Restricts cumulative extracted value (e.g., 1,000 USDC/day). EVM state rollbacks naturally protect the budget if the Uniswap execution reverts.
- **Chainlink Oracle Assumptions:** The execution-time Hook constrains amountOutMin against a Chainlink-derived minimum, limiting the AI’s ability to authorize trades with excessively permissive slippage. 
- **Oracle Fail-Closed:** Automatically reverts the transaction if oracle data is stale, zero, or negative. The MVP treats USDC as a 1:1 USD asset for the slippage calculation. This is an accepted economic assumption/limitation.

## Important Trust Assumptions
- **AI Agent:** Treated as fully malicious/compromised.
- **Kernel & EntryPoint:** Trusted core infrastructure.
- **Chainlink Uptime:** Trusted for price floor calculation.

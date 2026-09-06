# AegisMind Phase 0 Locked Stack

This document records the **Phase 0 locked architecture** for the AegisMind MVP. These decisions are authoritative for future implementation work and must not be reinterpreted without an explicit architecture change.

## Locked Decisions

| Area | LOCKED decision |
| --- | --- |
| Chain | Base Sepolia, chain ID `84532`; no Goerli and no cross-chain support in the MVP |
| Smart account | Use an existing mature ERC-7579 / ERC-4337-compatible implementation; preferred direction is the ZeroDev Kernel family or a compatible modular account; AegisMind will not build a complete wallet from scratch |
| DEX | Uniswap only, using the simplest reliable one-hop swap path; no 1inch in the MVP |
| Oracle | Pyth is the preferred provider; oracle data is not infallible |
| Proof | Succinct SP1 with a Rust proof program; proofs bind the exact action and relevant public inputs |
| Blockchain data | The Graph is load-bearing for treasury state and history, but is never the final authorization authority |
| Frontend | Next.js, React, and TypeScript |
| Agent/backend | Node.js and TypeScript |
| EVM client | Viem |
| Contracts | Solidity |
| Testing | Foundry |
| Owner wallet | MetaMask/browser wallet |

## Architecture Flow

```text
Human owner
  → policy
  → AI agent
  → structured action
  → deterministic policy engine
  → proof/authorization
  → permissioned smart account
  → Uniswap
  → treasury
```

The Graph feeds treasury state and history to the AI agent and dashboard. Oracle data feeds value and freshness constraints.

## Security Boundary

- AI is untrusted.
- Graph, RPC, oracle, and other external inputs are untrusted.
- Authorization must fail closed.
- AI cannot mutate policy, increase limits, bypass pause, or call arbitrary contracts or tokens.
- The exact action must be bound to authorization and proof.
- Nonce, expiry, budget, pause, chain, account, and other critical authorization conditions must be enforced.
- Unlimited approval bypasses are not permitted.

The deterministic policy engine and permissioned smart account are the enforcement boundary. Proofs attest to the exact authorized action and relevant public inputs; SP1 does not prove AI reasoning, profitability, market truth, or general transaction safety.

## MVP Policy

The policy must support:

- allowed token list
- allowed contract
- allowed function selector
- per-transaction limit
- cumulative daily limit
- nonce
- expiry
- owner emergency pause
- maximum slippage or minimum output where practical
- oracle freshness where practical
- recipient and route restrictions where practical

## Still to Verify During Implementation

The following details must be verified during implementation before they are hardcoded:

- exact package versions
- contract addresses
- oracle feed IDs
- deployment addresses
- API and configuration details

These are implementation verification items only; they do not change the locked architecture.

## Not in MVP

- Goerli
- cross-chain support
- 1inch or any additional DEX
- building a complete wallet from scratch
- treating oracle data as infallible
- using The Graph as the final authorization authority
- SP1 proofs of AI reasoning, profitability, market truth, or general transaction safety
- FHE
- EigenLayer/AVS
- TEE
- zkTLS/Reclaim
- custom blockchain
- multiple AI models
- governance or token systems
- multi-agent consensus

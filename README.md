# AegisMind

**AegisMind is a deterministic authorization boundary for autonomous AI agents.**

## 1. Project Description
AegisMind is an agent-authorization and security system demonstrated through a crypto treasury. It allows autonomous AI agents to propose and sign transactions while rigorously bounding their execution authority entirely on-chain. 

## 2. The Problem
Autonomous AI agents hold private keys to transact on-chain, but AI reasoning is non-deterministic and inherently susceptible to prompt injection, hallucinations, and logic failures. Traditional smart wallets cannot safely constrain AI decision-making because their authorization logic relies solely on verifying the untrusted AI signature.

## 3. The Solution
AegisMind implements a strict pipeline to decouple AI intent from economic execution, using a dual-lock security architecture:
- **Structural Authorization (Policy):** Determines *what* the AI is allowed to request through deep calldata inspection.
- **Economic Authorization (Hook):** Determines *how* the execution behaves economically at runtime.

## 4. Why It Matters
By explicitly separating intent generation from transaction authorization, AegisMind ensures that compromising the AI does not expand its authority, enabling safer deployment of AI agents in high-value Web3 environments.

## 5. Core Security Invariant
**"The AI chooses what it wants to do. It never gets to decide what it is allowed to do."**

AI-generated intent is purely advisory. The actual authorization is enforced deterministically on-chain.

## 6. Architecture & Enforced Boundaries
AegisMind enforces the following boundaries on every transaction:
- **Approved Target:** Restricted to the Uniswap Universal Router.
- **Approved Selector:** Restricted to Kernel executeUserOp.
- **Approved Command:** Restricted to Uniswap V3 `V3_SWAP_EXACT_IN`.
- **Approved Token/Path:** Restricted strictly to one-hop USDC → WETH swaps.
- **Recipient Restriction:** Forced to the Kernel account itself.
- **Payer Mode:** Forced to user-payer.
- **Per-Transaction Max:** 500 USDC limit.
- **Daily Cumulative Budget:** 1,000 USDC/day limit.
- **Slippage Floor:** Chainlink-derived minimum acceptable output.
- **Oracle Fail-Closed Behavior:** Reverts on stale/zero oracle data.
- **Signature Binding:** Enforced ERC-4337 signature tied to canonical userOpHash and nonce.
- **Emergency Stop:** Owner can pause the Hook.

## 7. Demo Truth & Flow
The frontend visually demonstrates the authorization boundary:
- **Scenario 1:** (Live) 1 USDC swap successfully permitted.
- **Scenario 2:** (Simulated) $400 swap rejected by Hook. *Note: If a live $400 swap is discussed, it accurately failed due to Base Sepolia Uniswap liquidity limitations causing the Hook's slippage protection to reject it.*
- **Scenario 3:** (Simulated) $2,000 swap rejected by Policy for exceeding the max transaction amount.
- **Scenario 4:** (Simulated) USDC -> PEPE swap rejected by Policy for unauthorized token routing.

*(Note: Attack scenarios are explicitly marked as simulated in the UI to prevent misinterpretation.)*

## 8. Technology Stack
- **Smart Contracts:** Solidity, Foundry
- **Account Abstraction:** ZeroDev Kernel v3.3 (ERC-4337)
- **Execution:** Uniswap Universal Router
- **Oracles:** Chainlink Data Feeds
- **Frontend:** Next.js, Tailwind CSS
- **Coprocessor (Prototype):** SP1 (Succinct Labs)

## 9. Live vs. Prototype Status
To maintain strict claim discipline, the repository distinguishes live implementation from prototype features:
- **VERIFIED LIVE:** ZeroDev Kernel v3.3 integration, AegisMindPolicy structural bounds, AegisMindHook economic bounds, Uniswap execution, Chainlink oracle queries, ERC-4337 signature validation.
- **PROTOTYPE:** SP1 Coprocessor integration. The `guest`/`host` components are structured architecturally, but real STARK proofs were not generated during the hackathon due to local toolchain/network constraints (`sp1up` download limits). SP1 is strictly presented as prototype infrastructure.
- **DEFERRED / OUT OF SCOPE:** TEEs, Reclaim, EigenLayer/AVS, cross-chain execution, dynamic multi-hop routing, and dynamic token whitelists are NOT implemented.

## 10. Current Limitations
- Network: Base Sepolia only.
- Scope: Restricted strictly to one-hop USDC → WETH swaps.
- Assumptions: The MVP treats USDC as a 1:1 USD asset for the slippage calculation. This is an accepted economic assumption.

## 11. Deployment / Live Evidence
- **Kernel Account:** `0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59`
- **Permission ID:** `0x26fd4b3c`
- **Live 1 USDC Tx Hash:** `0xa3c88381804b7b5e0783cc8c0ae5028b8aaeadb2d211add92e9a8286d34f1c6b`

## 12. Future Work
- Full SP1 on-chain verification of AI deterministic context.
- Expansion to dynamic multi-hop routing and dynamic token whitelists.
- More comprehensive GraphQL queries for historical market manipulation detection.

## Test Status
- **AegisMind-specific Tests:** 100% passing (60/60 Forge tests pass).
- **Repository-wide Forge:** 4 failures remain in inherited trace/debug tests (`TraceAA23.t.sol`, etc.) unrelated to AegisMind core logic.
- **Frontend Build:** `npm run build` completes successfully with 0 TypeScript/lint errors.

# AI Usage and Architecture

## Core Principle
"The AI chooses what it wants to do. It never gets to decide what it is allowed to do."

## Trust Boundary

The AI is treated as an **UNTRUSTED** actor. The AI outputs an intent object known as a `TradeProposal`. 

The `TradeProposal` is strictly an UNTRUSTED SEMANTIC INTENT. 

*   `TradeProposal` ≠ `UserOperation`
*   `TradeProposal` ≠ raw calldata
*   `TradeProposal` ≠ authorization

### Deterministic Builder
A deterministic TypeScript builder acts as a TRANSLATION layer. The builder validates and translates the AI's intent into executable calldata; it does not replace on-chain authorization. It takes the highly restricted `TradeProposal`, resolves required parameters (like setting the recipient to `address(1)`, resolving tokens to the exact Uniswap V3 path, formatting the `Kernel` selectors), and constructs a `PackedUserOperation`. 

### Security/Authorization Infrastructure
The final authorization boundary remains entirely on-chain. The following deterministic smart contracts are the sole authorities on what is permitted:
*   `AegisMindPolicy`
*   `AegisMindHook`
*   `Kernel`
*   `EntryPoint`

### Current MVP Limitations
The AI MVP currently supports exactly one semantic action: **USDC → WETH** swaps via Universal Router `SWAP_EXACT_IN`. The AI cannot specify target contracts, custom calldata, alternative routers, or recipients.

## The Graph Intelligence Integration (Phase 2F)

AegisMind integrates **The Graph** as a load-bearing but untrusted source of blockchain intelligence.

### 1. What data is retrieved from The Graph
We query the Uniswap V3 subgraph (e.g., Base/Base Sepolia) to retrieve the USDC/WETH `pool` entity. We observe `liquidity`, `volumeUSD`, `token0Price`, and `token1Price`.

### 2. Why the data is useful
It informs the AI's risk/decision context. By observing pool liquidity and recent volume, the Agent can infer market conditions and avoid proposing trades during extreme volatility or insufficient liquidity.

### 3. Why the data is untrusted
Graph data is subject to staleness, indexing delays, malformed subgraph logic, or even external market manipulation. Therefore, it is treated purely as **OBSERVATION**.

### 4. How stale/unavailable data is handled
The `GraphAdapter` parses all responses through strict Zod schemas and normalizes failures into distinct states (`GRAPH_OK`, `GRAPH_UNAVAILABLE`, `GRAPH_INVALID`, `GRAPH_EMPTY`). The AI sees these explicit failure states, preventing silent zeroes from distorting decisions.

### 5. How Graph observations reach the Agent
It is injected into the Agent's `ObservationContext.graphObservation`. The AI receives it passively.

### 6. Why Graph data cannot authorize transactions
The Agent translates its observations into a semantic `TradeProposal`. This proposal must pass the deterministic `UserOpBuilder` and the on-chain `AegisMindHook`/`AegisMindPolicy`. The Graph has ZERO representation in the Zod schema or on-chain logic.

### 7. What remains enforced on-chain
Daily spending limits (configurable; e.g., $1,000/day in tests), execution price/slippage (Chainlink), router whitelist, and token constraints remain rigorously enforced by `AegisMindHook` and `AegisMindPolicy`.

### 8. Which Graph endpoint/subgraph is used
The adapter is provider-neutral, expecting a standard GraphQL endpoint. We default to querying a standard Uniswap V3 deployment subgraph.

### 9. Environment Requirements
A `.env` file should configure `GRAPH_API_KEY` or `GRAPH_ENDPOINT` if required by the gateway. API keys must NEVER be exposed in frontend bundles or committed to source control.

### 10. Limitations
The intelligence is currently limited to snapshot state (liquidity/price) and does not natively implement historical aggregation (which would require more complex queries).

## Code Generation & Assistance
AI tools were used strictly to accelerate boilerplate generation, ideation, and test-suite drafting during development. At no point is AI-generated code assumed to be intrinsically safe or "proven." All critical cryptographic and structural authorization boundaries—particularly the ERC-4337 `userOpHash` integration, calldata parsing, and oracle logic—were manually architected, rigorously audited, and strictly restricted on-chain.

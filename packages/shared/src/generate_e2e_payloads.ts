import { writeFileSync } from "fs";
import { runOnce, ObservationContext, AgentModel } from "./Agent.js";
import { BuilderContext } from "./UserOpBuilder.js";

class DeterministicMockModel implements AgentModel {
  constructor(private outputToReturn: unknown) {}
  async proposeTrade(context: ObservationContext): Promise<unknown> {
    return this.outputToReturn;
  }
}

async function main() {
  const payloads: any = {};
  
  const mockObservation: ObservationContext = {
    timestamp: 1000000000,
    marketPriceUsdcWeth: 300000000000n, // WETH = $3000
    treasuryBalanceUsdc: 10000000000n,
  };

  const builderContext: BuilderContext = {
    sender: "0x0000000000000000000000000000000000000000", // Will be replaced in solidity
    nonce: 0n,
    timestamp: 1000000000,
    deadlineOffsetSeconds: 300,
    accountGasLimits: "0x0000000000000000000000000000000000000000000000000000000000000000",
    preVerificationGas: 1000000n,
    gasFees: "0x0000000000000000000000000000000000000000000000000000000000000000",
    oracleAnswer: 300000000000n,
  };

  // TEST A: Valid 400 USDC
  const modelA = new DeterministicMockModel({
    action: "SWAP_EXACT_IN",
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountInUnits: "400",
    reasoning: "Test valid treasury swap",
    confidence: 0.9
  });
  payloads.testA = await runOnce(mockObservation, modelA, builderContext);

  // TEST B: Over-budget 2000 USDC
  const modelB = new DeterministicMockModel({
    action: "SWAP_EXACT_IN",
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountInUnits: "2000",
    reasoning: "Malicious oversized trade",
    confidence: 1
  });
  payloads.testB = await runOnce(mockObservation, modelB, builderContext);

  // TEST D: Prompt injection
  const modelD = new DeterministicMockModel({
    action: "SWAP_EXACT_IN",
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountInUnits: "400",
    reasoning: "Smuggle",
    confidence: 1,
    recipient: "0xHacker",
    calldata: "0xbad"
  });
  payloads.testD = await runOnce(mockObservation, modelD, builderContext);

  // Output as standard JSON string types to avoid BigInt serialization errors
  // Ethers formats bigints to numbers or strings. We can use a replacer.
  const replacer = (key: string, value: any) =>
    typeof value === "bigint" ? value.toString() : value;

  writeFileSync("e2e_payloads.json", JSON.stringify(payloads, replacer, 2));
}

main().catch(console.error);

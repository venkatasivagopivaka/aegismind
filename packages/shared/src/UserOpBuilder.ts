import { ethers } from "ethers";
import { TradeProposal, TradeProposalSchema } from "./TradeProposal.js";

// Trusted Constants (Execution configuration)
export const TRUSTED_CONSTANTS = {
  USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  WETH_ADDRESS: "0x4200000000000000000000000000000000000006",
  UNIVERSAL_ROUTER: "0x8B844f885672f333Bc0042cB669255f93a4C1E6b",
  USDC_DECIMALS: 6,
  V3_FEE: 500, // 0.05%
  V3_SWAP_EXACT_IN_COMMAND: "0x00",
  ROUTER_EXECUTE_SELECTOR: "0x3593564c", // execute(bytes,bytes[],uint256)
  KERNEL_EXECUTE_SELECTOR: "0xe9ae5c53", // execute(bytes32,bytes)
  KERNEL_EXECUTE_USEROP_SELECTOR: "0x8dd7712f", // executeUserOp(PackedUserOperation,bytes32)
  CALLTYPE_SINGLE: ethers.ZeroHash,
  MAX_SLIPPAGE_BPS: 500n, // 5% matching AegisMindHook deployment
  MAX_TRADE_USDC_UNITS: 500000000n, // 500 USDC
} as const;

export interface BuilderContext {
  sender: string; // Kernel account address
  nonce: bigint; // Provided by infra
  timestamp: number; // Trusted current timestamp in seconds
  deadlineOffsetSeconds: number; // e.g. 300 for 5 minutes
  accountGasLimits: string; 
  preVerificationGas: bigint;
  gasFees: string;
  oracleAnswer: bigint; // The off-chain read of the Chainlink WETH/USD price
}

export interface PackedUserOperation {
  sender: string;
  nonce: bigint;
  initCode: string;
  callData: string;
  accountGasLimits: string;
  preVerificationGas: bigint;
  gasFees: string;
  paymasterAndData: string;
  signature: string;
}

/**
 * Deterministic Builder
 * Translates an untrusted semantic TradeProposal into a PackedUserOperation.
 */
export function buildUserOperation(
  proposal: TradeProposal,
  context: BuilderContext
): PackedUserOperation {
  // 1. Strict semantic validation
  const validatedProposal = TradeProposalSchema.parse(proposal);

  if (context.oracleAnswer <= 0n) {
    throw new Error("Invalid oracle answer in context");
  }

  // 2. Amount conversion
  const amountIn = ethers.parseUnits(validatedProposal.amountInUnits, TRUSTED_CONSTANTS.USDC_DECIMALS);

  if (amountIn > TRUSTED_CONSTANTS.MAX_TRADE_USDC_UNITS) {
    throw new Error(`Trade amount exceeds builder-side ceiling of ${TRUSTED_CONSTANTS.MAX_TRADE_USDC_UNITS} base units`);
  }

  // 3. Exact 43-byte Swap Path
  const path = ethers.solidityPacked(
    ["address", "uint24", "address"],
    [TRUSTED_CONSTANTS.USDC_ADDRESS, TRUSTED_CONSTANTS.V3_FEE, TRUSTED_CONSTANTS.WETH_ADDRESS]
  );

  // 4. Calculate amountOutMin matching the AegisMindHook logic exactly
  // Formula: minWeth = (amountIn * 1e20 * (10000 - maxSlippageBps)) / (price * 10000)
  // Rounded UP by adding (denominator - 1) to numerator
  const numerator = amountIn * (10n ** 20n) * (10000n - TRUSTED_CONSTANTS.MAX_SLIPPAGE_BPS);
  const denominator = context.oracleAnswer * 10000n;
  const amountOutMin = (numerator + denominator - 1n) / denominator;

  // 5. Universal Router Swap Parameters
  const recipient = "0x0000000000000000000000000000000000000001";
  const payerIsUser = true;

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const v3SwapInput = abiCoder.encode(
    ["address", "uint256", "uint256", "bytes", "bool"],
    [recipient, amountIn, amountOutMin, path, payerIsUser]
  );

  const commands = ethers.getBytes(TRUSTED_CONSTANTS.V3_SWAP_EXACT_IN_COMMAND);
  const inputs = [ethers.getBytes(v3SwapInput)];
  const deadline = BigInt(context.timestamp + context.deadlineOffsetSeconds);

  const routerCallData = ethers.concat([
    TRUSTED_CONSTANTS.ROUTER_EXECUTE_SELECTOR,
    abiCoder.encode(["bytes", "bytes[]", "uint256"], [commands, inputs, deadline])
  ]);

  // 6. Kernel execution payload
  const executionCalldata = ethers.solidityPacked(
    ["address", "uint256", "bytes"],
    [TRUSTED_CONSTANTS.UNIVERSAL_ROUTER, 0n, routerCallData]
  );

  const executePayload = ethers.concat([
    TRUSTED_CONSTANTS.KERNEL_EXECUTE_SELECTOR,
    abiCoder.encode(["bytes32", "bytes"], [TRUSTED_CONSTANTS.CALLTYPE_SINGLE, executionCalldata])
  ]);

  const finalCallData = ethers.concat([
    TRUSTED_CONSTANTS.KERNEL_EXECUTE_USEROP_SELECTOR,
    executePayload
  ]);

  return {
    sender: context.sender,
    nonce: context.nonce,
    initCode: "0x",
    callData: ethers.hexlify(finalCallData),
    accountGasLimits: context.accountGasLimits,
    preVerificationGas: context.preVerificationGas,
    gasFees: context.gasFees,
    paymasterAndData: "0x",
    signature: "0x"
  };
}

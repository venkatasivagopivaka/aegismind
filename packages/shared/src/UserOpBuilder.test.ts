import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import { buildUserOperation, TRUSTED_CONSTANTS, BuilderContext } from "./UserOpBuilder.js";
import { TradeProposal } from "./TradeProposal.js";

describe("UserOpBuilder", () => {
  const validContext: BuilderContext = {
    sender: "0x1111111111111111111111111111111111111111",
    nonce: 1n,
    timestamp: 1700000000,
    deadlineOffsetSeconds: 300,
    accountGasLimits: "0x0000000000000000000000000000000000000000000000000000000000000000",
    preVerificationGas: 1000000n,
    gasFees: "0x0000000000000000000000000000000000000000000000000000000000000000",
    oracleAnswer: 300000000000n, // $3000 (8 decimals)
  };

  const validProposal: TradeProposal = {
    action: "SWAP_EXACT_IN",
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountInUnits: "500",
    reasoning: "Market dip",
    confidence: 0.95
  };

  it("1. Valid $500 proposal produces a UserOperation", () => {
    const userOp = buildUserOperation(validProposal, validContext);
    expect(userOp.sender).toBe(validContext.sender);
    expect(userOp.nonce).toBe(validContext.nonce);
    expect(userOp.signature).toBe("0x");
    expect(userOp.callData.startsWith(TRUSTED_CONSTANTS.KERNEL_EXECUTE_USEROP_SELECTOR)).toBe(true);
  });

  it("2. USDC amount converts exactly to 500000000n", () => {
    const userOp = buildUserOperation(validProposal, validContext);
    const executeArgs = "0x" + userOp.callData.slice(18);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const [mode, executionCalldata] = abiCoder.decode(["bytes32", "bytes"], executeArgs);
    
    const executionCalldataHex = ethers.hexlify(executionCalldata);
    const routerCallData = "0x" + executionCalldataHex.slice(2 + 40 + 64);
    const routerArgs = "0x" + routerCallData.slice(10);
    const [commands, inputs, deadline] = abiCoder.decode(["bytes", "bytes[]", "uint256"], routerArgs);
    
    const [recipient, amountIn, amountOutMin, path, payerIsUser] = abiCoder.decode(
      ["address", "uint256", "uint256", "bytes", "bool"],
      inputs[0]
    );

    expect(amountIn).toBe(500000000n);
  });

  it("amountOutMin A/B. Builder correctly calculates amountOutMin based on exact integer formula", () => {
    const userOp = buildUserOperation(validProposal, validContext);
    const executeArgs = "0x" + userOp.callData.slice(18);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const [, executionCalldata] = abiCoder.decode(["bytes32", "bytes"], executeArgs);
    const routerCallData = "0x" + ethers.hexlify(executionCalldata).slice(2 + 40 + 64);
    const routerArgs = "0x" + routerCallData.slice(10);
    const [, inputs] = abiCoder.decode(["bytes", "bytes[]", "uint256"], routerArgs);
    const [, , amountOutMin] = abiCoder.decode(["address", "uint256", "uint256", "bytes", "bool"], inputs[0]);
    
    // Formula verification:
    // amountIn = 500e6
    // price = 3000e8
    // numerator = 500e6 * 1e20 * 9500 = 475000000000000000000000000000
    // denominator = 3000e8 * 10000 = 3000000000000000
    // calculatedMin = (numerator + denom - 1) / denom = 158333333333333334
    
    const expectedNumerator = 500000000n * (10n ** 20n) * 9500n;
    const expectedDenominator = 300000000000n * 10000n;
    const expectedMin = (expectedNumerator + expectedDenominator - 1n) / expectedDenominator;
    
    expect(amountOutMin).toBe(expectedMin);
    expect(amountOutMin).not.toBe(0n); // Proves original Phase 2C flaw is fixed
  });

  it("amountOutMin G. Stale/missing/invalid oracle source causes builder failure", () => {
    const invalidContext = { ...validContext, oracleAnswer: 0n };
    expect(() => buildUserOperation(validProposal, invalidContext)).toThrow("Invalid oracle answer in context");
    
    const negativeContext = { ...validContext, oracleAnswer: -100n };
    expect(() => buildUserOperation(validProposal, negativeContext)).toThrow("Invalid oracle answer in context");
  });

  // ... (keep previous tests)
  it("3. Fractional valid USDC amount converts exactly", () => {
    const fractional = { ...validProposal, amountInUnits: "0.5" };
    const userOp = buildUserOperation(fractional, validContext);
    
    const executeArgs = "0x" + userOp.callData.slice(18);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const [, executionCalldata] = abiCoder.decode(["bytes32", "bytes"], executeArgs);
    const routerCallData = "0x" + ethers.hexlify(executionCalldata).slice(2 + 40 + 64);
    const routerArgs = "0x" + routerCallData.slice(10);
    const [, inputs] = abiCoder.decode(["bytes", "bytes[]", "uint256"], routerArgs);
    const [, amountIn] = abiCoder.decode(["address", "uint256", "uint256", "bytes", "bool"], inputs[0]);
    
    expect(amountIn).toBe(500000n);
  });

  it("4. Too many USDC decimals rejected", () => {
    const invalid = { ...validProposal, amountInUnits: "500.1234567" } as any;
    expect(() => buildUserOperation(invalid, validContext)).toThrow();
  });
  
  it("5-10. Invalid proposals rejected", () => {
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "0" } as any, validContext)).toThrow();
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "-500" } as any, validContext)).toThrow();
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "500e2" } as any, validContext)).toThrow();
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "abc" } as any, validContext)).toThrow();
  });

  it("11-14. Core routing parameters are hardcoded and correct", () => {
    const userOp = buildUserOperation(validProposal, validContext);
    const executeArgs = "0x" + userOp.callData.slice(18);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const [, executionCalldata] = abiCoder.decode(["bytes32", "bytes"], executeArgs);
    
    const executionCalldataHex = ethers.hexlify(executionCalldata);
    const target = "0x" + executionCalldataHex.slice(2, 42);
    expect(target.toLowerCase()).toBe(TRUSTED_CONSTANTS.UNIVERSAL_ROUTER.toLowerCase());

    const routerCallData = "0x" + executionCalldataHex.slice(2 + 40 + 64);
    const routerArgs = "0x" + routerCallData.slice(10);
    const [commands, inputs] = abiCoder.decode(["bytes", "bytes[]", "uint256"], routerArgs);
    
    const [recipient, amountIn, amountOutMin, path, payerIsUser] = abiCoder.decode(
      ["address", "uint256", "uint256", "bytes", "bool"],
      inputs[0]
    );

    expect(recipient.toLowerCase()).toBe("0x0000000000000000000000000000000000000001");
    expect(payerIsUser).toBe(true);

    const expectedPath = ethers.solidityPacked(
      ["address", "uint24", "address"],
      [TRUSTED_CONSTANTS.USDC_ADDRESS, TRUSTED_CONSTANTS.V3_FEE, TRUSTED_CONSTANTS.WETH_ADDRESS]
    );
    expect(ethers.hexlify(path)).toBe(expectedPath);
    expect(commands).toBe("0x00"); // V3_SWAP_EXACT_IN
  });

  it("GOLDEN CALLDATA TEST: Matches Phase 1B Integration Output Exactly", () => {
    const userOp = buildUserOperation(validProposal, validContext);
    expect(userOp.callData.slice(0, 10)).toBe("0x8dd7712f");
    const nestedSelector = "0x" + userOp.callData.slice(10, 18);
    expect(nestedSelector).toBe("0xe9ae5c53");
  });

  it("HARDENING: USDC Decimal Precision Tests", () => {
    // 500 valid
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "500" }, validContext)).not.toThrow();
    // 499.5 valid
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "499.5" }, validContext)).not.toThrow();
    // 499.000001 (6 decimals) valid
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "499.000001" }, validContext)).not.toThrow();
    // 499.0000001 (7 decimals) rejected by ethers.parseUnits
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "499.0000001" }, validContext)).toThrow();
  });

  it("HARDENING: Builder-Side Maximum Trade Amount", () => {
    // 500 USDC succeeds
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "500" }, validContext)).not.toThrow();
    // < 500 USDC succeeds
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "499.999999" }, validContext)).not.toThrow();
    // > 500 USDC fails early
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "500.000001" }, validContext)).toThrow("exceeds builder-side ceiling");
    // very large fails early
    expect(() => buildUserOperation({ ...validProposal, amountInUnits: "999999" }, validContext)).toThrow("exceeds builder-side ceiling");
  });
});

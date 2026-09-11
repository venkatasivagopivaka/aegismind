import { describe, it, expect } from "vitest";
import { TradeProposalSchema } from "./TradeProposal.js";

describe("TradeProposalSchema", () => {
  const validProposal = {
    action: "SWAP_EXACT_IN",
    tokenIn: "USDC",
    tokenOut: "WETH",
    amountInUnits: "500",
    reasoning: "Market dip",
    confidence: 0.95
  };

  it("1. Valid $500 USDC -> WETH proposal", () => {
    expect(() => TradeProposalSchema.parse(validProposal)).not.toThrow();
  });

  it("2. Valid smaller amount", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "0.5" })).not.toThrow();
  });

  it("3. Zero amount rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "0" })).toThrow();
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "0.00" })).toThrow();
  });

  it("4. Negative amount rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "-500" })).toThrow();
  });

  it("5. Malformed amount rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "500e2" })).toThrow("without exponents");
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "NaN" })).toThrow();
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "Infinity" })).toThrow();
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "500.5.5" })).toThrow();
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "500a" })).toThrow();
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: "" })).toThrow();
    // Test that number type is rejected (must be string)
    expect(() => TradeProposalSchema.parse({ ...validProposal, amountInUnits: 500 })).toThrow();
  });

  it("6. Unsupported tokenIn rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, tokenIn: "DAI" })).toThrow();
  });

  it("7. Unsupported tokenOut rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, tokenOut: "USDT" })).toThrow();
  });

  it("8. Unsupported action rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, action: "SWAP_EXACT_OUT" })).toThrow();
  });

  it("9. Confidence below 0 rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, confidence: -0.1 })).toThrow();
  });

  it("10. Confidence above 1 rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, confidence: 1.1 })).toThrow();
  });

  it("11. Missing required field rejected", () => {
    const { amountInUnits, ...missing } = validProposal;
    expect(() => TradeProposalSchema.parse(missing)).toThrow();
  });

  it("12. Unexpected execution field rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, nonce: 1 })).toThrow();
  });

  it("13. Raw calldata field rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, calldata: "0x1234" })).toThrow();
  });

  it("14. Router field rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, router: "0xRouter" })).toThrow();
  });

  it("15. Recipient field rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, recipient: "0xRecipient" })).toThrow();
  });

  it("16. Kernel/UserOp field rejected", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, sender: "0xSender" })).toThrow();
  });

  it("17. Excessively long reasoning rejected if a maximum is defined", () => {
    expect(() => TradeProposalSchema.parse({ ...validProposal, reasoning: "a".repeat(1001) })).toThrow();
  });

});

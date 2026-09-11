import { z } from "zod";

export const TradeProposalSchema = z.object({
  action: z.literal("SWAP_EXACT_IN"),
  tokenIn: z.literal("USDC"),
  tokenOut: z.literal("WETH"),
  amountInUnits: z.string().refine((val) => {
    // Reject empty, negative, NaN, Infinity, and scientific notation
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(val)) return false;
    // Reject zero
    if (/^0+(\.0+)?$/.test(val)) return false;
    return true;
  }, { message: "amountInUnits must be a valid positive decimal string without exponents" }),
  reasoning: z.string().max(1000, "Reasoning too long"),
  confidence: z.number().min(0).max(1)
}).strict(); // strictly reject unknown fields to prevent calldata/execution smuggling

export type TradeProposal = z.infer<typeof TradeProposalSchema>;

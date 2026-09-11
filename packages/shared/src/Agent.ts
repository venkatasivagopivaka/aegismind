import { z } from "zod";
import { TradeProposal, TradeProposalSchema } from "./TradeProposal.js";
import { buildUserOperation, BuilderContext, PackedUserOperation } from "./UserOpBuilder.js";
import { GraphObservation } from "./GraphAdapter.js";

// --- INTERFACES ---

/**
 * Minimal observation context provided to the AI.
 * This is UNTRUSTED data. The AI uses it to make decisions,
 * but it carries no authorization weight.
 */
export interface ObservationContext {
  timestamp: number;
  marketPriceUsdcWeth: bigint;
  treasuryBalanceUsdc: bigint;
  optionalPromptOverride?: string; // Used for prompt-injection testing
  graphObservation?: GraphObservation;
}

/**
 * Provider-neutral interface for the AI Model.
 * The model produces UNTRUSTED, arbitrary JSON.
 */
export interface AgentModel {
  proposeTrade(context: ObservationContext): Promise<unknown>;
}

/**
 * Interface for a future privileged cryptographic signer.
 * MUST be isolated from the AI runtime.
 */
export interface UserOpSigner {
  signUserOperation(userOp: PackedUserOperation): Promise<PackedUserOperation>;
}

// --- FAILURE STATES ---
export type AgentLoopStatus =
  | "SUCCESS"
  | "MODEL_OUTPUT_INVALID"
  | "PROPOSAL_VALIDATION_FAILED"
  | "BUILDER_REJECTED"
  | "SIGNING_FAILED";

export interface AgentLoopResult {
  status: AgentLoopStatus;
  rawModelOutput?: unknown;
  validationError?: string;
  proposal?: TradeProposal;
  unsignedUserOp?: PackedUserOperation;
  signedUserOp?: PackedUserOperation;
}

// --- SYSTEM PROMPT ---
export const SYSTEM_PROMPT = `
You are an autonomous trading agent.
Your ONLY allowed action is swapping USDC for WETH.
You must return a structured JSON semantic intent matching this exact schema:
{
  "action": "SWAP_EXACT_IN",
  "tokenIn": "USDC",
  "tokenOut": "WETH",
  "amountInUnits": "string (e.g., '500')",
  "reasoning": "string (max 1000 chars)",
  "confidence": number (0 to 1)
}
Rules:
- Do NOT output calldata.
- Do NOT output contract addresses.
- Do NOT output recipients.
- Do NOT output execution fields.
- You do NOT have execution authority. Your output is merely a proposal.
`;

// --- AUTONOMOUS LOOP ---

/**
 * Executes one iteration of the agent loop.
 * 
 * 1. Asks the model for a proposal (Untrusted AI)
 * 2. Validates the proposal (Deterministic Boundary)
 * 3. Builds the UserOperation (Deterministic Translation)
 * 4. Signs the operation (Privileged capability - Mocked here)
 */
export async function runOnce(
  observation: ObservationContext,
  model: AgentModel,
  builderContext: BuilderContext,
  signer?: UserOpSigner
): Promise<AgentLoopResult> {
  // 1. Observe & Propose
  let rawModelOutput: unknown;
  try {
    rawModelOutput = await model.proposeTrade(observation);
  } catch (e: any) {
    return { status: "MODEL_OUTPUT_INVALID", validationError: e.message };
  }

  // 2. Validate Proposal (Deterministic Boundary)
  let proposal: TradeProposal;
  try {
    proposal = TradeProposalSchema.parse(rawModelOutput);
  } catch (e: any) {
    return {
      status: "PROPOSAL_VALIDATION_FAILED",
      rawModelOutput,
      validationError: e.errors ? JSON.stringify(e.errors) : e.message
    };
  }

  // 3. Build UserOperation (Deterministic Translation)
  let unsignedUserOp: PackedUserOperation;
  try {
    unsignedUserOp = buildUserOperation(proposal, builderContext);
  } catch (e: any) {
    return {
      status: "BUILDER_REJECTED",
      rawModelOutput,
      proposal,
      validationError: e.message
    };
  }

  // 4. Future Signing (Privileged Capability)
  // For Phase 2D, we only sign if a mock signer is explicitly provided in tests.
  if (signer) {
    try {
      const signedUserOp = await signer.signUserOperation(unsignedUserOp);
      return {
        status: "SUCCESS",
        rawModelOutput,
        proposal,
        unsignedUserOp,
        signedUserOp
      };
    } catch (e: any) {
      return {
        status: "SIGNING_FAILED",
        rawModelOutput,
        proposal,
        unsignedUserOp,
        validationError: e.message
      };
    }
  }

  // Return success (unsigned) if no signer is connected
  return {
    status: "SUCCESS",
    rawModelOutput,
    proposal,
    unsignedUserOp
  };
}

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { createKernelAccount } from "@zerodev/sdk";
import { KERNEL_V3_2 } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { privateKeyToAccount } from "viem/accounts";
import { ENTRYPOINT_V07, POLICY_ADDR, HOOK_ADDR, PASS_SIGNER, SELECTOR, getDeterministicPermissionId, aegisMindPlugin, aegisMindHook } from "./scripts/setupKernel"; // Wait, setupKernel doesn't export them.

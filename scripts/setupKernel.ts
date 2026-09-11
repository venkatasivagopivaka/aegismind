import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  type KernelValidator,
} from "@zerodev/sdk";
import { KERNEL_V3_2 } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import {
  createPublicClient,
  http,
  concat,
  concatHex,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  zeroAddress,
  encodeFunctionData,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Locked constants
const ENTRYPOINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const POLICY_ADDR = "0x681B33cEe32267d80Ad72f0B92660D902989009D";
const HOOK_ADDR = "0x8aC3a95Fe5410618b36cBbE054184B23521c421b";
const PASS_SIGNER = "0x2bedB827302B574fB3aE8907eAAB671e4CC84a9D";
const SELECTOR = "0xe9ae5c53"; // execute(bytes32,bytes)

async function main() {
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY as Hex;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY missing");

  const aiPrivateKey = process.env.AI_AGENT_PRIVATE_KEY as Hex;
  if (!aiPrivateKey) throw new Error("AI_AGENT_PRIVATE_KEY missing");
  const aiAccount = privateKeyToAccount(aiPrivateKey);
  const aiAgent = aiAccount.address;

  const rootAccount = privateKeyToAccount(privateKey);
  console.log("Root Owner EOA:", rootAccount.address);
  if (rootAccount.address.toLowerCase() !== "0x306c3c493ac339acc0bc0e7ea145a21b2169ceaa") {
    throw new Error("Derived root address does not match expected deployer!");
  }

  // C. Create public client
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // Create the ECDSA Validator (root owner)
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: rootAccount,
    entryPoint: { address: ENTRYPOINT_V07, version: "0.7" },
    kernelVersion: KERNEL_V3_2,
  });

  // Derived deterministic PermissionId
  const getDeterministicPermissionId = () => {
    const validatorData = encodeAbiParameters(
      parseAbiParameters("bytes[]"),
      [
        [
          concat(["0x0000", POLICY_ADDR, encodeAbiParameters(parseAbiParameters("address"), [aiAgent])]),
          concat(["0x0000", PASS_SIGNER])
        ]
      ]
    );
    const hash = keccak256(validatorData);
    return hash.slice(0, 10) as Hex; // 0x + 8 chars = 4 bytes
  };

  // E, F. Build the custom KernelValidator for AegisMind Permission
  const aegisMindPlugin: KernelValidator = {
    ...rootAccount, // We fulfill LocalAccount interface temporarily, though we override signs
    supportedKernelVersions: ">=0.3.0",
    validatorType: "PERMISSION",
    address: zeroAddress,
    source: "AegisMindPlugin",
    getIdentifier: () => {
      // Deterministic 20-byte permission ID
      return getDeterministicPermissionId();
    },
    getEnableData: async () => {
      // Kernel v3 Permission validatorData is an ABI encoded bytes[].
      // [0 ... length-2] are policies.
      // [length-1] is the signer.
      // Each element layout: 2 bytes flag + 20 bytes address + initData

      const policyElement = concatHex([
        "0x0000", // PassFlag
        POLICY_ADDR, // IPolicy
        encodeAbiParameters([{ type: "address" }], [aiAgent]) // initData for AegisMindPolicy
      ]);

      const signerElement = concatHex([
        "0x0000", // PassFlag
        PASS_SIGNER, // ISigner
        "0x" // No initData for AegisMindPassSigner
      ]);

      return encodeAbiParameters([{ type: "bytes[]" }], [[policyElement, signerElement]]);
    },
    signUserOperation: async (userOp) => {
      // Recreate exactly what AegisMindPolicy hashes
      const surrogateHash = keccak256(
        encodeAbiParameters(
          parseAbiParameters("address, uint256, bytes"),
          [userOp.sender, userOp.nonce, userOp.callData]
        )
      );

      // Sign the hash with the AI Agent's private key
      // using standard eth_sign (which wraps it in the Ethereum message prefix natively matched by ECDSA.recover)
      const sig = await aiAccount.signMessage({ message: { raw: surrogateHash } });
      
      // G. Use the exact legacy signature layout required by AegisMindPolicy
      // 0x00 (mode) + 65-byte sig length (0x41) + sig + 0xff
      return concat([
        "0x00",
        "0x0000000000000041", // uint64(65)
        sig,
        "0xff"
      ]);
    },
    getNonceKey: async () => 0n,
    getStubSignature: async (userOp) => {
      console.log("getStubSignature called with callData:", userOp?.callData);
      const sender = userOp?.sender || "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59";
      const nonce = userOp?.nonce || 0n;
      console.log("nonce inside getStubSignature:", nonce.toString());
      
      const callData = userOp?.callData || "0x";
      console.log("realCallData inside getStubSignature:", callData);
      
      const surrogateHash = keccak256(encodeAbiParameters(
        parseAbiParameters("address, uint256, bytes"),
        [sender as Hex, BigInt(nonce.toString()), callData as Hex]
      ));
      console.log("surrogateHash generated:", surrogateHash);

      
      const realAiSig = await aiAccount.signMessage({
        message: { raw: surrogateHash }
      });

      return concat([
        "0x00",
        "0x0000000000000041",
        realAiSig,
        "0xff"
      ]);
    },
    signMessage: async () => "0x",
    signTypedData: async () => "0x",
    getPluginSerializationParams: () => ({}),
    isEnabled: async () => false,
  };

  const aegisMindHook: KernelValidator = {
    ...rootAccount,
    supportedKernelVersions: ">=0.3.0",
    validatorType: "SECONDARY", // Not a real validator, just a hook
    address: HOOK_ADDR,
    source: "AegisMindHook",
    getIdentifier: () => HOOK_ADDR as Hex,
    getEnableData: async () => concat(["0x00", encodeAbiParameters(parseAbiParameters("uint256"), [500000000n])]),
    signUserOperation: async () => "0x",
    getNonceKey: async () => 0n,
    getStubSignature: async () => "0x",
    signMessage: async () => "0x",
    signTypedData: async () => "0x",
    getPluginSerializationParams: () => ({}),
    isEnabled: async () => false,
  };

  // We must inject selectorData exactly as 4 bytes into the typed data.
  // We can patch the SDK's action to force a 4-byte selector behavior, OR intercept it.
  // The ZeroDev SDK handles getPluginsEnableTypedData internally. 
  // Wait, if we use action.selector = 0xe9ae5c53, the SDK will STILL construct a 47-byte selectorData!
  // ==========================================
  // ROOT OWNER BOOTSTRAP (SUDO)
  // ==========================================
  console.log("\n--- STAGE 1: ROOT BOOTSTRAP ---");
  const kernelAccountSudo = await createKernelAccount(publicClient, {
    entryPoint: { address: ENTRYPOINT_V07, version: "0.7" },
    kernelVersion: KERNEL_V3_2,
    plugins: {
      sudo: ecdsaValidator,
    }
  });

  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const UNIVERSAL_ROUTER = "0x8B844f885672f333Bc0042cB669255f93a4C1E6b";
  const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

  // Call 1: USDC.approve(PERMIT2, max)
  const approveUsdcData = encodeFunctionData({
    abi: [{ type: "function", name: "approve", inputs: [{ type: "address" }, { type: "uint256" }] }],
    functionName: "approve",
    args: [PERMIT2, 115792089237316195423570985008687907853269984665640564039457584007913129639935n]
  });

  // Call 2: Permit2.approve(USDC, UNIVERSAL_ROUTER, maxAmount160, maxExpiration48)
  const approvePermit2Data = encodeFunctionData({
    abi: [{ type: "function", name: "approve", inputs: [{ type: "address" }, { type: "address" }, { type: "uint160" }, { type: "uint48" }] }],
    functionName: "approve",
    args: [USDC, UNIVERSAL_ROUTER, 1461501637330902918203684832716283019655932542975n, 281474976710655n]
  });

  const sudoCallData = await kernelAccountSudo.encodeCalls([
    { to: USDC, data: approveUsdcData, value: 0n },
    { to: PERMIT2, data: approvePermit2Data, value: 0n }
  ]);

  const bundlerClientSudo = createKernelAccountClient({
    account: kernelAccountSudo,
    chain: baseSepolia,
    bundlerTransport: http(process.env.BUNDLER_RPC || "https://dummy"),
  });
  
  if (bundlerClientSudo.userOperation) {
    bundlerClientSudo.userOperation.estimateFeesPerGas = undefined;
  }
  
  console.log("Root Account Address:", kernelAccountSudo.address);
  console.log("Root Execution Target: USDC.approve(PERMIT2, max) && Permit2.approve(USDC, UNIVERSAL_ROUTER, max, max)");

  if (kernelAccountSudo.address !== "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59") {
    console.error("Address mismatch!", kernelAccountSudo.address);
    return;
  }

  if (process.env.BUNDLER_RPC) {
    console.log("Skipping Sending Root Bootstrap UserOperation for Permit2... (Already bootstrapped)");
  }

  // Skipping Stage 1 execution (already ran previously)
  console.log("Stage 1 execution skipped. Proceeding to Stage 2...");

  // ==========================================
  // AI AGENT ENABLE MODE (REGULAR)
  // ==========================================
  console.log("\n--- STAGE 2: AI AGENT ENABLE MODE ---");
  const kernelAccountAi = await createKernelAccount(publicClient, {
    address: "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59",
    entryPoint: { address: ENTRYPOINT_V07, version: "0.7" },
    kernelVersion: KERNEL_V3_2,
    plugins: {
      //sudo: ecdsaValidator,
      regular: aegisMindPlugin,
      action: {
        selector: SELECTOR,
        address: zeroAddress,
      },
      hook: aegisMindHook,
    }
  });

  console.log("AI Agent Account Address:", kernelAccountAi.address);
  
  if (kernelAccountAi.address !== "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59") {
    console.error("Address mismatch in Stage 2!", kernelAccountAi.address);
    return;
  }

  const validatorData = await aegisMindPlugin.getEnableData();
  const hookData = await aegisMindHook.getEnableData();
  console.log("ValidatorData Length:", (validatorData.length - 2) / 2, "bytes");
  console.log("HookData Length:", (hookData.length - 2) / 2, "bytes");
  console.log("Expected AI Signature Layout: 0x00 + 8-byte length + 65-byte sig + 0xff");
  
  const chainlinkFeed = process.env.BASE_SEPOLIA_CHAINLINK_FEED as Hex;
  const maxSlippageBps = BigInt(process.env.MAX_SLIPPAGE_BPS || "100");
  const amountIn = 400000000n;
  
  const WETH = "0x4200000000000000000000000000000000000006";
  const path = concatHex([USDC, "0x002710", WETH]);

  const QUOTER_V2 = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27" as Hex;
  const [amountOut] = await publicClient.readContract({
    address: QUOTER_V2,
    abi: [{
      inputs: [{ name: "path", type: "bytes" }, { name: "amountIn", type: "uint256" }],
      name: "quoteExactInput",
      outputs: [{ name: "amountOut", type: "uint256" }, { type: "uint160[]" }, { type: "uint32[]" }, { type: "uint256" }],
      stateMutability: "nonpayable", type: "function"
    }],
    functionName: "quoteExactInput",
    args: [path, amountIn]
  }) as [bigint, bigint[], number[], bigint];

  console.log("Uniswap V3 Quoter Output:", amountOut);

  // Apply maximum slippage
  const calculatedMin = (amountOut * (10000n - maxSlippageBps)) / 10000n;
  
  const inputs0 = encodeAbiParameters(
    parseAbiParameters("address, uint256, uint256, bytes, bool, uint256[]"),
    ["0x0000000000000000000000000000000000000001", amountIn, calculatedMin, path, true, []]
  );

  const routerData = encodeFunctionData({
    abi: [{
      type: "function", name: "execute",
      inputs: [{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }]
    }],
    functionName: "execute",
    args: ["0x00", [inputs0], BigInt(Math.floor(Date.now() / 1000) + 3600)]
  });

  const aiCallData = await kernelAccountAi.encodeCalls([{
    to: UNIVERSAL_ROUTER,
    data: routerData,
    value: 0n
  }]);

  console.log("AI Execution Target: UniversalRouter.execute(V3_SWAP_EXACT_IN)");

  if (!process.env.BUNDLER_RPC) {
    console.log("\nWARNING: BUNDLER_RPC not configured. STOPPING before estimation.");
    return;
  }
  
  const bundlerClientAi = createKernelAccountClient({
    account: kernelAccountAi,
    chain: baseSepolia,
    bundlerTransport: http(process.env.BUNDLER_RPC),
  });
  
  if (bundlerClientAi.userOperation) {
    bundlerClientAi.userOperation.estimateFeesPerGas = undefined;
  }
  
  console.log("\n--- PRE-FLIGHT CHECK ---");
  console.log("Kernel Account:", kernelAccountAi.address);
  console.log("Permission ID:", await aegisMindPlugin.getIdentifier());
  
  console.log("\nSending AI Agent Enable Mode UserOperation...");
  try {
    console.log("--- PREFLIGHT ESTIMATION ---");
    const estimatedGas = await bundlerClientAi.estimateUserOperationGas({
      account: kernelAccountAi,
      callData: aiCallData,
    });
    console.log("Preflight estimation SUCCESS!", estimatedGas);
    
    console.log("--- BROADCAST ---");
    const userOpHash = await bundlerClientAi.sendUserOperation({
      account: kernelAccountAi,
      callData: aiCallData,
    });
    console.log("Stage 2 Enable Mode UserOp Hash:", userOpHash);

    const receipt = await bundlerClientAi.waitForUserOperationReceipt({
      hash: userOpHash,
      timeout: 1000 * 60 * 2,
    });
    console.log("Stage 2 receipt:", receipt.receipt.transactionHash, receipt.success ? "SUCCESS" : "REVERTED");
  } catch (e: any) {
    console.error("Failed to send AI Enable Mode UserOp:");
    console.dir(e, { depth: null });
    if (e.walk) console.dir(e.walk(), { depth: null });
    return;
  }
}

main().catch(console.error);

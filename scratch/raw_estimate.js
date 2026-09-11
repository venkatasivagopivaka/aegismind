const { createPublicClient, http, encodeFunctionData, parseAbiParameters, encodeAbiParameters, concatHex, keccak256, concat } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { baseSepolia } = require('viem/chains');

async function main() {
  const KERNEL = "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59";
  const ROUTER = "0x8B844f885672f333Bc0042cB669255f93a4C1E6b";
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const WETH = "0x4200000000000000000000000000000000000006";
  const BUNDLER_URL = process.env.BUNDLER_RPC;
  
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(BUNDLER_URL) });
  
  // 1. Get Quoter
  const QUOTER_V2 = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27";
  const amountIn = 400000000n; // 400 USDC
  const path = concatHex([USDC, "0x002710", WETH]);
  const [amountOut] = await publicClient.readContract({
    address: QUOTER_V2,
    abi: [{ inputs: [{ internalType: "bytes", name: "path", type: "bytes" }, { internalType: "uint256", name: "amountIn", type: "uint256" }], name: "quoteExactInput", outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }, { internalType: "uint160[]", name: "sqrtPriceX96AfterList", type: "uint160[]" }, { internalType: "uint32[]", name: "initializedTicksCrossedList", type: "uint32[]" }, { internalType: "uint256", name: "gasEstimate", type: "uint256" }], stateMutability: "nonpayable", type: "function" }],
    functionName: "quoteExactInput",
    args: [path, amountIn]
  });
  const minOut = (amountOut * 99n) / 100n;
  
  // 2. Build CallData
  const v3SwapExactInInput = encodeAbiParameters(
    parseAbiParameters("address, uint256, uint256, bytes, bool, uint256[]"),
    ["0x0000000000000000000000000000000000000001", amountIn, minOut, path, true, []]
  );
  const routerCallData = encodeFunctionData({
    abi: [{ inputs: [{ internalType: "bytes", name: "commands", type: "bytes" }, { internalType: "bytes[]", name: "inputs", type: "bytes[]" }, { internalType: "uint256", name: "deadline", type: "uint256" }], name: "execute", outputs: [], stateMutability: "payable", type: "function" }],
    functionName: "execute",
    args: ["0x00", [v3SwapExactInInput], BigInt(Math.floor(Date.now() / 1000) + 3600)]
  });
  const kernelCallData = encodeFunctionData({
    abi: [{ inputs: [{ internalType: "bytes4", name: "selector", type: "bytes4" }, { internalType: "address", name: "executor", type: "address" }, { internalType: "uint256", name: "value", type: "uint256" }, { internalType: "bytes", name: "data", type: "bytes" }], name: "execute", outputs: [], stateMutability: "payable", type: "function" }],
    functionName: "execute",
    args: ["0xe9ae5c53", ROUTER, 0n, routerCallData]
  });

  // 3. Get Nonce directly from EntryPoint
  const EP = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  // The permission ID is 0x26fd4b3c (4 bytes).
  // In Kernel V3, the nonce key combines validatorType (1 byte) and identifier (20 bytes).
  // validatorType for PERMISSION is 0x02. Identifier is 0x26fd4b3c0000...
  // Let's just read the raw nonce from the EntryPoint using the same key as before.
  // Actually, we can just use the ZeroDev SDK logic or check the receipt of the last tx.
  // The last tx had nonce: 456115637863612431069888419645433134030887099224264261674995337090945777665
  // (from the AA23 revert logs). So the next nonce should be that + 1? No, the AA23 revert used 665. The successful tx used 664. So the current nonce is 665.
  const nonce = 456115637863612431069888419645433134030887099224264261674995337090945777665n;
  
  // 4. Construct surrogate hash and sign
  const surrogateHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters("address, uint256, bytes"),
      [KERNEL, nonce, kernelCallData]
    )
  );
  
  const aiAccount = privateKeyToAccount(process.env.AI_AGENT_PRIVATE_KEY);
  const sig = await aiAccount.signMessage({ message: { raw: surrogateHash } });
  
  // 0x00 (mode) + 8-byte length + sig + 0xff
  // Wait, in setupKernel.ts: 
  // 0x00 (mode) + 8-byte length (0x0000000000000041) + sig + 0xff
  const sigLengthHex = "0000000000000041";
  const finalSig = concat(["0x00", "0x" + sigLengthHex, sig, "0xff"]);
  
  // To bypass Enable mode, the SDK wraps it in the validator's signature.
  // Wait, in Kernel v3, a normal signature is JUST the validator's signature!
  // BUT we need to prepend the validator identifier!
  // Normal signature layout: 
  // validatorType (1 byte, 0x02 for PERMISSION) + identifier (20 bytes, right padded) + actual_sig
  const validatorType = "02";
  const identifier = "26fd4b3c00000000000000000000000000000000"; // 20 bytes
  const wrappedSig = "0x" + validatorType + identifier + finalSig.slice(2);
  
  const userOp = {
    sender: KERNEL,
    nonce: "0x" + nonce.toString(16),
    initCode: "0x",
    callData: kernelCallData,
    signature: wrappedSig,
    paymasterAndData: "0x",
  };
  
  console.log("Sending eth_estimateUserOperationGas...");
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "eth_estimateUserOperationGas",
    params: [userOp, EP]
  });
  
  const resp = await fetch(BUNDLER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  const data = await resp.json();
  console.log(JSON.stringify(data, null, 2));
}
main();

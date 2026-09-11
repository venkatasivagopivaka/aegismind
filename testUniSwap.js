const { createPublicClient, http, encodeFunctionData, parseAbi } = require('viem');
const { baseSepolia } = require('viem/chains');

const client = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org")
});

async function main() {
  const pool = "0x"; // Not directly testing pool, testing Universal Router!
  
  const abi = parseAbi([
    "function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) payable"
  ]);
  
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const WETH = "0x4200000000000000000000000000000000000006";
  const path = USDC + "0001f4" + WETH.slice(2);
  
  const { encodeAbiParameters, parseAbiParameters } = require('viem');
  const inputs0 = encodeAbiParameters(
    parseAbiParameters("address, uint256, uint256, bytes, bool"),
    ["0x0000000000000000000000000000000000000001", 0n, 0n, path, true]
  );
  
  try {
    const res = await client.call({
      to: "0x8B844f885672f333Bc0042cB669255f93a4C1E6b", // Universal Router
      data: encodeFunctionData({
        abi,
        functionName: "execute",
        args: ["0x00", [inputs0], BigInt(Math.floor(Date.now() / 1000) + 3600)]
      }),
      account: "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59" // Kernel Account
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Revert:", err.message);
  }
}
main();

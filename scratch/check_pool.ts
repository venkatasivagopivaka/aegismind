import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
async function main() {
  const factory = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"; // Uniswap V3 Factory Base
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const WETH = "0x4200000000000000000000000000000000000006";
  try {
    const pool = await client.readContract({
      address: factory,
      abi: parseAbi(["function getPool(address,address,uint24) view returns (address)"]),
      functionName: "getPool",
      args: [USDC, WETH, 500]
    });
    console.log("Pool:", pool);
  } catch(e) { console.error("No pool", e.message); }
}
main();

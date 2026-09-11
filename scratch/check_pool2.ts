import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
async function main() {
  // Base Sepolia Uniswap V3 Factory is actually 0x33128a8fC17869897dcE68Ed026d694621f6FDfD on most chains, but maybe not here.
  // The official Uniswap V3 factory on Base Sepolia is 0x33128a8fC17869897dcE68Ed026d694621f6FDfD ? No, wait. 
  // Let's just check the code of the factory.
  const code = await client.getBytecode({ address: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" });
  console.log("Factory code length:", code ? code.length : 0);
  if (code && code.length > 2) {
    const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const WETH = "0x4200000000000000000000000000000000000006";
    const pool = await client.readContract({
      address: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      abi: parseAbi(["function getPool(address,address,uint24) view returns (address)"]),
      functionName: "getPool",
      args: [USDC, WETH, 500]
    });
    console.log("Pool 500:", pool);
  }
}
main();

import { createPublicClient, http, formatEther, formatUnits, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
import { config } from "dotenv";
config();

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL)
});

async function main() {
  const accountAddress = "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59"; // We know this from previous logs
  
  const ethBalance = await client.getBalance({ address: accountAddress });
  
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const usdcBalance = await client.readContract({
    address: USDC,
    abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
    functionName: "balanceOf",
    args: [accountAddress]
  });

  console.log("ETH Balance:", formatEther(ethBalance));
  console.log("USDC Balance:", formatUnits(usdcBalance as bigint, 6));
}

main().catch(console.error);

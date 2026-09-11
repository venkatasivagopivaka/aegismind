import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";
const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
async function main() {
  const permit2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
  const router = "0x8B844f885672f333Bc0042cB669255f93a4C1E6b";
  const usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const account = "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59";
  const res = await client.readContract({
    address: permit2,
    abi: parseAbi(["function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)"]),
    functionName: "allowance",
    args: [account, usdc, router]
  });
  console.log("Amount:", res[0].toString());
  console.log("Expiration:", res[1]);
  console.log("Nonce:", res[2]);
}
main().catch(console.error);

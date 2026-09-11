const { createPublicClient, http } = require("viem");
const { baseSepolia } = require("viem/chains");

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BUNDLER_RPC)
});

async function main() {
  const kernelAddress = "0x7a1dbab750f12a90eb1b60d2ae3ad17d4d81effe"; 
  const eip712Domain = await publicClient.readContract({
    address: kernelAddress,
    abi: [{
      type: "function",
      name: "eip712Domain",
      inputs: [],
      outputs: [
        { type: "bytes1", name: "fields" },
        { type: "string", name: "name" },
        { type: "string", name: "version" },
        { type: "uint256", name: "chainId" },
        { type: "address", name: "verifyingContract" },
        { type: "bytes32", name: "salt" },
        { type: "uint256[]", name: "extensions" }
      ]
    }]
  });
  console.log(eip712Domain);
}
main();

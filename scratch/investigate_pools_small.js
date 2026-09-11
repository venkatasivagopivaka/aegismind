const { createPublicClient, http } = require('viem');
const { baseSepolia } = require('viem/chains');

async function main() {
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const WETH = "0x4200000000000000000000000000000000000006";
  const QUOTER_V2 = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27";
  const CHAINLINK = "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";
  
  const [, answer] = await publicClient.readContract({
    address: CHAINLINK,
    abi: [{"inputs":[],"name":"latestRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"}],
    functionName: "latestRoundData"
  });
  
  const feeTiers = [100, 500, 3000, 10000];
  const amounts = [1, 5, 10]; // USDC
  
  for (const amt of amounts) {
    const amountIn = BigInt(amt) * 1000000n;
    const wethExpected = (BigInt(amt) * 10n**26n) / BigInt(answer);
    const chainlinkFloor = (wethExpected * 99n) / 100n;
    console.log(`\nAmount: ${amt} USDC | Floor: ${chainlinkFloor}`);
    
    for (const fee of feeTiers) {
      try {
        const [amountOut] = await publicClient.readContract({
          address: QUOTER_V2,
          abi: [{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IQuoterV2.QuoteExactInputSingleParams","name":"params","type":"tuple"}],"name":"quoteExactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceX96After","type":"uint160"},{"internalType":"uint32","name":"initializedTicksCrossed","type":"uint32"},{"internalType":"uint256","name":"gasEstimate","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}],
          functionName: "quoteExactInputSingle",
          args: [{ tokenIn: USDC, tokenOut: WETH, amountIn, fee, sqrtPriceLimitX96: 0n }]
        });
        
        const viable = amountOut >= chainlinkFloor ? "YES" : "NO";
        console.log(`  Fee: ${fee} | Quote: ${amountOut} | Viable: ${viable}`);
      } catch (e) {
        // console.log(`Fee: ${fee} | Error`);
      }
    }
  }
}
main();

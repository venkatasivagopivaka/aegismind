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
  
  const amounts = [0.01, 0.05, 0.1, 0.25, 0.5, 1];
  const feeTiers = [100, 500, 3000, 10000];
  
  console.log("fee   | amt USDC | quote WETH | Chainlink floor | Hook accepts? | account funded? | likely executable?");
  console.log("----------------------------------------------------------------------------------------------------------");
  
  for (const fee of feeTiers) {
    for (const amt of amounts) {
      const amountIn = BigInt(Math.floor(amt * 1000000));
      const maxSlippageBps = 100n;
      const numerator = amountIn * (10n ** 20n) * (10000n - maxSlippageBps);
      const denominator = BigInt(answer) * 10000n;
      const calculatedMin = (numerator + denominator - 1n) / denominator;
      
      let quote = 0n;
      try {
        const [amountOut] = await publicClient.readContract({
          address: QUOTER_V2,
          abi: [{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IQuoterV2.QuoteExactInputSingleParams","name":"params","type":"tuple"}],"name":"quoteExactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceX96After","type":"uint160"},{"internalType":"uint32","name":"initializedTicksCrossed","type":"uint32"},{"internalType":"uint256","name":"gasEstimate","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}],
          functionName: "quoteExactInputSingle",
          args: [{ tokenIn: USDC, tokenOut: WETH, amountIn, fee, sqrtPriceLimitX96: 0n }]
        });
        quote = amountOut;
      } catch (e) {}
      
      const amountOutMin = (quote * 99n) / 100n;
      const hookAccepts = amountOutMin >= calculatedMin;
      const accountFunded = amountIn <= 19000000n;
      const likelyExecutable = quote > 0n && hookAccepts && accountFunded;
      
      if (likelyExecutable || amt === 1) {
        console.log(`${fee.toString().padEnd(5)} | ${amt.toString().padEnd(8)} | ${quote.toString().padEnd(10)} | ${calculatedMin.toString().padEnd(15)} | ${hookAccepts.toString().padEnd(13)} | ${accountFunded.toString().padEnd(15)} | ${likelyExecutable}`);
      }
    }
  }
}
main();

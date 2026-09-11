const { createPublicClient, http, concatHex } = require('viem');
const { baseSepolia } = require('viem/chains');

async function main() {
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });
  const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const WETH = "0x4200000000000000000000000000000000000006";
  const FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"; // Uniswap V3 Factory
  const QUOTER_V2 = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27";
  const CHAINLINK = "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1";
  const amountIn = 400000000n; // 400 USDC
  
  // Chainlink floor
  const [, answer] = await publicClient.readContract({
    address: CHAINLINK,
    abi: [{"inputs":[],"name":"latestRoundData","outputs":[{"internalType":"uint80","name":"roundId","type":"uint80"},{"internalType":"int256","name":"answer","type":"int256"},{"internalType":"uint256","name":"startedAt","type":"uint256"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"uint80","name":"answeredInRound","type":"uint80"}],"stateMutability":"view","type":"function"}],
    functionName: "latestRoundData"
  });
  // answer is ETH/USD with 8 decimals.
  // 1 ETH = answer / 1e8 USD
  // 400 USDC = 400 USD
  // WETH out = 400 * 1e18 / (answer / 1e8) = 400 * 1e26 / answer
  const wethExpected = (400n * 10n**26n) / BigInt(answer);
  // AegisMindHook checks: minOut >= calculatedMin (which is 99% of expected usually)
  const chainlinkFloor = (wethExpected * 99n) / 100n;
  
  console.log(`Chainlink ETH Price: ${Number(answer) / 1e8} USD`);
  console.log(`Chainlink WETH Floor for 400 USDC: ${chainlinkFloor.toString()} wei`);
  
  const feeTiers = [100, 500, 3000, 10000];
  
  for (const fee of feeTiers) {
    let poolAddr, liquidity, quote;
    try {
      poolAddr = await publicClient.readContract({
        address: FACTORY,
        abi: [{"inputs":[{"internalType":"address","name":"tokenA","type":"address"},{"internalType":"address","name":"tokenB","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"}],"name":"getPool","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"view","type":"function"}],
        functionName: "getPool",
        args: [USDC, WETH, fee]
      });
      
      if (poolAddr === "0x0000000000000000000000000000000000000000") {
        console.log(`Fee: ${fee} -> No pool`);
        continue;
      }
      
      liquidity = await publicClient.readContract({
        address: poolAddr,
        abi: [{"inputs":[],"name":"liquidity","outputs":[{"internalType":"uint128","name":"","type":"uint128"}],"stateMutability":"view","type":"function"}],
        functionName: "liquidity"
      });
      
      const feeHex = "0x" + fee.toString(16).padStart(6, '0');
      const path = concatHex([USDC, feeHex, WETH]);
      
      const [amountOut] = await publicClient.readContract({
        address: QUOTER_V2,
        abi: [{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"uint256","name":"amountIn","type":"uint256"}],"name":"quoteExactInput","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint160[]","name":"sqrtPriceX96AfterList","type":"uint160[]"},{"internalType":"uint32[]","name":"initializedTicksCrossedList","type":"uint32[]"},{"internalType":"uint256","name":"gasEstimate","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}],
        functionName: "quoteExactInput",
        args: [path, amountIn]
      });
      
      quote = amountOut;
      const viable = quote >= chainlinkFloor ? "YES" : "NO";
      
      console.log(`Fee: ${fee} | Pool: ${poolAddr} | Liquidity: ${liquidity} | Quote: ${quote} | Viable: ${viable}`);
    } catch (e) {
      console.log(`Fee: ${fee} | Pool: ${poolAddr} | Liquidity: ${liquidity} | Error: ${e.shortMessage || e.message}`);
    }
  }
}
main();

const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/modules/uniswap/v3/V3SwapRouter.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data.match(/V3_SWAP_EXACT_IN(.*?)payerIsUser/g) || "Not found payerIsUser"));
});

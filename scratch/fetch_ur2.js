const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/modules/uniswap/v3/V3SwapRouter.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    const idx = lines.findIndex(l => l.includes('V3_SWAP_EXACT_IN'));
    if (idx !== -1) {
      console.log(lines.slice(idx, idx + 15).join('\n'));
    }
  });
});

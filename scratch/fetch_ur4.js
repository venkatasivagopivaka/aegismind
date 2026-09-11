const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/modules/uniswap/v3/V3SwapRouter.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    const decodeParams = lines.filter(l => l.includes('decode') || l.includes('inputs'));
    console.log(decodeParams.slice(0, 10).join('\n'));
  });
});

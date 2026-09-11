const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/UniversalRouter.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('V3_SWAP_EXACT_IN')) {
        console.log(lines.slice(Math.max(0, i-2), i + 15).join('\n'));
      }
    }
  });
});

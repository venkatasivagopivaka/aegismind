const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/Dispatcher.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('V3_SWAP_EXACT_IN')) {
        console.log(lines.slice(i, i + 15).join('\n'));
      }
    }
  });
});

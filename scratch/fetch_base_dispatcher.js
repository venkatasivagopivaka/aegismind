const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/base/Dispatcher.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    const start = lines.findIndex(l => l.includes('function execute'));
    console.log(lines.slice(start, start + 80).join('\n'));
  });
});

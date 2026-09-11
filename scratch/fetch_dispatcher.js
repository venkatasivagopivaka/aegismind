const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/Dispatcher.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const lines = data.split('\n');
    let output = false;
    for (const l of lines) {
      if (l.includes('case Commands.V3_SWAP_EXACT_IN')) { output = true; }
      if (output) { console.log(l); }
      if (output && l.includes('break;')) { output = false; }
    }
  });
});

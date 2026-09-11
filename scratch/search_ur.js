const https = require('https');
const url = 'https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/libraries/CalldataDecoder.sol';
https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 1500));
  });
});

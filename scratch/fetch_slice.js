const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/universal-router/main/contracts/libraries/BytesLib.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});

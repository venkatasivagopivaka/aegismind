const https = require('https');
https.get('https://raw.githubusercontent.com/Uniswap/v4-periphery/main/src/libraries/ActionConstants.sol', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});

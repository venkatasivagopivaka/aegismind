const { encodeAbiParameters, parseAbiParameters, decodeAbiParameters } = require('viem');
const amountIn = 1000000n;
const calculatedMin = 1n;
const path = "0x036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006";

const inputs6 = encodeAbiParameters(
  parseAbiParameters("address, uint256, uint256, bytes, bool, uint256[]"),
  ["0x0000000000000000000000000000000000000001", amountIn, calculatedMin, path, true, []]
);

console.log("inputs6:", inputs6);

const decoded5 = decodeAbiParameters(
  parseAbiParameters("address, uint256, uint256, bytes, bool"),
  inputs6
);

console.log("Decoded 5 args:", decoded5);

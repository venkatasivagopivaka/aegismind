const { encodeFunctionData, parseAbi, concatHex, pad } = require("viem");

const KernelV3ExecuteAbi = parseAbi([
  "function execute(bytes32 execMode, bytes executionCalldata)"
]);

const modeCode = concatHex([
  "0x00",
  "0x00",
  "0x00000000",
  "0x00000000",
  pad("0x00000000", { size: 22 })
]);

const calldata = concatHex([
  "0x306c3C493aC339acC0bC0E7Ea145a21B2169cEAa", // to
  pad("0x00", { size: 32 }), // value
  "0x" // data
]);

const result = encodeFunctionData({
  abi: KernelV3ExecuteAbi,
  functionName: "execute",
  args: [modeCode, calldata]
});

console.log(result);

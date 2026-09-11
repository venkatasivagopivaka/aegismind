import { encodeAbiParameters, parseAbiParameters, encodeFunctionData, concatHex } from "viem";

const amountIn = 1000000n;
const calculatedMin = 1n; // dummy for tracing
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const WETH = "0x4200000000000000000000000000000000000006";
const path = concatHex([USDC, "0x0001f4", WETH]);

const inputs0 = encodeAbiParameters(
  parseAbiParameters("address, uint256, uint256, bytes, bool"),
  ["0x0000000000000000000000000000000000000001", amountIn, calculatedMin, path, true]
);

const routerData = encodeFunctionData({
  abi: [{
    type: "function", name: "execute",
    inputs: [{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }]
  }],
  functionName: "execute",
  args: ["0x00", [inputs0], 1999999999n]
});

console.log(routerData);

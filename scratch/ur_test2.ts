import { concatHex } from "viem";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const WETH = "0x4200000000000000000000000000000000000006";
const path = concatHex([USDC, "0x0001f4", WETH]);
console.log(path);
console.log((path.length - 2) / 2);

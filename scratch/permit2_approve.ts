import { encodeFunctionData, parseAbi } from "viem";
try {
  const data = encodeFunctionData({
    abi: parseAbi(["function approve(address token, address spender, uint160 amount, uint48 expiration)"]),
    functionName: "approve",
    args: ["0x036CbD53842c5426634e7929541eC2318f3dCF7e", "0x8B844f885672f333Bc0042cB669255f93a4C1E6b", 115792089237316195423570985008687907853269984665640564039457584007913129639935n, 281474976710655] // uint160 max is smaller!
  });
  console.log("Success");
} catch (e) {
  console.log(e);
}

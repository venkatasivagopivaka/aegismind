import { encodeAbiParameters, parseAbiParameters, keccak256 } from "viem";
const sender = "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59";
const nonce = 457016831316605442147862691070602278426357295046771823538042365506681307136n;
const callData = "0x";
const hash = keccak256(encodeAbiParameters(
  parseAbiParameters("address, uint256, bytes"),
  [sender, nonce, callData]
));
console.log("hash:", hash);

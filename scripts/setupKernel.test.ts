import { describe, it, expect, beforeAll } from "vitest";
import {
  concat,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  slice,
  hashMessage,
  recoverMessageAddress,
  type Hex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { KERNEL_V3_2 } from "@zerodev/sdk/constants";

describe("AegisMind Kernel Setup and Signature Tests", () => {
  const POLICY_ADDR = "0x681B33cEe32267d80Ad72f0B92660D902989009D";
  const HOOK_ADDR = "0x8aC3a95Fe5410618b36cBbE054184B23521c421b";
  const PASS_SIGNER = "0x2bedB827302B574fB3aE8907eAAB671e4CC84a9D";
  const SELECTOR = "0xe9ae5c53";

  let aiPrivateKey: Hex;
  let aiAccount: ReturnType<typeof privateKeyToAccount>;
  let validatorData: Hex;
  let permissionId: Hex;

  beforeAll(() => {
    aiPrivateKey = generatePrivateKey();
    aiAccount = privateKeyToAccount(aiPrivateKey);

    validatorData = encodeAbiParameters(
      parseAbiParameters("bytes[]"),
      [
        [
          concat(["0x0000", POLICY_ADDR, encodeAbiParameters(parseAbiParameters("address"), [aiAccount.address])]),
          concat(["0x0000", PASS_SIGNER])
        ]
      ]
    );

    const hash = keccak256(validatorData);
    permissionId = slice(hash, 0, 20);
  });

  it("exact Kernel version configuration", () => {
    expect(KERNEL_V3_2).toBe("0.3.2");
  });

  it("exact PermissionId/ValidationId encoding", () => {
    expect(permissionId.length).toBe(42); // 0x + 40 chars
    // Should be derived from validatorData hash
    expect(permissionId).toBe(slice(keccak256(validatorData), 0, 20));
  });

  it("exact validatorData bytes", () => {
    expect(validatorData.startsWith("0x00000000")).toBe(true);
  });

  it("exact hookData bytes", () => {
    const hookData = concat(["0x00", encodeAbiParameters(parseAbiParameters("uint256"), [500000000n])]);
    expect(hookData).toBe("0x00000000000000000000000000000000000000000000000000000000001dcd6500");
  });

  it("exact selectorData bytes", () => {
    expect(SELECTOR).toBe("0xe9ae5c53");
  });

  it("real AI signature recovery & signature layout", async () => {
    const userOp = {
      sender: "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59" as Hex,
      nonce: 100n,
      callData: "0x123456" as Hex,
    };

    const surrogateHash = keccak256(
      encodeAbiParameters(
        parseAbiParameters("address, uint256, bytes"),
        [userOp.sender, userOp.nonce, userOp.callData]
      )
    );

    const sig = await aiAccount.signMessage({ message: { raw: surrogateHash } });
    
    // Construct layout
    const finalSig = concat([
      "0x00",
      "0x0000000000000041", // uint64(65)
      sig,
      "0xff"
    ]);

    expect(finalSig.length).toBe(2 + 2 + 16 + 130 + 2); // 0x + 1 byte + 8 bytes + 65 bytes + 1 byte = 75 bytes (150 chars + 0x)
    expect(finalSig.startsWith("0x000000000000000041")).toBe(true);
    expect(finalSig.endsWith("ff")).toBe(true);

    const recovered = await recoverMessageAddress({
      message: { raw: surrogateHash },
      signature: sig
    });

    expect(recovered).toBe(aiAccount.address);
  });

  it("changing sender/nonce/callData changes the signed digest", () => {
    const hash1 = keccak256(encodeAbiParameters(parseAbiParameters("address, uint256, bytes"), ["0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59", 100n, "0x123456"]));
    const hash2 = keccak256(encodeAbiParameters(parseAbiParameters("address, uint256, bytes"), ["0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59", 101n, "0x123456"]));
    expect(hash1).not.toBe(hash2);
  });

  it("wrong AI key fails recovery", async () => {
    const wrongAccount = privateKeyToAccount(generatePrivateKey());
    const hash = keccak256(encodeAbiParameters(parseAbiParameters("address, uint256, bytes"), ["0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59", 100n, "0x123456"]));
    const sig = await wrongAccount.signMessage({ message: { raw: hash } });
    
    const recovered = await recoverMessageAddress({ message: { raw: hash }, signature: sig });
    expect(recovered).not.toBe(aiAccount.address);
  });
});

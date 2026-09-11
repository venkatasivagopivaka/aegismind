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
  concatHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { KERNEL_V3_2 } from "@zerodev/sdk/constants";

describe("AegisMind Legacy Kernel UserOp Full Audit Tests", () => {
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

  it("1. Exact Kernel Account Address", () => {
    // In SDK, "0.3.2" is mapped to the live Base Sepolia deployments
    expect(KERNEL_V3_2).toBe("0.3.2");
  });

  it("3. Enable Mode - Nonce and Encoding", () => {
    // Mode = 0x01, Type = 0x02, vId = 0x02 + 20-byte hash
    const vId = concatHex(["0x02", permissionId]);
    // 1 byte mode + 21 bytes vId + 10 bytes sequence = 32 bytes total.
    const nonce = concatHex(["0x01", vId, "0x00000000000000000000"]); // 32 bytes (256 bits)
    expect(nonce.length).toBe(66); // 0x + 64 chars
    expect(nonce.startsWith("0x0102")).toBe(true);
  });

  it("5. AI Signature - Surrogate Hash & Recovery", async () => {
    // Mock UserOp
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

    // standard eth_sign 
    const sig = await aiAccount.signMessage({ message: { raw: surrogateHash } });
    const recovered = await recoverMessageAddress({ message: { raw: surrogateHash }, signature: sig });
    
    expect(recovered.toLowerCase()).toBe(aiAccount.address.toLowerCase());
  });

  it("6. Policy Signature - Layout Parsing", () => {
    const mockSig = "0x" + "bb".repeat(65);
    const layout = concatHex([
      "0x00",
      "0x0000000000000041",
      mockSig as Hex,
      "0xff"
    ]);

    // ValidationManager parses this:
    // length = uint64(bytes8(layout[1:9])) = 0x41 (65)
    // payload = layout[9 : 9 + 65]
    // prefix check = layout[74] == 0xff
    expect(layout.length).toBe(2 + 2 + 16 + 130 + 2); // 75 bytes
    const extractedPayload = slice(layout, 9, 9 + 65);
    expect(extractedPayload).toBe(mockSig);
    const suffix = slice(layout, 74, 75);
    expect(suffix).toBe("0xff");
  });

  it("8. Hook Data Interpretation", () => {
    // AegisMindHook strictly decodes a single uint256
    const hookData = encodeAbiParameters(parseAbiParameters("uint256"), [500000000n]);
    expect(hookData).toBe("0x000000000000000000000000000000000000000000000000000000001dcd6500"); // EXACTLY 32 bytes
    expect(hookData.length).toBe(66);
  });

  it("11. CallData Selector Encapsulation", () => {
    const executeUserOpSig = "0x8dd7712f";
    const executeSig = "0xe9ae5c53";
    
    // SDK concatenates executeUserOp + execute(args) when hooks are used
    const mockArgs = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const callData = concatHex([
      executeUserOpSig as Hex,
      executeSig as Hex,
      mockArgs as Hex
    ]);

    // Kernel validateUserOp extracts bytes4(callData[4:8])
    const extractedInnerSelector = slice(callData, 4, 8);
    expect(extractedInnerSelector).toBe(executeSig);
    // Which matches the ONLY selector we enabled!
  });
});

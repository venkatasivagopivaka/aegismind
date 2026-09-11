import { config } from "dotenv";
config();
import { createPublicClient, http, concat } from "viem";
import { baseSepolia } from "viem/chains";
import { createKernelAccount } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { privateKeyToAccount } from "viem/accounts";
import { KERNEL_V3_0 } from "@zerodev/sdk/constants";

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BUNDLER_RPC)
  });
  const rootAccount = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: rootAccount,
    entryPoint: { version: "0.7" },
    kernelVersion: KERNEL_V3_0
  });
  const aegisMindPlugin = {
    getIdentifier: () => "0xa9906ab82464fb34d100b6a76102b2129f516c5a"
  };
  const kernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
      regular: aegisMindPlugin,
      action: {
        selector: "0xe9ae5c53",
        address: "0x0000000000000000000000000000000000000000",
      }
    },
    entryPoint: { version: "0.7" },
    kernelVersion: KERNEL_V3_0
  });
  const innerCallData = await kernelAccount.encodeCalls([{
    to: "0x306c3C493aC339acC0bC0E7Ea145a21B2169cEAa",
    data: "0x",
    value: 0n
  }]);
  console.log("innerCallData:", innerCallData);
}
main();

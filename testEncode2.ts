import { createPublicClient, http } from "viem";
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
  const rootAccount = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123" as any);
  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: rootAccount,
    entryPoint: { version: "0.7" } as any,
    kernelVersion: KERNEL_V3_0
  });
  const kernelAccount = await createKernelAccount(publicClient, {
    plugins: {
      sudo: ecdsaValidator,
    },
    entryPoint: { version: "0.7" } as any,
    kernelVersion: KERNEL_V3_0
  });
  const callData = await kernelAccount.encodeCalls([{
    to: "0x306c3C493aC339acC0bC0E7Ea145a21B2169cEAa", // Deployer
    data: "0x",
    value: 0n
  }]);
  console.log("encodeCalls result:", callData);
}
main();

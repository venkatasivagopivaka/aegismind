import { describe, it, expect } from "vitest";
import { BASE_SEPOLIA_KERNEL_V3_3, CHAIN_ID, ENTRYPOINT_V07, KERNEL_FACTORY_V3_3, ECDSA_VALIDATOR, AI_SIGNER_MODULE } from "../src/KernelAddresses.js";
import { ethers } from "ethers";

describe("KernelAddresses Registry", () => {
    it("should have correct chain ID", () => {
        expect(CHAIN_ID).toBe(84532);
        expect(BASE_SEPOLIA_KERNEL_V3_3.CHAIN_ID).toBe(84532);
    });

    it("should have valid Ethereum addresses", () => {
        expect(ethers.isAddress(ENTRYPOINT_V07)).toBe(true);
        expect(ethers.isAddress(KERNEL_FACTORY_V3_3)).toBe(true);
        expect(ethers.isAddress(ECDSA_VALIDATOR)).toBe(true);
        expect(ethers.isAddress(AI_SIGNER_MODULE)).toBe(true);
    });

    it("should not contain the zero address", () => {
        expect(ENTRYPOINT_V07).not.toBe(ethers.ZeroAddress);
        expect(KERNEL_FACTORY_V3_3).not.toBe(ethers.ZeroAddress);
        expect(ECDSA_VALIDATOR).not.toBe(ethers.ZeroAddress);
        expect(AI_SIGNER_MODULE).not.toBe(ethers.ZeroAddress);
    });

    it("should be internally consistent", () => {
        expect(BASE_SEPOLIA_KERNEL_V3_3.ENTRYPOINT_V07).toBe(ENTRYPOINT_V07);
        expect(BASE_SEPOLIA_KERNEL_V3_3.KERNEL_FACTORY_V3_3).toBe(KERNEL_FACTORY_V3_3);
        expect(BASE_SEPOLIA_KERNEL_V3_3.ECDSA_VALIDATOR).toBe(ECDSA_VALIDATOR);
        expect(BASE_SEPOLIA_KERNEL_V3_3.AI_SIGNER_MODULE).toBe(AI_SIGNER_MODULE);
    });
});

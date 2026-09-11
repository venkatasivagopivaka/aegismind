export const CHAIN_ID = 84532;
export const ENTRYPOINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
export const KERNEL_FACTORY_V3_3 = "0x7a1dbab750f12a90eb1b60d2ae3ad17d4d81effe";
export const ECDSA_VALIDATOR = "0x8104e3ad430ea6d354d013a6789fdfc71e671c43";

// Deployed strictly for AegisMind AI permission boundaries
export const AI_SIGNER_MODULE = "0x2bedB827302B574fB3aE8907eAAB671e4CC84a9D";

export const BASE_SEPOLIA_KERNEL_V3_3 = {
    CHAIN_ID,
    ENTRYPOINT_V07,
    KERNEL_FACTORY_V3_3,
    ECDSA_VALIDATOR,
    AI_SIGNER_MODULE
} as const;

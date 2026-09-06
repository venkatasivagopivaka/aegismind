type EvmAddress = `0x${string}`;

export interface LockedStackConfig {
  readonly chain: {
    readonly name: "Base Sepolia";
    readonly id: 84532;
    readonly rpcUrl: string | null;
  };
  readonly integrations: {
    readonly dex: {
      readonly name: "Uniswap";
      readonly deploymentAddresses: {
        readonly universalRouter: string | null;
        readonly quoter: string | null;
        readonly permit2: string | null;
      };
    };
    readonly oracle: {
      readonly name: "Pyth";
      readonly contractAddress: string | null;
      readonly feedIdsByAssetAddress: Readonly<Record<EvmAddress, string | null>>;
    };
    readonly proof: {
      readonly system: "Succinct SP1";
      readonly programLanguage: "Rust";
      readonly verifierAddress: string | null;
      readonly verifierInterface: string | null;
    };
    readonly smartAccount: {
      readonly direction: "ZeroDev Kernel-family / compatible ERC-7579/ERC-4337 account";
      readonly configuration: Readonly<Record<string, string | null>>;
    };
    readonly blockchainData: {
      readonly provider: "The Graph";
      readonly endpoint: string | null;
      readonly subgraphConfiguration: Readonly<Record<string, string | null>>;
    };
  };
  readonly application: {
    readonly evmClient: "Viem";
    readonly testing: "Foundry";
    readonly contracts: "Solidity";
    readonly frontend: "Next.js + React + TypeScript";
    readonly agent: "Node.js + TypeScript";
    readonly ownerWallet: "MetaMask/browser wallet";
  };
}

// Locked architectural choices. Base Sepolia is the only MVP runtime chain.
export const stackConfig = {
  chain: {
    name: "Base Sepolia",
    id: 84532,
    // Implementation value still requiring verification; no secret belongs here.
    rpcUrl: null,
  },
  integrations: {
    dex: {
      name: "Uniswap",
      // Deployment values still requiring verification.
      deploymentAddresses: {
        universalRouter: null,
        quoter: null,
        permit2: null,
      },
    },
    oracle: {
      name: "Pyth",
      // Contract and asset-to-feed mappings still require verification.
      contractAddress: null,
      feedIdsByAssetAddress: {},
    },
    proof: {
      system: "Succinct SP1",
      programLanguage: "Rust",
      // Verifier deployment and interface values still requiring verification.
      verifierAddress: null,
      verifierInterface: null,
    },
    smartAccount: {
      direction: "ZeroDev Kernel-family / compatible ERC-7579/ERC-4337 account",
      // Configuration values still requiring verification; no API keys or secrets.
      configuration: {
        projectId: null,
        entryPoint: null,
        factoryAddress: null,
      },
    },
    blockchainData: {
      provider: "The Graph",
      // Endpoint and subgraph values still requiring verification.
      endpoint: null,
      subgraphConfiguration: {
        subgraphId: null,
        deploymentId: null,
      },
    },
  },
  application: {
    evmClient: "Viem",
    testing: "Foundry",
    contracts: "Solidity",
    frontend: "Next.js + React + TypeScript",
    agent: "Node.js + TypeScript",
    ownerWallet: "MetaMask/browser wallet",
  },
} as const satisfies LockedStackConfig;

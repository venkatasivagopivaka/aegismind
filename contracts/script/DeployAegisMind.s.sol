// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {AegisMindPolicy} from "../src/AegisMindPolicy.sol";
import {AegisMindHook} from "../src/AegisMindHook.sol";

contract DeployAegisMind is Script {
    function run() external {
        // 1. Read configuration from environment variables
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address chainlinkFeed = vm.envAddress("BASE_SEPOLIA_CHAINLINK_FEED");
        uint256 maxSlippageBps = vm.envOr("MAX_SLIPPAGE_BPS", uint256(100)); // 1%
        uint256 maxStaleness = vm.envOr("MAX_STALENESS", uint256(3600)); // 1 hour

        // 2. Validate required configuration
        require(deployerPrivateKey != 0, "DeployAegisMind: DEPLOYER_PRIVATE_KEY is 0");
        require(chainlinkFeed != address(0), "DeployAegisMind: BASE_SEPOLIA_CHAINLINK_FEED is zero address");
        require(maxSlippageBps <= 10000, "DeployAegisMind: MAX_SLIPPAGE_BPS exceeds 100%");

        // 3. Start broadcasting
        vm.startBroadcast(deployerPrivateKey);

        // 4. Deploy AegisMindPolicy
        AegisMindPolicy policy = new AegisMindPolicy();
        
        // 5. Deploy AegisMindHook
        AegisMindHook hook = new AegisMindHook(
            chainlinkFeed,
            maxSlippageBps,
            maxStaleness
        );

        vm.stopBroadcast();

        // 6 & 7. Print deployed addresses and initialization values
        console2.log("=========================================");
        console2.log("AegisMind Contracts Deployed");
        console2.log("=========================================");
        console2.log("AegisMindPolicy:   ", address(policy));
        console2.log("AegisMindHook:     ", address(hook));
        console2.log("");
        console2.log("Hook Configuration:");
        console2.log("- Chainlink Feed:  ", chainlinkFeed);
        console2.log("- Max Slippage BPS:", maxSlippageBps);
        console2.log("- Max Staleness:   ", maxStaleness);
        console2.log("=========================================");
    }
}

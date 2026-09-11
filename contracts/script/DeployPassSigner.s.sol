// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Script, console2} from "forge-std/Script.sol";
import {AegisMindPassSigner} from "../src/AegisMindPassSigner.sol";

contract DeployPassSigner is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        AegisMindPassSigner signer = new AegisMindPassSigner();
        
        console2.log("AegisMindPassSigner deployed at:", address(signer));
        
        vm.stopBroadcast();
    }
}

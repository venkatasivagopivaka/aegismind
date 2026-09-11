// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";

contract URTest is Script {
    function run() public view {
        uint256[] memory minHop = new uint256[](0);
        bytes memory path = hex"036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006";
        bytes memory encoded6 = abi.encode(address(1), uint256(1), uint256(1), path, true, minHop);
        
        // Now try to decode it as 5 arguments
        (address r, uint256 aI, uint256 aO, bytes memory p, bool b) = abi.decode(encoded6, (address, uint256, uint256, bytes, bool));
        console.log("Success! Extracted path length:", p.length);
    }
}

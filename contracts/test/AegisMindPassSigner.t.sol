// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import {AegisMindPassSigner} from "../src/AegisMindPassSigner.sol";

contract AegisMindPassSignerTest is Test {
    AegisMindPassSigner signer;

    function setUp() public {
        signer = new AegisMindPassSigner();
    }

    function test_IsModuleType() public {
        assertTrue(signer.isModuleType(6), "Should be ISigner type 6");
    }
}

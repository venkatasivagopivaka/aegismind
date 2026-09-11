// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import {AegisMindPassSigner} from "../src/AegisMindPassSigner.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";

contract AegisMindPassSignerTest is Test {
    AegisMindPassSigner signer;

    function setUp() public {
        signer = new AegisMindPassSigner();
    }

    function test_IsModuleType() public {
        assertTrue(signer.isModuleType(6), "Should be ISigner type 6");
        assertFalse(signer.isModuleType(1), "Should not be Validator");
        assertFalse(signer.isModuleType(2), "Should not be Executor");
        assertFalse(signer.isModuleType(3), "Should not be Fallback");
        assertFalse(signer.isModuleType(4), "Should not be Hook");
        assertFalse(signer.isModuleType(5), "Should not be Policy");
    }

    function test_Initialization() public {
        assertTrue(signer.isInitialized(address(this)), "Should always be initialized");
        
        // Ensure onInstall and onUninstall do not revert and cost minimal gas
        signer.onInstall("");
        signer.onUninstall("");
    }

    function test_Adversarial_CheckUserOpSignature() public {
        PackedUserOperation memory userOp;
        userOp.sender = address(123);
        userOp.nonce = 1;
        userOp.callData = hex"badc0de0";
        userOp.signature = hex"deadbeef";

        // Regardless of arbitrary parameters, it must return 0 (Success)
        uint256 result = signer.checkUserOpSignature(
            bytes32(uint256(1)),
            userOp,
            keccak256("arbitrary_hash")
        );

        assertEq(result, 0, "Must return SIG_VALIDATION_SUCCESS");
    }

    function test_Adversarial_CheckSignature() public {
        bytes4 result = signer.checkSignature(
            bytes32(uint256(1)),
            address(this),
            keccak256("hash"),
            hex"abcd"
        );
        
        assertEq(result, bytes4(0x1626ba7e), "Must return ERC1271_MAGICVALUE");
    }
}

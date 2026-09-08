// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {ISigner} from "kernel/src/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";

/**
 * @dev Test-only signer used to satisfy Kernel Permission signer-module requirements; 
 * not used as the AegisMind authorization authority.
 */
contract MockSigner is ISigner {
    uint256 constant SIG_VALIDATION_SUCCESS_UINT = 0;
    bytes4 constant ERC1271_MAGICVALUE = 0x1626ba7e;
    uint256 constant MODULE_TYPE_SIGNER = 6;

    bool public initialized;

    function onInstall(bytes calldata data) external payable override {
        initialized = true;
    }

    function onUninstall(bytes calldata data) external payable override {
        initialized = false;
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_SIGNER;
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return initialized;
    }

    function checkUserOpSignature(bytes32 id, PackedUserOperation calldata userOp, bytes32 userOpHash)
        external
        payable
        override
        returns (uint256)
    {
        return SIG_VALIDATION_SUCCESS_UINT;
    }

    function checkSignature(bytes32 id, address sender, bytes32 hash, bytes calldata sig)
        external
        view
        override
        returns (bytes4)
    {
        return ERC1271_MAGICVALUE;
    }
}

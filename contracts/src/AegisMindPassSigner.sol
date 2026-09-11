// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {ISigner} from "kernel/src/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";

/**
 * @title AegisMindPassSigner
 * @dev A deliberately empty, stateless ISigner module for ZeroDev Kernel v3.3.
 *
 * ARCHITECTURE NOTE:
 * This contract is paired strictly with `AegisMindPolicy`. 
 * The `AegisMindPolicy` assumes 100% cryptographic authority by executing
 * ECDSA.recover on a custom surrogateHash (sender, nonce, callData). 
 * Because the AI agent must sign the surrogateHash to satisfy the Policy, 
 * demanding a second ERC-4337 userOpHash signature is redundant and disruptive.
 * 
 * Therefore, this PassSigner simply satisfies the ValidationManager's structural 
 * requirement for a trailing `ISigner` module (Module Type 6), but defers all
 * cryptographic authority securely to the preceding Policy layer.
 *
 * SECURITY PROPERTIES:
 * - No owner or mutable state (immune to state-corruption).
 * - No external calls (immune to reentrancy).
 * - Implements strict Type 6 (ISigner) identification.
 * - Always returns validation success (0) and ERC1271 success.
 */
contract AegisMindPassSigner is ISigner {
    uint256 constant SIG_VALIDATION_SUCCESS = 0;
    bytes4 constant ERC1271_MAGICVALUE = 0x1626ba7e;
    uint256 constant MODULE_TYPE_SIGNER = 6;

    /// @notice Accepts installation unconditionally (stateless)
    function onInstall(bytes calldata) external payable override {}

    /// @notice Accepts uninstallation unconditionally (stateless)
    function onUninstall(bytes calldata) external payable override {}

    /// @notice Confirms this module is strictly a Signer (Type 6)
    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_SIGNER;
    }

    /// @notice Unconditionally initialized since there is no state
    function isInitialized(address) external pure override returns (bool) {
        return true;
    }

    /// @notice Satisfies the ValidationManager check safely via Policy delegation
    function checkUserOpSignature(bytes32, PackedUserOperation calldata, bytes32)
        external
        payable
        override
        returns (uint256)
    {
        return SIG_VALIDATION_SUCCESS;
    }

    /// @notice Satisfies ERC1271 safely via Policy delegation
    function checkSignature(bytes32, address, bytes32, bytes calldata)
        external
        view
        override
        returns (bytes4)
    {
        return ERC1271_MAGICVALUE;
    }
}

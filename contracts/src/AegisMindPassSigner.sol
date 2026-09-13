// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {ISigner} from "kernel/src/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

/**
 * @title AegisMindPassSigner
 * @dev Re-architected as a standard cryptographic ECDSA signer that authenticates 
 *      the canonical ERC-4337 `userOpHash`.
 */
contract AegisMindPassSigner is ISigner {
    using ECDSA for bytes32;

    uint256 constant SIG_VALIDATION_SUCCESS_UINT = 0;
    uint256 constant SIG_VALIDATION_FAILED_UINT = 1;
    bytes4 constant ERC1271_MAGICVALUE = 0x1626ba7e;
    bytes4 constant ERC1271_INVALID = 0xffffffff;
    uint256 constant MODULE_TYPE_SIGNER = 6;

    // KernelAccount => PermissionId => Signer
    mapping(address => mapping(bytes32 => address)) public permissionSigners;

    function onInstall(bytes calldata data) external payable override {
        (bytes32 permissionId, address signer) = abi.decode(data, (bytes32, address));
        require(signer != address(0), "Invalid signer");
        permissionSigners[msg.sender][permissionId] = signer;
    }

    function onUninstall(bytes calldata data) external payable override {
        bytes32 permissionId = abi.decode(data, (bytes32));
        delete permissionSigners[msg.sender][permissionId];
    }

    function isModuleType(uint256 typeID) external pure override returns (bool) {
        return typeID == MODULE_TYPE_SIGNER;
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return true;
    }

    function checkUserOpSignature(bytes32 id, PackedUserOperation calldata userOp, bytes32 userOpHash)
        external
        payable
        override
        returns (uint256)
    {
        address expectedSigner = permissionSigners[msg.sender][id];
        if (expectedSigner == address(0)) return SIG_VALIDATION_FAILED_UINT;

        bytes32 ethHash = userOpHash.toEthSignedMessageHash();
        address recovered = ethHash.recover(userOp.signature);

        if (recovered != expectedSigner) return SIG_VALIDATION_FAILED_UINT;

        return SIG_VALIDATION_SUCCESS_UINT;
    }

    function checkSignature(bytes32 id, address sender, bytes32 hash, bytes calldata sig)
        external
        view
        override
        returns (bytes4)
    {
        address expectedSigner = permissionSigners[msg.sender][id];
        if (expectedSigner == address(0)) return ERC1271_INVALID;

        bytes32 ethHash = hash.toEthSignedMessageHash();
        address recovered = ethHash.recover(sig);

        if (recovered != expectedSigner) return ERC1271_INVALID;

        return ERC1271_MAGICVALUE;
    }
}

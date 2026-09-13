// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IPolicy} from "kernel/src/interfaces/IERC7579Modules.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";

/**
 * @title AegisMindPolicy
 * @notice Phase 1A static authorization policy for AegisMind.
 *         Enforces Target, Command, one-hop USDC->WETH Token path.
 *         Must be combined with AegisMindHook for daily limits and oracle slippage.
 */
contract AegisMindPolicy is IPolicy {

    error InvalidSelector();
    error InvalidCallType();
    error InvalidTarget();
    error InvalidCommand();
    error InvalidToken();
    error SignatureValidationNotSupported();
    error MalformedCalldata();

    // Base Sepolia Official Addresses
    address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    address public constant UNIVERSAL_ROUTER = 0x8B844f885672f333Bc0042cB669255f93a4C1E6b;

    // Kernel executeUserOp selector: executeUserOp(PackedUserOperation,bytes32)
    bytes4 public constant EXECUTE_USER_OP_SELECTOR = 0x8dd7712f;

    // Kernel execute selector: execute(bytes32,bytes)
    bytes4 public constant KERNEL_EXECUTE_SELECTOR = 0xe9ae5c53;

    function onInstall(bytes calldata) external payable override {}

    function onUninstall(bytes calldata) external payable override {}

    function isModuleType(uint256 moduleTypeId) external pure override returns (bool) {
        return moduleTypeId == 5; // MODULE_TYPE_POLICY
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return true; 
    }

    function checkUserOpPolicy(bytes32 id, PackedUserOperation calldata userOp)
        external
        payable
        override
        returns (uint256)
    {
        // 1. Enforce executeUserOp outer wrapper + nested execute selector
        if (userOp.callData.length < 104) revert MalformedCalldata();
        if (bytes4(userOp.callData[0:4]) != EXECUTE_USER_OP_SELECTOR) revert InvalidSelector();
        if (bytes4(userOp.callData[4:8]) != KERNEL_EXECUTE_SELECTOR) revert InvalidSelector();

        // 2. Enforce CALLTYPE_SINGLE (parse execute args from offset 8)
        (bytes32 mode, bytes memory executionCalldata) = abi.decode(userOp.callData[8:], (bytes32, bytes));
        if (bytes1(mode) != 0x00) revert InvalidCallType();

        // 3. Extract ExecutionCalldata (target, value, innerCalldata)
        if (executionCalldata.length < 52) revert MalformedCalldata();
        address target;
        uint256 value;
        assembly {
            target := shr(96, mload(add(executionCalldata, 32)))
            value := mload(add(executionCalldata, 52))
        }
        
        if (target != UNIVERSAL_ROUTER) revert InvalidTarget();
        if (value != 0) revert MalformedCalldata(); // ETH value transfers explicitly blocked

        // 4. Decode and enforce Universal Router V3_SWAP_EXACT_IN parameters
        uint48 deadline = _verifyUniversalRouterCall(executionCalldata, userOp.sender);

        // 5. Return ERC-7562 validation data (no signature failure possible here)
        return _packValidationData(false, deadline, 0);
    }

    function checkSignaturePolicy(bytes32 id, address sender, bytes32 hash, bytes calldata sig)
        external
        view
        override
        returns (uint256)
    {
        revert SignatureValidationNotSupported(); 
    }

    // --- Internal Helpers ---
    function _verifyUniversalRouterCall(bytes memory executionCalldata, address sender) internal pure returns (uint48) {
        bytes memory innerCalldata = _slice(executionCalldata, 52);

        if (innerCalldata.length < 4) revert MalformedCalldata();
        if (bytes4(innerCalldata) != 0x3593564c) revert InvalidCommand(); // execute(bytes,bytes[],uint256)

        (bytes memory commands, bytes[] memory inputs, uint256 parsedDeadline) = abi.decode(
            _slice(innerCalldata, 4),
            (bytes, bytes[], uint256)
        );

        if (commands.length != 1 || commands[0] != 0x00) revert InvalidCommand();
        if (inputs.length != 1) revert MalformedCalldata();

        (address recipient, , , bytes memory path, bool payerIsUser) = abi.decode(inputs[0], (address, uint256, uint256, bytes, bool));
        
        if (recipient != address(1) && recipient != sender) revert InvalidTarget();
        if (!payerIsUser) revert InvalidTarget();

        if (path.length != 43) revert MalformedCalldata();
        if (address(bytes20(path)) != USDC) revert InvalidToken();
        if (address(bytes20(_slice(path, 23))) != WETH) revert InvalidToken();

        return uint48(parsedDeadline);
    }

    function _slice(bytes memory data, uint256 start) internal pure returns (bytes memory) {
        bytes memory result = new bytes(data.length - start);
        for (uint256 i = start; i < data.length; i++) {
            result[i - start] = data[i];
        }
        return result;
    }

    function _packValidationData(bool sigFailed, uint48 validUntil, uint48 validAfter) internal pure returns (uint256) {
        return (uint256(validUntil) << 160) | (uint256(validAfter) << (160 + 48)) | (sigFailed ? 1 : 0);
    }
}

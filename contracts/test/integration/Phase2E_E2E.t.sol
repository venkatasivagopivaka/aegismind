// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Test} from "forge-std/Test.sol";
import {Phase1B_IntegrationTest} from "./Phase1B_Integration.t.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";
import {ValidatorLib} from "kernel/src/utils/ValidationTypeLib.sol";
import {Kernel} from "kernel/src/Kernel.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

contract Phase2E_E2E is Phase1B_IntegrationTest {
    using ECDSA for bytes32;

    string payloadsJson;

    // Load the generated test payloads lazily
    function _loadPayloads() internal returns (string memory) {
        if (bytes(payloadsJson).length == 0) {
            payloadsJson = vm.readFile("e2e_payloads.json");
        }
        return payloadsJson;
    }
    
    // --- Helper to submit UserOp ---
    function _submitUserOp(bytes memory callData, uint64 nonceKey) internal {
        PackedUserOperation memory userOp;
        userOp.sender = address(kernel);
        userOp.nonce = ValidatorLib.encodePermissionAsNonce(0x00, PERMISSION_ID, 0, nonceKey);
        userOp.callData = callData;
        userOp.accountGasLimits = bytes32(abi.encodePacked(uint128(2000000), uint128(2000000)));
        userOp.preVerificationGas = 1000000;
        userOp.gasFees = bytes32(abi.encodePacked(uint128(10 gwei), uint128(10 gwei)));

        bytes32 userOpHash = entryPoint.getUserOpHash(userOp);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aiAgent.key, userOpHash.toEthSignedMessageHash());
        
        // This is a direct mock signer implementation mimicking ValidationManager signature format:
        bytes memory aiSignature = abi.encodePacked(r, s, v);
        userOp.signature = abi.encodePacked(uint8(0), uint64(0), uint8(255), aiSignature);

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = userOp;

        entryPoint.handleOps(ops, payable(owner.addr));
    }

    // --- TEST A: Valid Trade ---
    function test_Phase2E_TestA_ValidTrade() public {
        string memory json = _loadPayloads();
        string memory status = vm.parseJsonString(json, ".testA.status");
        assertEq(status, "SUCCESS", "Builder should succeed");

        bytes memory callData = vm.parseJsonBytes(json, ".testA.unsignedUserOp.callData");
        
        uint256 usdcBefore = usdc.balanceOf(address(kernel));
        uint256 wethBefore = weth.balanceOf(address(kernel));
        
        // We set the block.timestamp to 1000000000 to match the TS script's deadline calculation
        vm.warp(1000000000);
        feed.setUpdatedAt(1000000000);

        _submitUserOp(callData, 0);

        uint256 usdcAfter = usdc.balanceOf(address(kernel));
        uint256 wethAfter = weth.balanceOf(address(kernel));

        assertEq(usdcBefore - usdcAfter, 400e6, "400 USDC should be spent");
        assertTrue(wethAfter > wethBefore, "WETH should be received");
    }

    // --- TEST B: Over-budget Builder Rejection ---
    function test_Phase2E_TestB_BuilderRejection() public {
        string memory json = _loadPayloads();
        string memory status = vm.parseJsonString(json, ".testB.status");
        assertEq(status, "BUILDER_REJECTED", "Builder should reject oversized trade");
        
        string memory errorMsg = vm.parseJsonString(json, ".testB.validationError");
        assertTrue(bytes(errorMsg).length > 0, "Should have error msg");
        
        // No UserOp generated, so no execution
    }

    // --- TEST C: Bypass Builder (Malicious 2000 USDC) ---
    function test_Phase2E_TestC_BypassBuilder() public {
        // Manually construct a 2000 USDC swap, completely bypassing the builder!
        bytes[] memory inputs = new bytes[](1);
        bytes memory path = abi.encodePacked(USDC_ADDR, uint24(500), WETH_ADDR);
        
        // Slippage math: WETH = $3000, 2000 USDC = ~0.666 WETH
        // Set amountOutMin low enough to pass slippage check but high enough to be "realistic"
        inputs[0] = _buildV3SwapInput(address(1), 2000e6, 600e15, path, true);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        vm.warp(1000000000);
        feed.setUpdatedAt(1000000000);
        
        bytes memory routerCallData = abi.encodeWithSelector(0x3593564c, commands, inputs, block.timestamp + 300);
        bytes memory executionCalldata = abi.encodePacked(ROUTER_ADDR, uint256(0), routerCallData);
        bytes memory executePayload = abi.encodeWithSelector(0xe9ae5c53, bytes32(0), executionCalldata);
        bytes memory maliciousCallData = abi.encodePacked(Kernel.executeUserOp.selector, executePayload);

        uint256 usdcBefore = usdc.balanceOf(address(kernel));

        // Submit - This MUST fail in the Hook because 2000e6 > 1000e6 daily limit
        // handleOps will emit UserOperationEvent(success: false), it will NOT revert
        _submitUserOp(maliciousCallData, 0);
        
        uint256 usdcAfter = usdc.balanceOf(address(kernel));
        assertEq(usdcBefore, usdcAfter, "Funds should NOT move");
    }

    // --- TEST D: Prompt Injection ---
    function test_Phase2E_TestD_PromptInjection() public {
        string memory json = _loadPayloads();
        string memory status = vm.parseJsonString(json, ".testD.status");
        // Expecting schema validation failure before builder
        assertEq(status, "PROPOSAL_VALIDATION_FAILED", "Schema should block malicious fields");
    }

    // --- TEST E: Stateful Daily Budget ---
    function test_Phase2E_TestE_StatefulDailyBudget() public {
        string memory json = _loadPayloads();
        bytes memory callData = vm.parseJsonBytes(json, ".testA.unsignedUserOp.callData");
        
        vm.warp(1000000000);
        feed.setUpdatedAt(1000000000);

        // First trade: 400 USDC (Cumulative: 400) - Should succeed
        _submitUserOp(callData, 0);
        (, uint256 spent1,,) = hook.treasuryStates(address(kernel));
        assertEq(spent1, 400e6, "400 spent");

        // Second trade: 400 USDC (Cumulative: 800) - Should succeed
        _submitUserOp(callData, 1);
        (, uint256 spent2,,) = hook.treasuryStates(address(kernel));
        assertEq(spent2, 800e6, "800 spent");

        // Third trade: 400 USDC (Cumulative: 1200 > 1000) - MUST fail
        _submitUserOp(callData, 2);
        
        // Assert that the third trade failed and spent did not increase
        (, uint256 spent3,,) = hook.treasuryStates(address(kernel));
        assertEq(spent3, 800e6, "Third trade should fail, spent should remain 800");
    }
}

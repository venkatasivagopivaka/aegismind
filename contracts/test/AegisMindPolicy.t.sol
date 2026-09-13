// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../src/AegisMindPolicy.sol";
import {PackedUserOperation} from "kernel/src/interfaces/PackedUserOperation.sol";
import {ECDSA} from "solady/utils/ECDSA.sol";

contract AegisMindPolicyTest is Test {
    using ECDSA for bytes32;

    AegisMindPolicy public policy;
    
    address public constant UNIVERSAL_ROUTER = 0x8B844f885672f333Bc0042cB669255f93a4C1E6b;
    address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    address public account = address(0x111);
    address public securitySigner;
    uint256 public securitySignerKey;
    
    bytes32 public constant PERMISSION_ID = bytes32(uint256(1));
    
    function setUp() public {
        (securitySigner, securitySignerKey) = makeAddrAndKey("securitySigner");
        policy = new AegisMindPolicy();
        
        vm.prank(account);
        policy.onInstall(abi.encode(PERMISSION_ID, securitySigner));
    }

    /// @dev Builds the full userOp.callData with executeUserOp wrapper:
    ///      [0:4]  = 0x8dd7712f (executeUserOp)
    ///      [4:8]  = 0xe9ae5c53 (execute)
    ///      [8:..] = ABI(ExecMode, executionCalldata)
    function _buildCallData(address target, uint256 value, bytes memory innerCallData) internal pure returns (bytes memory) {
        bytes memory executionCalldata = abi.encodePacked(target, value, innerCallData);
        bytes32 execMode = bytes32(0); // CALLTYPE_SINGLE, EXECTYPE_DEFAULT
        // Inner execute(ExecMode, bytes) call
        bytes memory executePayload = abi.encodeWithSelector(0xe9ae5c53, execMode, executionCalldata);
        // Wrap with executeUserOp selector
        return abi.encodePacked(bytes4(0x8dd7712f), executePayload);
    }

    /// @dev Legacy helper that builds callData WITHOUT the executeUserOp wrapper
    ///      (for testing that the old format is rejected)
    function _buildExecuteCallDataNoWrapper(address target, uint256 value, bytes memory innerCallData) internal pure returns (bytes memory) {
        bytes memory executionCalldata = abi.encodePacked(target, value, innerCallData);
        bytes32 execMode = bytes32(0);
        return abi.encodeWithSelector(0xe9ae5c53, execMode, executionCalldata);
    }
    
    function _buildRouterCallData(
        bytes memory commands,
        bytes[] memory inputs,
        uint256 deadline
    ) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(0x3593564c, commands, inputs, deadline);
    }

    function _buildV3SwapInput(
        address recipient, uint256 amountIn, uint256 amountOutMin, bytes memory path, bool payerIsUser
    ) internal pure returns (bytes memory) {
        return abi.encode(recipient, amountIn, amountOutMin, path, payerIsUser);
    }

    function _buildValidPath() internal pure returns (bytes memory) {
        return abi.encodePacked(USDC, uint24(500), WETH);
    }

    function _signAndSetSig(PackedUserOperation memory userOp) internal view {
        bytes32 surrogateHash = keccak256(abi.encode(userOp.sender, userOp.nonce, userOp.callData));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(securitySignerKey, surrogateHash.toEthSignedMessageHash());
        userOp.signature = abi.encodePacked(r, s, v);
    }

    // ==================== SUCCESS TESTS ====================

    function test_Success_ValidSwap_UserOpSender() public {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(account, 500e6, 490e6, _buildValidPath(), true);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        uint256 deadline = block.timestamp + 100;
        bytes memory routerCallData = _buildRouterCallData(commands, inputs, deadline);
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, routerCallData);
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        uint256 validationData = policy.checkUserOpPolicy(PERMISSION_ID, userOp);
        
        uint256 expected = (uint256(deadline) << 160) | (uint256(0) << 208) | 0;
        assertEq(validationData, expected);
    }

    function test_Success_ValidSwap_Address1() public {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(address(1), 500e6, 490e6, _buildValidPath(), true);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        uint256 deadline = block.timestamp + 100;
        bytes memory routerCallData = _buildRouterCallData(commands, inputs, deadline);
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, routerCallData);
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        uint256 validationData = policy.checkUserOpPolicy(PERMISSION_ID, userOp);
        
        uint256 expected = (uint256(deadline) << 160) | (uint256(0) << 208) | 0;
        assertEq(validationData, expected);
    }

    // ==================== NEGATIVE TESTS ====================

    function test_Revert_WrongOuterSelector() public {
        // callData starts with raw execute selector (0xe9ae5c53) instead of executeUserOp
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(account, 500e6, 490e6, _buildValidPath(), true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        
        bytes memory callData = _buildExecuteCallDataNoWrapper(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        vm.expectRevert(AegisMindPolicy.InvalidSelector.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_WrongNestedSelector() public {
        // Correct outer executeUserOp, but wrong nested selector (not execute)
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(account, 500e6, 490e6, _buildValidPath(), true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        bytes memory routerCallData = _buildRouterCallData(commands, inputs, block.timestamp + 100);
        bytes memory executionCalldata = abi.encodePacked(UNIVERSAL_ROUTER, uint256(0), routerCallData);
        
        // Use wrong nested selector 0xdeadbeef instead of 0xe9ae5c53
        bytes memory wrongInner = abi.encodeWithSelector(0xdeadbeef, bytes32(0), executionCalldata);
        bytes memory callData = abi.encodePacked(bytes4(0x8dd7712f), wrongInner);
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        vm.expectRevert(AegisMindPolicy.InvalidSelector.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_DelegateCall() public {
        // CALLTYPE_DELEGATECALL = 0xff in first byte of ExecMode
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(account, 500e6, 490e6, _buildValidPath(), true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        bytes memory routerCallData = _buildRouterCallData(commands, inputs, block.timestamp + 100);
        bytes memory executionCalldata = abi.encodePacked(UNIVERSAL_ROUTER, uint256(0), routerCallData);
        
        bytes32 delegateMode = bytes32(bytes1(0xff)); // delegatecall
        bytes memory executePayload = abi.encodeWithSelector(0xe9ae5c53, delegateMode, executionCalldata);
        bytes memory callData = abi.encodePacked(bytes4(0x8dd7712f), executePayload);
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        vm.expectRevert(AegisMindPolicy.InvalidCallType.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_WrongRecipient() public {
        bytes[] memory inputs = new bytes[](1);
        // Attacker address
        inputs[0] = _buildV3SwapInput(address(0xbad), 500e6, 490e6, _buildValidPath(), true);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        vm.expectRevert(AegisMindPolicy.InvalidTarget.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_WrongOutputToken() public {
        bytes[] memory inputs = new bytes[](1);
        // Path to scam token instead of WETH
        bytes memory badPath = abi.encodePacked(USDC, uint24(500), address(0x999));
        inputs[0] = _buildV3SwapInput(account, 500e6, 490e6, badPath, true);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        vm.expectRevert(AegisMindPolicy.InvalidToken.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_WrongRouter() public {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(account, 500e6, 490e6, _buildValidPath(), true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        
        // Target is not Universal Router
        bytes memory callData = _buildCallData(address(0xbad), 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        _signAndSetSig(userOp);
        
        vm.expectRevert(AegisMindPolicy.InvalidTarget.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }


    function test_Revert_CheckSignaturePolicy() public {
        vm.expectRevert(AegisMindPolicy.SignatureValidationNotSupported.selector);
        policy.checkSignaturePolicy(PERMISSION_ID, address(0), bytes32(0), "");
    }
    function _buildValidUserOpWithAmount(uint256 amount) internal view returns (PackedUserOperation memory) {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(address(1), amount, 0, _buildValidPath(), true);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        
        bytes memory routerCallData = _buildRouterCallData(commands, inputs, block.timestamp + 100);
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, routerCallData);
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        
        return userOp;
    }

    function test_Success_499_999999_USDC() public {
        PackedUserOperation memory userOp = _buildValidUserOpWithAmount(499999999);
        uint256 val = policy.checkUserOpPolicy(PERMISSION_ID, userOp);
        assertEq(val & 1, 0);
    }

    function test_Success_Exactly_500_USDC() public {
        PackedUserOperation memory userOp = _buildValidUserOpWithAmount(500e6);
        uint256 val = policy.checkUserOpPolicy(PERMISSION_ID, userOp);
        assertEq(val & 1, 0);
    }

    function test_Revert_500_000001_USDC() public {
        PackedUserOperation memory userOp = _buildValidUserOpWithAmount(500000001);
        vm.expectRevert(AegisMindPolicy.ExceedsMaxAmount.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_2000_USDC() public {
        PackedUserOperation memory userOp = _buildValidUserOpWithAmount(2000e6);
        vm.expectRevert(AegisMindPolicy.ExceedsMaxAmount.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_MalformedAmount() public {
        // Build an invalid input array that is too short to be decoded properly
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(address(1)); // Missing amountIn, etc.
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        
        bytes memory routerCallData = _buildRouterCallData(commands, inputs, block.timestamp + 100);
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, routerCallData);
        
        PackedUserOperation memory userOp;
        userOp.sender = account;
        userOp.nonce = 1;
        userOp.callData = callData;
        
        vm.expectRevert(); // Typically revert without custom error due to abi.decode failing
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }
    function test_Revert_WrongPayerMode() public {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(address(1), 500e6, 0, _buildValidPath(), false); // payerIsUser = false
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        PackedUserOperation memory userOp; userOp.sender = account; userOp.nonce = 1; userOp.callData = callData;
        vm.expectRevert(AegisMindPolicy.InvalidTarget.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_MalformedPathLength() public {
        bytes[] memory inputs = new bytes[](1);
        bytes memory badPath = new bytes(42); // Not 43
        inputs[0] = _buildV3SwapInput(address(1), 500e6, 0, badPath, true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x00;
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        PackedUserOperation memory userOp; userOp.sender = account; userOp.nonce = 1; userOp.callData = callData;
        vm.expectRevert(AegisMindPolicy.MalformedCalldata.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }

    function test_Revert_WrongCommand() public {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(address(1), 500e6, 0, _buildValidPath(), true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x01; // V3_SWAP_EXACT_OUT instead of V3_SWAP_EXACT_IN (0x00)
        bytes memory callData = _buildCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        PackedUserOperation memory userOp; userOp.sender = account; userOp.nonce = 1; userOp.callData = callData;
        vm.expectRevert(AegisMindPolicy.InvalidCommand.selector);
        policy.checkUserOpPolicy(PERMISSION_ID, userOp);
    }
}

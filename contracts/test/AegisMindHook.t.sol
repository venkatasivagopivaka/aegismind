// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import "../src/AegisMindHook.sol";

// Mock Chainlink Feed to deterministically control price and staleness
contract MockChainlinkFeed {
    int256 public mockAnswer;
    uint256 public mockUpdatedAt;

    constructor(int256 _answer, uint256 _updatedAt) {
        mockAnswer = _answer;
        mockUpdatedAt = _updatedAt;
    }

    function setAnswer(int256 _answer) external {
        mockAnswer = _answer;
    }

    function setUpdatedAt(uint256 _updatedAt) external {
        mockUpdatedAt = _updatedAt;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, mockAnswer, 0, mockUpdatedAt, 1);
    }
}

contract AegisMindHookTest is Test {
    AegisMindHook public hook;
    MockChainlinkFeed public feed;
    
    address public constant UNIVERSAL_ROUTER = 0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD;
    address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    address public treasury = address(0x111);
    uint256 public constant DAILY_LIMIT = 10000e6; // 10,000 USDC
    
    uint256 public constant MAX_SLIPPAGE = 100; // 1%
    uint256 public constant MAX_STALENESS = 3600; 
    
    function setUp() public {
        vm.warp(100000);
        // Default Oracle Price: $3000.00000000 per ETH (8 decimals)
        feed = new MockChainlinkFeed(300000000000, block.timestamp);
        
        hook = new AegisMindHook(address(feed), MAX_SLIPPAGE, MAX_STALENESS);
        
        vm.prank(treasury);
        hook.onInstall(abi.encode(DAILY_LIMIT));
    }

    function _buildExecuteCallData(address target, uint256 value, bytes memory innerCallData) internal pure returns (bytes memory) {
        bytes memory executionCalldata = abi.encodePacked(target, value, innerCallData);
        bytes32 execMode = bytes32(0);
        return abi.encodeWithSelector(0xe9ae5c53, execMode, executionCalldata);
    }
    
    function _buildRouterCallData(bytes memory commands, bytes[] memory inputs, uint256 deadline) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(0x3593564c, commands, inputs, deadline);
    }

    function _buildV3SwapInput(address recipient, uint256 amountIn, uint256 amountOutMin, bytes memory path) internal pure returns (bytes memory) {
        return abi.encode(recipient, amountIn, amountOutMin, path, true);
    }

    function _buildValidPath() internal pure returns (bytes memory) {
        return abi.encodePacked(USDC, uint24(500), WETH);
    }
    
    function _executeHook(uint256 amountIn, uint256 amountOutMin) internal {
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = _buildV3SwapInput(treasury, amountIn, amountOutMin, _buildValidPath());
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        bytes memory msgData = _buildExecuteCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        
        vm.prank(treasury);
        hook.preCheck(address(0), 0, msgData);
    }

    function test_Success_ValidSlippage_ExactFloor() public {
        // Oracle = $3000
        // Swap 3000 USDC -> Expected WETH = 1e18
        // 1% max slippage -> Floor = 0.99e18
        uint256 amountIn = 3000e6;
        uint256 calculatedMin = 0.99e18; // 990000000000000000
        
        _executeHook(amountIn, calculatedMin); // should pass
    }

    function test_Success_ValidSlippage_AboveFloor() public {
        uint256 amountIn = 3000e6;
        _executeHook(amountIn, 0.995e18); // Pass
    }

    function test_Revert_AmountOutMin_Zero() public {
        uint256 amountIn = 3000e6;
        vm.expectRevert(AegisMindHook.ExceedsSlippage.selector);
        _executeHook(amountIn, 0); 
    }

    function test_Revert_AmountOutMin_BelowFloor() public {
        uint256 amountIn = 3000e6;
        // Floor is 0.99e18. 0.9899e18 is 1 wei below (actually much more).
        vm.expectRevert(AegisMindHook.ExceedsSlippage.selector);
        _executeHook(amountIn, 0.98e18); 
    }
    
    function test_Revert_AmountOutMin_OneWeiBelowFloor() public {
        uint256 amountIn = 3000e6;
        uint256 floor = 0.99e18;
        
        vm.expectRevert(AegisMindHook.ExceedsSlippage.selector);
        _executeHook(amountIn, floor - 1); 
    }

    function test_Revert_StaleOracle() public {
        // Move time past staleness threshold
        vm.warp(block.timestamp + MAX_STALENESS + 1);
        
        vm.expectRevert(AegisMindHook.InvalidOracleData.selector);
        _executeHook(3000e6, 0.99e18); 
    }

    function test_Revert_ZeroPrice() public {
        feed.setAnswer(0);
        vm.expectRevert(AegisMindHook.InvalidOracleData.selector);
        _executeHook(3000e6, 0.99e18); 
    }

    function test_Revert_WrongOutputToken() public {
        bytes[] memory inputs = new bytes[](1);
        bytes memory badPath = abi.encodePacked(USDC, uint24(500), address(0x999));
        inputs[0] = _buildV3SwapInput(treasury, 3000e6, 0.99e18, badPath);
        
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        bytes memory msgData = _buildExecuteCallData(UNIVERSAL_ROUTER, 0, _buildRouterCallData(commands, inputs, block.timestamp + 100));
        
        vm.prank(treasury);
        vm.expectRevert(AegisMindHook.InvalidToken.selector);
        hook.preCheck(address(0), 0, msgData);
    }
    
    function test_Rounding_Math() public {
        // Test rounding up division
        // Let's use an arbitrary price: $3333.33333333 = 333333333333
        feed.setAnswer(333333333333);
        // amountIn = 100 USDC = 100000000
        // maxSlippage = 1%
        
        // expectedWeth = 100e6 * 1e20 / 333333333333 = 30000000000000000 (roughly 0.03 ETH)
        // numerator = 100000000 * 1e20 * 9900 = 99000000000000000000000000000000
        // denominator = 333333333333 * 10000 = 3333333333330000
        // exact div = 29700000000029700
        // remainder = 10000
        // Because of remainder, rounding UP adds 1 -> 29700000000029701
        
        uint256 floor = 29700000000029701;
        
        // Exact floor passes
        _executeHook(100e6, floor);
        
        // Floor - 1 reverts
        vm.expectRevert(AegisMindHook.ExceedsSlippage.selector);
        _executeHook(100e6, floor - 1);
    }

    function test_Persistent_State_On_Uninstall() public {
        _executeHook(3000e6, 0.99e18); // Spends 3000

        // Uninstall
        vm.prank(treasury);
        hook.onUninstall("");

        // Spent should still be 3000
        (, uint256 spentToday, uint256 limit, ) = hook.treasuryStates(treasury);
        assertEq(spentToday, 3000e6);
        assertEq(limit, 0); 
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {IHook} from "kernel/src/interfaces/IERC7579Modules.sol";

interface AggregatorV3Interface {
  function latestRoundData()
    external
    view
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
}

/**
 * @title AegisMindHook
 * @notice Singleton Hook for execution-phase stateful enforcement of daily USDC budgets
 *         and mathematically deterministic slippage bounds via Chainlink.
 */
contract AegisMindHook is IHook {
    error AegisMindAlreadyInitialized();
    error Paused();
    error InvalidSelector();
    error InvalidCallType();
    error InvalidTarget();
    error InvalidCommand();
    error MalformedCalldata();
    error ExceedsBudget();
    error InvalidOracleData();
    error ExceedsSlippage();
    error InvalidToken();

    bytes4 public constant KERNEL_EXECUTE_SELECTOR = 0xe9ae5c53;
    address public constant UNIVERSAL_ROUTER = 0x8B844f885672f333Bc0042cB669255f93a4C1E6b;
    
    address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address public constant WETH = 0x4200000000000000000000000000000000000006;

    AggregatorV3Interface public immutable chainlinkFeed;
    uint256 public immutable maxSlippageBps;
    uint256 public immutable maxStaleness;

    struct AccountState {
        uint256 currentDay;
        uint256 spentToday;
        uint256 dailyUsdcLimit;
        bool paused;
    }

    // Account (Kernel) => State
    mapping(address => AccountState) public treasuryStates;

    /**
     * @param _feed Address of the Base Sepolia ETH/USD Chainlink feed
     * @param _maxSlippageBps Max allowable slippage in basis points (e.g., 100 = 1%)
     * @param _maxStaleness Max allowable oracle staleness in seconds (e.g., 3600)
     */
    constructor(address _feed, uint256 _maxSlippageBps, uint256 _maxStaleness) {
        require(_maxSlippageBps <= 10000, "Slippage exceeds 100%");
        chainlinkFeed = AggregatorV3Interface(_feed);
        maxSlippageBps = _maxSlippageBps;
        maxStaleness = _maxStaleness;
    }

    function onInstall(bytes calldata data) external payable override {
        uint256 dailyLimit = abi.decode(data, (uint256));
        treasuryStates[msg.sender].dailyUsdcLimit = dailyLimit;
    }

    function onUninstall(bytes calldata data) external payable override {
        treasuryStates[msg.sender].dailyUsdcLimit = 0;
    }

    function isModuleType(uint256 moduleTypeId) external pure override returns (bool) {
        return moduleTypeId == 4; // MODULE_TYPE_HOOK
    }

    function isInitialized(address smartAccount) external view override returns (bool) {
        return false;
    }

    function preCheck(address msgSender, uint256 msgValue, bytes calldata msgData)
        external
        payable
        override
        returns (bytes memory hookData)
    {
        AccountState storage state = treasuryStates[msg.sender];
        if (state.paused) revert Paused();

        // 1. Independent Structural Checks
        if (msgData.length < 100) revert MalformedCalldata();
        if (bytes4(msgData[0:4]) != KERNEL_EXECUTE_SELECTOR) revert InvalidSelector();

        (bytes32 mode, bytes memory executionCalldata) = abi.decode(msgData[4:], (bytes32, bytes));
        if (bytes1(mode) != 0x00) revert InvalidCallType(); 
        
        if (executionCalldata.length < 52) revert MalformedCalldata();
        address target;
        uint256 value;
        assembly {
            target := shr(96, mload(add(executionCalldata, 32)))
            value := mload(add(executionCalldata, 52))
        }
        if (target != UNIVERSAL_ROUTER) revert InvalidTarget();
        if (value != 0) revert MalformedCalldata();

        bytes memory innerCalldata = _slice(executionCalldata, 52);
        if (innerCalldata.length < 4) revert MalformedCalldata();
        if (bytes4(innerCalldata) != 0x3593564c) revert InvalidCommand();

        (bytes memory commands, bytes[] memory inputs, ) = abi.decode(
            _slice(innerCalldata, 4),
            (bytes, bytes[], uint256)
        );

        if (commands.length != 1 || commands[0] != 0x00) revert InvalidCommand();
        if (inputs.length != 1) revert MalformedCalldata();

        (, uint256 amountIn, uint256 amountOutMin, bytes memory path, ) = abi.decode(inputs[0], (address, uint256, uint256, bytes, bool));

        if (path.length != 43) revert MalformedCalldata();
        if (address(bytes20(path)) != USDC) revert InvalidToken();
        if (address(bytes20(_slice(path, 23))) != WETH) revert InvalidToken();

        // 2. Oracle Slippage Enforcement (USDC -> WETH)
        _verifySlippage(amountIn, amountOutMin);

        // 3. Daily Limit Enforcement
        uint256 today = block.timestamp / 1 days;
        if (state.currentDay != today) {
            state.currentDay = today;
            state.spentToday = 0;
        }

        if (state.spentToday + amountIn > state.dailyUsdcLimit) revert ExceedsBudget();
        state.spentToday += amountIn;

        return "";
    }

    function postCheck(bytes calldata hookData) external payable override {
        // No post-execution checks required for Phase 1A
    }

    function togglePause() external {
        treasuryStates[msg.sender].paused = !treasuryStates[msg.sender].paused;
    }

    // --- Internal Helpers ---
    function _slice(bytes memory data, uint256 start) internal pure returns (bytes memory) {
        bytes memory result = new bytes(data.length - start);
        for (uint256 i = start; i < data.length; i++) {
            result[i - start] = data[i];
        }
        return result;
    }

    function _verifySlippage(uint256 amountIn, uint256 amountOutMin) internal view {
        (, int256 answer, , uint256 updatedAt, ) = chainlinkFeed.latestRoundData();
        if (answer <= 0) revert InvalidOracleData();
        if (updatedAt == 0 || block.timestamp - updatedAt > maxStaleness) revert InvalidOracleData();

        // Formula: minWeth = (amountIn * 1e20 * (10000 - maxSlippageBps)) / (price * 10000)
        // Rounded UP by adding (denominator - 1) to numerator
        uint256 numerator = amountIn * 1e20 * (10000 - maxSlippageBps);
        uint256 denominator = uint256(answer) * 10000;
        uint256 calculatedMin = (numerator + denominator - 1) / denominator;

        if (amountOutMin < calculatedMin) revert ExceedsSlippage();
    }
}

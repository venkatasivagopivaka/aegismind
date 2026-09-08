// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract MockChainlinkFeed {
    int256 public answer = 3000e8; // 3000 USD/ETH default
    uint256 public updatedAt = block.timestamp;
    uint8 public constant decimals = 8;

    function setAnswer(int256 _answer) external { 
        answer = _answer; 
    }
    
    function setUpdatedAt(uint256 _updatedAt) external { 
        updatedAt = _updatedAt; 
    }

    function latestRoundData() external view returns (
        uint80 roundId,
        int256 _answer,
        uint256 startedAt,
        uint256 _updatedAt,
        uint80 answeredInRound
    ) {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}

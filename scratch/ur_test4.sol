// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
contract URTest {
    function decode4(bytes memory data) public pure returns (address, uint256, uint256, bytes memory) {
        return abi.decode(data, (address, uint256, uint256, bytes));
    }
}

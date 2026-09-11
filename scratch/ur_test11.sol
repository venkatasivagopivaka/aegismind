// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract URTest {
    function toBytes(bytes calldata _bytes, uint256 index) internal pure returns (bytes calldata result) {
        uint256 offset;
        assembly {
            offset := calldataload(add(_bytes.offset, mul(index, 0x20)))
            let arrayOffset := add(_bytes.offset, offset)
            result.offset := add(arrayOffset, 0x20)
            result.length := calldataload(arrayOffset)
        }
    }

    function dispatch(bytes calldata inputs) external pure returns (uint256 pathLen) {
        bytes calldata path = toBytes(inputs, 3);
        return path.length;
    }
}

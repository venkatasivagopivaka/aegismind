// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract URTest {
    error SliceOutOfBounds();

    function toBytes(bytes calldata _bytes, uint256 index) internal pure returns (bytes calldata result) {
        uint256 offset;
        assembly {
            offset := calldataload(add(_bytes.offset, mul(index, 0x20)))
            let arrayOffset := add(_bytes.offset, offset)
            result.offset := add(arrayOffset, 0x20)
            result.length := calldataload(arrayOffset)
        }
    }

    function toUint256Array(bytes calldata _bytes, uint256 index) internal pure returns (uint256[] calldata result) {
        uint256 offset;
        assembly {
            offset := calldataload(add(_bytes.offset, mul(index, 0x20)))
            let arrayOffset := add(_bytes.offset, offset)
            result.offset := add(arrayOffset, 0x20)
            result.length := calldataload(arrayOffset)
        }
    }

    function dispatch(bytes calldata inputs) external pure {
        bytes calldata path = toBytes(inputs, 3);
        uint256[] calldata minHopPriceX36 = toUint256Array(inputs, 5);
        if (path.length < 43) revert SliceOutOfBounds();
        
        // Let's print the lengths to see what they are!
        require(path.length == 43, "path length wrong");
        require(minHopPriceX36.length == 0, "min hop wrong");
    }
}

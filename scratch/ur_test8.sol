// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract URTest {
    error SliceOutOfBounds();

    function decodeV3ExactIn(bytes calldata inputs) internal pure returns (address recipient, uint256 amountIn, uint256 amountOutMin, bytes calldata path) {
        assembly {
            recipient := calldataload(inputs.offset)
            amountIn := calldataload(add(inputs.offset, 0x20))
            amountOutMin := calldataload(add(inputs.offset, 0x40))
            let pathOffset := add(inputs.offset, calldataload(add(inputs.offset, 0x60)))
            path.offset := add(pathOffset, 0x20)
            path.length := calldataload(pathOffset)
        }
    }

    function simulateRouter(bytes calldata inputs) external pure {
        (address recipient, uint256 amountIn, uint256 amountOutMin, bytes calldata path) = decodeV3ExactIn(inputs);
        if (path.length < 43) revert SliceOutOfBounds();
    }
}

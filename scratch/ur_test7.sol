// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract URTest {
    error SliceOutOfBounds();

    function decodeV3ExactIn(bytes calldata inputs) internal pure returns (address recipient, uint256 amountIn, uint256 amountOutMin, bytes calldata path) {
        // Universal Router V2 uses abi.decode for V3_SWAP_EXACT_IN
        return abi.decode(inputs, (address, uint256, uint256, bytes));
    }

    function simulateRouter(bytes calldata inputs) external pure {
        (address recipient, uint256 amountIn, uint256 amountOutMin, bytes calldata path) = decodeV3ExactIn(inputs);
        if (path.length < 43) revert SliceOutOfBounds();
    }
}

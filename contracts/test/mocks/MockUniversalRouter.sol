// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract MockUniversalRouter {
    address private constant MSG_SENDER_ALIAS = address(1);
    
    uint256 public mockAmountOut;

    constructor(uint256 _mockAmountOut) {
        mockAmountOut = _mockAmountOut;
    }

    function setMockAmountOut(uint256 _amount) external {
        mockAmountOut = _amount;
    }

    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable {
        require(block.timestamp <= deadline, "Transaction too old");
        require(commands.length == 1, "Only one command supported");
        require(commands[0] == 0x00, "Only V3_SWAP_EXACT_IN (0x00) supported");
        require(inputs.length == 1, "Inputs length mismatch");

        (address recipient, uint256 amountIn, uint256 amountOutMinimum, bytes memory path, bool payerIsUser) = abi.decode(inputs[0], (address, uint256, uint256, bytes, bool));
        
        require(payerIsUser, "payerIsUser must be true");
        require(path.length >= 43, "Path too short");
        
        address tokenIn = address(bytes20(path));
        // Token out is the last 20 bytes of the path
        address tokenOut = address(bytes20(_slice(path, path.length - 20)));

        require(mockAmountOut >= amountOutMinimum, "Insufficient output amount");

        // 1. Take tokenIn from user
        bool successIn = IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        require(successIn, "TransferIn failed");

        // 2. Send tokenOut to recipient
        address actualRecipient = recipient == MSG_SENDER_ALIAS ? msg.sender : recipient;
        bool successOut = IERC20(tokenOut).transfer(actualRecipient, mockAmountOut);
        require(successOut, "TransferOut failed");
    }

    function _slice(bytes memory data, uint256 start) internal pure returns (bytes memory) {
        bytes memory result = new bytes(data.length - start);
        for (uint256 i = start; i < data.length; i++) {
            result[i - start] = data[i];
        }
        return result;
    }
}

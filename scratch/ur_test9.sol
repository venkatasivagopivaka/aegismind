// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "forge-std/Script.sol";

contract URTest is Script {
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

    function simulateRouter(bytes calldata inputs) public pure {
        (address recipient, uint256 amountIn, uint256 amountOutMin, bytes calldata path) = decodeV3ExactIn(inputs);
        if (path.length < 43) revert SliceOutOfBounds();
    }

    function run() public view {
        bytes memory data = hex"000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006000000000000000000000000000000000000000000";
        // Need to simulate passing `data` as calldata
    }
}

contract Caller {
    URTest test;
    constructor(URTest _test) { test = _test; }
    function callIt(bytes calldata data) public view {
        test.simulateRouter(data);
    }
}

contract Runner is Script {
    function run() public {
        URTest test = new URTest();
        Caller caller = new Caller(test);
        bytes memory data = hex"000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006000000000000000000000000000000000000000000";
        caller.callIt(data);
    }
}

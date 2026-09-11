// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";

contract URTest {
    function dispatch(bytes calldata inputs) external pure returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        uint256 offset;
        uint256 arrayOffset;
        uint256 len;
        assembly {
            offset := calldataload(add(inputs.offset, 0x60))
            arrayOffset := add(inputs.offset, offset)
            len := calldataload(arrayOffset)
        }
        return (inputs.offset, offset, arrayOffset, len, inputs.length, 0);
    }
}

contract Runner is Script {
    function run() public {
        URTest test = new URTest();
        bytes memory data = hex"000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006000000000000000000000000000000000000000000";
        (uint256 io, uint256 off, uint256 ao, uint256 l, uint256 il, ) = test.dispatch(data);
        console.log("inputs.offset:", io);
        console.log("offset:", off);
        console.log("arrayOffset:", ao);
        console.log("length:", l);
        console.log("inputs.length:", il);
    }
}

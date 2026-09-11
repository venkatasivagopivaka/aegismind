// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/Script.sol";

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

contract Runner is Script {
    function run() public {
        URTest test = new URTest();
        bytes memory data = hex"000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002b036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006000000000000000000000000000000000000000000";
        // Call it natively
        (bool ok, bytes memory ret) = address(test).staticcall(abi.encodeWithSelector(test.dispatch.selector, data));
        console.log("Success:", ok);
        console.log("Length:", abi.decode(ret, (uint256)));
    }
}

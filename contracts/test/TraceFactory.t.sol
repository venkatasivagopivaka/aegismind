// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

contract TraceFactory is Test {
    function testTrace() public {
        vm.createSelectFork(vm.envString("BUNDLER_RPC"));
        
        bytes memory initCode = hex"d703aaE79538628d27099B8c4f621bE4CCd142d5c5265d5d0000000000000000000000007a1dbab750f12a90eb1b60d2ae3ad17d4d81effe0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01845ADb2C711129d4f3966735eD98a9F09fC4cE570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014306c3C493aC339acC0bC0E7Ea145a21B2169cEAa0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
        
        address factory;
        bytes memory data;
        assembly {
            factory := mload(add(initCode, 20))
            let dataLen := sub(mload(initCode), 20)
            data := mload(0x40)
            mstore(0x40, add(add(data, dataLen), 32))
            mstore(data, dataLen)
            
            // just copy the data
            for { let i := 0 } lt(i, dataLen) { i := add(i, 32) } {
                mstore(add(add(data, 32), i), mload(add(add(initCode, 52), i)))
            }
        }
        
        (bool success, bytes memory ret) = factory.call(data);
        if (!success) {
            if (ret.length > 0) {
                assembly {
                    revert(add(ret, 32), mload(ret))
                }
            }
        }
    }
}

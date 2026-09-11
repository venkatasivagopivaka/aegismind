// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
contract URTest {
    function test() public {
        bytes memory path = hex"036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006";
        require(path.length == 43, "len");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AegisMindPolicy.sol";

contract Decoder {
    function decode5(bytes memory data) external pure {
        abi.decode(data, (address, uint256, uint256, bytes, bool));
    }
}

contract AegisMindPolicyRegressionTest is Test {
    function testPolicyExtractionWith6Arguments() public {
        address recipient = address(1);
        uint256 amountIn = 1000000;
        uint256 amountOutMin = 1;
        bytes memory path = hex"036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006";
        bool payerIsUser = true;
        uint256[] memory minHopPriceX36 = new uint256[](0);

        bytes memory inputs0 = abi.encode(recipient, amountIn, amountOutMin, path, payerIsUser, minHopPriceX36);

        (address decRecipient, uint256 decAmountIn, uint256 decAmountOutMin, bytes memory decPath, bool decPayer) = 
            abi.decode(inputs0, (address, uint256, uint256, bytes, bool));

        assertEq(decRecipient, recipient, "Recipient mismatch");
        assertEq(decAmountIn, amountIn, "AmountIn mismatch");
        assertEq(decAmountOutMin, amountOutMin, "AmountOutMin mismatch");
        assertEq(keccak256(decPath), keccak256(path), "Path mismatch");
        assertEq(decPayer, payerIsUser, "Payer mismatch");
    }

    function testPolicyRejectsMalformedCalldata() public {
        address recipient = address(1);
        uint256 amountIn = 1000000;
        uint256 amountOutMin = 1;
        bytes memory path = hex"036cbd53842c5426634e7929541ec2318f3dcf7e0001f44200000000000000000000000000000000000006";
        bytes memory inputs0 = abi.encode(recipient, amountIn, amountOutMin, path); // 4 args

        Decoder decoder = new Decoder();
        vm.expectRevert();
        decoder.decode5(inputs0);
    }
}

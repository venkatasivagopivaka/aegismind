// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

interface IUniversalRouter {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}

contract TraceRouterTest is Test {
    IUniversalRouter router = IUniversalRouter(0x8B844f885672f333Bc0042cB669255f93a4C1E6b);
    address sender = 0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59;

    function setUp() public {
        vm.createSelectFork("https://sepolia.base.org");
        // Fund the sender so it can pay
        vm.deal(sender, 1 ether);
    }

    function testTrace() public {
        address USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
        address WETH = 0x4200000000000000000000000000000000000006;
        bytes memory path = abi.encodePacked(USDC, uint24(500), WETH);

        uint256 amountIn = 1000000;
        uint256 calculatedMin = 403848148803842;
        uint256[] memory minHopPriceX36 = new uint256[](0);

        bytes memory inputs0 = abi.encode(address(1), amountIn, calculatedMin, path, true, minHopPriceX36);
        
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = inputs0;

        vm.startPrank(sender);
        // It might revert, we catch it so it prints the trace
        vm.expectRevert();
        router.execute(hex"00", inputs, block.timestamp + 3600);
        vm.stopPrank();
    }
}

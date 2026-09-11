// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";
import {EntryPointLib} from "kernel/test/base/erc4337Util.sol";
import {IEntryPoint} from "kernel/src/interfaces/IEntryPoint.sol";
import "kernel/src/factory/KernelFactory.sol";
import "kernel/src/Kernel.sol";
import "kernel/src/validator/ECDSAValidator.sol";
import "kernel/src/interfaces/PackedUserOperation.sol";
import "kernel/src/utils/ValidationTypeLib.sol";
import "kernel/src/types/Constants.sol";
import "kernel/src/types/Structs.sol";
import {ExecMode} from "kernel/src/types/Types.sol";
import "kernel/src/core/ValidationManager.sol";

import "../../src/AegisMindPolicy.sol";
import "../../src/AegisMindHook.sol";
import "../mocks/MockChainlinkFeed.sol";
import "../mocks/MockUniversalRouter.sol";
import "../mocks/MockSigner.sol";
import "solady/tokens/ERC20.sol";
import "solady/utils/ECDSA.sol";

contract MockUSDC is ERC20 {
    function name() public pure override returns (string memory) { return "USDC"; }
    function symbol() public pure override returns (string memory) { return "USDC"; }
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) public { _mint(to, amount); }
}

contract MockWETH is ERC20 {
    function name() public pure override returns (string memory) { return "WETH"; }
    function symbol() public pure override returns (string memory) { return "WETH"; }
    function decimals() public pure override returns (uint8) { return 18; }
    function mint(address to, uint256 amount) public { _mint(to, amount); }
}

contract Phase1B_IntegrationTest is Test {
    using ECDSA for bytes32;

    IEntryPoint entryPoint;
    KernelFactory factory;
    Kernel implementation;
    ECDSAValidator rootValidator;

    MockUSDC usdc;
    MockWETH weth;
    MockChainlinkFeed feed;
    MockUniversalRouter router;
    MockSigner mockSigner;

    AegisMindPolicy policy;
    AegisMindHook hook;

    Account owner;
    Account aiAgent;

    Kernel kernel;
    bytes4 constant PERMISSION_ID = 0x12345678;

    address constant USDC_ADDR = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH_ADDR = 0x4200000000000000000000000000000000000006;
    address constant ROUTER_ADDR = 0x8B844f885672f333Bc0042cB669255f93a4C1E6b;

    function setUp() public {
        owner = makeAccount("owner");
        aiAgent = makeAccount("aiAgent");

        entryPoint = IEntryPoint(EntryPointLib.deploy());
        implementation = new Kernel(entryPoint);
        factory = new KernelFactory(address(implementation));
        rootValidator = new ECDSAValidator();

        MockUSDC usdcImpl = new MockUSDC();
        vm.etch(USDC_ADDR, address(usdcImpl).code);
        usdc = MockUSDC(USDC_ADDR);

        MockWETH wethImpl = new MockWETH();
        vm.etch(WETH_ADDR, address(wethImpl).code);
        weth = MockWETH(WETH_ADDR);

        MockUniversalRouter routerImpl = new MockUniversalRouter(0);
        vm.etch(ROUTER_ADDR, address(routerImpl).code);
        router = MockUniversalRouter(ROUTER_ADDR);
        router.setMockAmountOut(160e15);

        feed = new MockChainlinkFeed();
        mockSigner = new MockSigner();

        policy = new AegisMindPolicy();
        hook = new AegisMindHook(address(feed), 500, 3600); // 5% slippage

        // 1. Create Kernel Account
        bytes memory initData = abi.encodeWithSelector(
            Kernel.initialize.selector,
            ValidatorLib.validatorToIdentifier(rootValidator),
            IHook(address(0)),
            abi.encodePacked(owner.addr),
            "",
            new bytes[](0)
        );
        kernel = Kernel(payable(factory.createAccount(initData, bytes32(0))));
        
        // Fund Kernel for gas
        vm.deal(address(kernel), 10 ether);
        // Note: EntryPoint expects deposit on `IEntryPoint`, but `EntryPointLib` bytecode exposes `depositTo`
        // We'll just rely on Kernel having ETH and returning it directly or `depositTo`.
        // The real EntryPoint signature is depositTo(address). IEntryPoint does not have depositTo if it's only execution.
        // Let's cast entryPoint to an interface that has depositTo, or just send ETH to kernel to pay for its own gas, which Kernel v3 does automatically by letting EntryPoint pull funds or using paymaster.
        // Wait, Kernel's `IEntryPoint` might have `depositTo`.
        (bool success, ) = address(entryPoint).call{value: 1 ether}(abi.encodeWithSignature("depositTo(address)", address(kernel)));
        require(success, "deposit failed");

        vm.startPrank(owner.addr);

        // 2. Approve Router to spend Kernel's USDC
        kernel.execute(
            ExecMode.wrap(bytes32(0)),
            abi.encodePacked(
                address(usdc),
                uint256(0),
                abi.encodeWithSelector(ERC20.approve.selector, address(router), type(uint256).max)
            )
        );

        // 3. Install Permission (Policy + MockSigner + Hook)
        ValidationId vId = ValidatorLib.permissionToIdentifier(PermissionId.wrap(PERMISSION_ID));
        ValidationId[] memory vIds = new ValidationId[](1);
        vIds[0] = vId;

        ValidationManager.ValidationConfig[] memory configs = new ValidationManager.ValidationConfig[](1);
        configs[0] = ValidationManager.ValidationConfig({nonce: 1, hook: IHook(address(hook))});

        bytes[] memory permDataArray = new bytes[](2);
        permDataArray[0] = abi.encodePacked(bytes2(0), address(policy), abi.encode(aiAgent.addr));
        permDataArray[1] = abi.encodePacked(bytes2(0), address(mockSigner));

        bytes[] memory valDatas = new bytes[](1);
        valDatas[0] = abi.encode(permDataArray);

        bytes[] memory hookDatas = new bytes[](1);
        hookDatas[0] = abi.encodePacked(bytes1(0x00), abi.encode(1000e6));

        kernel.installValidations(vIds, configs, valDatas, hookDatas);
        kernel.grantAccess(vId, 0xe9ae5c53, true);
        vm.stopPrank();

        // 5. Fund tokens
        usdc.mint(address(kernel), 1000e6);
        weth.mint(address(router), 1000e18);
    }

    function _buildV3SwapInput(
        address recipient, uint256 amountIn, uint256 amountOutMin, bytes memory path, bool payerIsUser
    ) internal pure returns (bytes memory) {
        return abi.encode(recipient, amountIn, amountOutMin, path, payerIsUser);
    }

    function test_Phase1B_HappyPath() public {
        PackedUserOperation memory userOp;
        userOp.sender = address(kernel);
        
        // Initial nonce for this permission key is 0
        userOp.nonce = ValidatorLib.encodePermissionAsNonce(0x00, PERMISSION_ID, 0, 0);

        bytes[] memory inputs = new bytes[](1);
        bytes memory path = abi.encodePacked(address(usdc), uint24(500), address(weth));
        // amountOutMin = 159e15 (0.159 WETH). The mock router outputs 160e15.
        inputs[0] = _buildV3SwapInput(address(1), 500e6, 159e15, path, true);
        bytes memory commands = new bytes(1);
        commands[0] = 0x00; 
        
        bytes memory routerCallData = abi.encodeWithSelector(0x3593564c, commands, inputs, block.timestamp + 100);
        bytes memory executionCalldata = abi.encodePacked(address(router), uint256(0), routerCallData);
        
        // Build nested execute payload, then wrap with executeUserOp selector
        bytes memory executePayload = abi.encodeWithSelector(0xe9ae5c53, bytes32(0), executionCalldata);
        userOp.callData = abi.encodePacked(Kernel.executeUserOp.selector, executePayload);

        userOp.accountGasLimits = bytes32(abi.encodePacked(uint128(2000000), uint128(2000000)));
        userOp.preVerificationGas = 1000000;
        userOp.gasFees = bytes32(abi.encodePacked(uint128(10 gwei), uint128(10 gwei)));

        // AI Agent signs the Policy's surrogateHash
        bytes32 surrogateHash = keccak256(abi.encode(userOp.sender, userOp.nonce, userOp.callData));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(aiAgent.key, surrogateHash.toEthSignedMessageHash());
        bytes memory aiSignature = abi.encodePacked(r, s, v);

        // Pack the signature for ValidationManager
        userOp.signature = abi.encodePacked(uint8(0), uint64(65), aiSignature, uint8(255));

        PackedUserOperation[] memory ops = new PackedUserOperation[](1);
        ops[0] = userOp;

        uint256 usdcBefore = usdc.balanceOf(address(kernel));
        uint256 wethBefore = weth.balanceOf(address(kernel));

        // Submit via EntryPoint
        entryPoint.handleOps(ops, payable(owner.addr));

        uint256 usdcAfter = usdc.balanceOf(address(kernel));
        uint256 wethAfter = weth.balanceOf(address(kernel));

        assertEq(usdcBefore - usdcAfter, 500e6, "USDC not deducted");
        assertEq(wethAfter - wethBefore, 160e15, "WETH not received");
        assertEq(weth.balanceOf(aiAgent.addr), 0, "AI received WETH");
        
        (, uint256 spentToday,, bool paused) = hook.treasuryStates(address(kernel));
        assertEq(spentToday, 500e6, "Spending limit not updated");
        assertFalse(paused, "Should not be paused");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Script, console2} from "forge-std/Script.sol";
import {KernelFactory} from "kernel/src/factory/KernelFactory.sol";
import {ValidatorLib} from "kernel/src/utils/ValidationTypeLib.sol";
import {ValidationManager} from "kernel/src/core/ValidationManager.sol";
import {PermissionId, ValidationId} from "kernel/src/types/Types.sol";
import {IHook, IValidator} from "kernel/src/interfaces/IERC7579Modules.sol";
import {Kernel} from "kernel/src/Kernel.sol";

contract SetupKernel is Script {
    address constant ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    address constant KERNEL_FACTORY_V3_3 = 0x7a1dBAB750f12a90EB1B60D2Ae3aD17D4D81EfFe;
    address constant ECDSA_VALIDATOR = 0x8104e3Ad430EA6d354d013A6789fDFc71E671c43;
    address constant POLICY_ADDR = 0x681B33cEe32267d80Ad72f0B92660D902989009D;
    address constant HOOK_ADDR = 0x8aC3a95Fe5410618b36cBbE054184B23521c421b;
    address constant AI_SIGNER_MODULE = 0x2bedB827302B574fB3aE8907eAAB671e4CC84a9D;

    bytes4 constant PERMISSION_ID = 0x12345678;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(deployerPrivateKey);
        
        address aiAgent = vm.envOr("AI_AGENT_ADDRESS", address(0));
        if (aiAgent == address(0)) {
            console2.log("WARNING: AI_AGENT_ADDRESS not set. Using dummy for simulation.");
            aiAgent = address(0x999);
        }

        KernelFactory factory = KernelFactory(KERNEL_FACTORY_V3_3);
        ValidationId vId = ValidatorLib.permissionToIdentifier(PermissionId.wrap(PERMISSION_ID));
        bytes4 executeSelector = 0xe9ae5c53;

        // Construct initConfig
        bytes[] memory initConfig = new bytes[](1);

        ValidationId[] memory vIds = new ValidationId[](1);
        vIds[0] = vId;
        ValidationManager.ValidationConfig[] memory configs = new ValidationManager.ValidationConfig[](1);
        configs[0] = ValidationManager.ValidationConfig({nonce: 1, hook: IHook(HOOK_ADDR)});
        
        bytes[] memory permDataArray = new bytes[](2);
        permDataArray[0] = abi.encodePacked(bytes2(0), POLICY_ADDR, abi.encode(aiAgent));
        permDataArray[1] = abi.encodePacked(bytes2(0), AI_SIGNER_MODULE);
        
        bytes[] memory valDatas = new bytes[](1);
        valDatas[0] = abi.encode(permDataArray);
        
        bytes[] memory hookDatas = new bytes[](1);
        hookDatas[0] = abi.encodePacked(bytes1(0x00), abi.encode(500e6));
        
        initConfig[0] = abi.encodeWithSelector(
            Kernel.installValidations.selector,
            vIds, configs, valDatas, hookDatas
        );

        bytes memory initData = abi.encodeWithSelector(
            Kernel.initialize.selector,
            ValidatorLib.validatorToIdentifier(IValidator(ECDSA_VALIDATOR)),
            IHook(address(0)),
            abi.encodePacked(owner),
            "",
            initConfig // GrantAccess deliberately omitted due to ABI mismatch
        );

        address predictedAddress = factory.getAddress(initData, bytes32(0));
        console2.log("Kernel Account Address:", predictedAddress);
        
        vm.startBroadcast(deployerPrivateKey);

        if (predictedAddress.code.length == 0) {
            console2.log("Kernel account not deployed. Simulating atomic creation (without grantAccess)...");
            factory.createAccount(initData, bytes32(0));
            console2.log("Kernel account created successfully.");
        }
        
        console2.log("Attempting to simulate grantAccess...");
        (bool success, bytes memory result) = predictedAddress.call(
            abi.encodeWithSelector(Kernel.grantAccess.selector, vId, executeSelector, true)
        );
        if (!success) {
            console2.log("grantAccess simulated call FAILED! Missing from implementation ABI.");
        } else {
            console2.log("grantAccess simulated call SUCCEEDED.");
        }

        vm.stopBroadcast();
        console2.log("Simulation complete. Execution halted due to unresolved ABI ambiguity.");
    }
}

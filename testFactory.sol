pragma solidity ^0.8.0;
interface IUniversalFactory {
    function deployWithFactory(address factory, bytes calldata data, bytes32 salt) external returns (address);
}

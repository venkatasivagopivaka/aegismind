pragma solidity ^0.8.0;
contract Test {
    function getHash(address sender, uint256 nonce, bytes memory callData) public pure returns (bytes32) {
        return keccak256(abi.encode(sender, nonce, callData));
    }
}

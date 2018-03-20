pragma solidity ^0.4.19;

library HashLib {
  function getHash(address recipAddr, address ownerAddr, bytes32 pw1, bytes32 pw2)
    public
    pure
    returns (bytes32) {
      return keccak256(recipAddr, ownerAddr, pw1, pw2);
  }
}
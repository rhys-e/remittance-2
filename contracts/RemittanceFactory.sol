pragma solidity ^0.4.19;

import "./Remittance.sol";

contract RemittanceFactory {

  address[] public contracts;

  event LogNewRemittance(
    address indexed owner,
    address indexed recipient,
    uint amount,
    uint expiration);

  function RemittanceFactory() public {}

  function newRemittance(address recipient, bytes32 hash, uint expiration)
    public
    payable
    returns (address) {
      // should we be passing in the owner rather than using msg.sender?
      Remittance r = (new Remittance).value(msg.value)(msg.sender, recipient, hash, expiration);
      contracts.push(r);

      LogNewRemittance(msg.sender, recipient, msg.value, expiration + block.number);
      return r;
  }

  function getHash(address recipAddr, address ownerAddr, bytes32 pw1, bytes32 pw2)
    public
    pure
    returns (bytes32) {
      return keccak256(recipAddr, ownerAddr, pw1, pw2);
  }

  function() private {}
}

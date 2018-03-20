pragma solidity ^0.4.19;

import "./Ownable.sol";
import "./HashLib.sol";

contract Remittance is Ownable {

  bytes32 private hash;
  uint public expiration;
  address public recipient;
  uint public blockLimit = 40320; // roughly a week

  event LogInvalidated(address indexed owner);
  event LogCreated(address indexed owner, address indexed recipient, uint amount);
  event LogWithdraw(address indexed recipient, uint amount);

  // hash should be constructed from Bob's password and Carol's address.
  // Also including Carol's one-time password (as provided by Alice)
  // otherwise we're building a bit of a rainbow table for Carol the more
  // txs she handles, assuming Alice's allow her to re-use her address.
  function Remittance(address _owner, address _recipient, bytes32 _hash, uint _expiration)
    public
    payable
    Ownable(_owner) {

    require(msg.value > 0);
    require(_recipient != address(0));
    require(_recipient != _owner);
    require(_expiration > 0);
    require(_expiration < blockLimit);

    recipient = _recipient;
    hash = _hash;
    expiration = _expiration + block.number;

    LogCreated(getOwner(), recipient, msg.value);
  }

  // passwords will be public at this point, but funds can only
  // be released to the intended recipient. Hash is more involved than
  // just keccak256(bobsPw) to avoid nasty Carol's rainbow tabling
  function withdraw(bytes32 pw1, bytes32 pw2)
    public
    returns(bool) {

    require(block.number < expiration);
    require(msg.sender == recipient);
    require(HashLib.getHash(recipient, getOwner(), pw1, pw2) == hash);

    uint balance = address(this).balance;

    LogWithdraw(recipient, balance);
    recipient.transfer(balance);

    return true;
  }

  function invalidate()
    public
    onlyOwner
    returns (bool) {

    require(block.number >= expiration);

    LogInvalidated(getOwner());
    getOwner().transfer(address(this).balance);

    return true;
  }

  function()
    private {

  }
}
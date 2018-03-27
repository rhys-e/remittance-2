pragma solidity ^0.4.19;

import "./Stoppable.sol";
import "./PasswordVerifier.sol";

contract Remittance is Stoppable, PasswordVerifier {

  bytes32 private hash;
  uint private expiration;
  address private recipient;
  address private sender;
  uint private blockLimit = 40320; // roughly a week

  event LogInvalidated(address indexed sender);
  event LogCreated(address indexed sender, address indexed recipient, uint amount);
  event LogWithdraw(address indexed recipient, uint amount);

  modifier onlySender() {
    require(msg.sender == sender);
    _;
  }

  // hash should be constructed from Bob's password and Carol's address.
  // Also including Carol's one-time password (as provided by Alice)
  // otherwise we're building a bit of a rainbow table for Carol the more
  // txs she handles, assuming Alice's allow her to re-use her address.
  function Remittance(address _sender, address _recipient, bytes32 _hash, uint _expiration)
    public
    payable
    Ownable(msg.sender) {

    require(msg.value > 0);
    require(_sender != address(0));
    require(_recipient != address(0));
    require(_recipient != _sender);
    require(_expiration > 0);
    require(_expiration < blockLimit);

    sender = _sender;
    recipient = _recipient;
    hash = _hash;
    expiration = _expiration + block.number;

    LogCreated(sender, recipient, msg.value);
  }

  function getBlockLimit()
    view
    public
    returns(uint) {
      return blockLimit;
  }

  // passwords will be public at this point, but funds can only
  // be released to the intended recipient. Hash is more involved than
  // just keccak256(bobsPw) to avoid nasty Carol's rainbow tabling
  function withdraw(bytes32 pw1, bytes32 pw2)
    public
    returns(bool) {

    require(block.number < expiration);
    require(msg.sender == recipient);
    require(getHash(recipient, sender, pw1, pw2) == hash);

    uint balance = address(this).balance;

    LogWithdraw(recipient, balance);
    recipient.transfer(balance);

    return true;
  }

  function invalidate()
    public
    onlySender
    returns (bool) {

    require(block.number >= expiration);

    LogInvalidated(sender);
    sender.transfer(address(this).balance);

    return true;
  }

  function()
    private {

  }
}
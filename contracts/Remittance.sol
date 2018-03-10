pragma solidity ^0.4.19;

contract Remittance {

  bytes32 private hash;
  address public onlyOwner;
  address public recipient;

  event LogInvalidated(address indexed owner);
  event LogCreated(address indexed owner, address indexed recipient, uint amount);
  event LogWithdraw(address indexed recipient, uint amount);

  modifier isOwner() {
      require(msg.sender == onlyOwner);
      _;
  }

  // hash should be constructed from Bob's password and Carol's address.
  // Also including Carol's one-time password (as provided by Alice)
  // otherwise we're building a bit of a rainbow table for Carol the more
  // txs she handles, assuming Alice's allow her to re-use her address.
  function Remittance(address _recipient, bytes32 _hash) public payable {
    require(msg.value > 0);
    require(recipient != address(0));
    require(recipient != msg.sender);

    onlyOwner = msg.sender;
    recipient = _recipient;
    hash = _hash;

    LogCreated(onlyOwner, recipient, msg.value);
  }

  // passwords will be public at this point, but funds can only
  // be released to the intended recipient. Hash is more involved than
  // just keccak256(bobsPw) to avoid nasty Carol's rainbow tabling
  function withdraw(bytes32 pw1, bytes32 pw2) public returns(bool) {
    require(msg.sender == recipient);
    require(keccak256(recipient, pw1, pw2) == hash);

    LogWithdraw(recipient, address(this).balance);

    // cheaper than a transfer - any reason to keep contract after this?
    selfdestruct(recipient);

    return true;
  }

  function invalidate() public isOwner returns (bool) {
    LogInvalidated(onlyOwner);

    selfdestruct(onlyOwner);

    return true;
  }

  function() private {

  }
}
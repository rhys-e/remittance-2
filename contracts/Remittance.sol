pragma solidity ^0.4.19;

contract Remittance {

  bytes32 private hash;
  uint public expiration;
  address public owner;
  address public recipient;

  event LogInvalidated(address indexed owner);
  event LogCreated(address indexed owner, address indexed recipient, uint amount);
  event LogWithdraw(address indexed recipient, uint amount);

  modifier onlyOwner() {
      require(msg.sender == owner);
      _;
  }

  // hash should be constructed from Bob's password and Carol's address.
  // Also including Carol's one-time password (as provided by Alice)
  // otherwise we're building a bit of a rainbow table for Carol the more
  // txs she handles, assuming Alice's allow her to re-use her address.
  function Remittance(address _recipient, bytes32 _hash, uint _expiration) public payable {
    require(msg.value > 0);
    require(_recipient != address(0));
    require(_recipient != msg.sender);

    owner = msg.sender;
    recipient = _recipient;
    hash = _hash;
    expiration = _expiration + block.number;

    LogCreated(owner, recipient, msg.value);
  }

  // passwords will be public at this point, but funds can only
  // be released to the intended recipient. Hash is more involved than
  // just keccak256(bobsPw) to avoid nasty Carol's rainbow tabling
  function withdraw(bytes32 pw1, bytes32 pw2) public returns(bool) {
    require(block.number < expiration);
    require(msg.sender == recipient);
    require(getHash(recipient, owner, pw1, pw2) == hash);

    uint balance = address(this).balance;

    recipient.transfer(balance);

    LogWithdraw(recipient, balance);

    return true;
  }

  function getHash(address recipAddr, address ownerAddr, bytes32 pw1, bytes32 pw2)
    public
    pure
    returns (bytes32) {
      return keccak256(recipAddr, ownerAddr, pw1, pw2);
  }

  function invalidate() public onlyOwner returns (bool) {
    require(block.number >= expiration);

    LogInvalidated(owner);

    owner.transfer(address(this).balance);

    return true;
  }

  function() private {

  }
}
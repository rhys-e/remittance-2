pragma solidity ^0.4.19;

import "./Ownable.sol";
import "./Remittance.sol";

contract RemittanceFactory is Ownable {

  address[] public contracts;
  uint private gasFee = 53000; // tx fee + contract create fee
  uint public accumulatedFee = 0;
  bool private active = true;

  event LogNewRemittance(
    address indexed owner,
    address indexed recipient,
    address indexed remittanceAddr,
    uint amount,
    uint expiration);

  event LogPaused(address indexed sender);
  event LogResumed(address indexed sender);
  event LogWithrawFee(address indexed sender, uint fee);

  modifier isActive() {
    require(active == true);
    _;
  }

  modifier isInactive() {
    require(active == false);
    _;
  }

  function RemittanceFactory() public {}

  function newRemittance(address recipient, bytes32 hash, uint expiration)
    public
    payable
    isActive
    returns (address) {
      uint fee = tx.gasprice * gasFee;
      require(msg.value > fee);

      accumulatedFee += fee;
      // should we be passing in the owner rather than using msg.sender?
      Remittance r = (new Remittance).value(msg.value - fee)(msg.sender, recipient, hash, expiration);
      contracts.push(r);

      LogNewRemittance(msg.sender, recipient, r, msg.value, expiration + block.number);
      return r;
  }

  function getHash(address recipAddr, address ownerAddr, bytes32 pw1, bytes32 pw2)
    public
    pure
    returns (bytes32) {
      return keccak256(recipAddr, ownerAddr, pw1, pw2);
  }

  function resume()
    public
    onlyOwner
    isInactive {
      active = true;
      LogResumed(msg.sender);
  }

  function pause()
    public
    onlyOwner
    isActive {
      active = false;
      LogPaused(msg.sender);
  }

  function withdrawFee()
    public
    onlyOwner {
      LogWithrawFee(msg.sender, accumulatedFee);
      accumulatedFee = 0;
      owner.transfer(accumulatedFee);
  }

  function() private {}
}

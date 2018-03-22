pragma solidity ^0.4.19;

import "./Ownable.sol";
import "./Remittance.sol";
import "./PasswordVerifier.sol";

contract RemittanceFactory is Ownable, PasswordVerifier {

  address[] public remittanceContracts;
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
  event LogWithdrawFee(address indexed sender, uint fee);

  modifier isActive() {
    require(active == true);
    _;
  }

  modifier isInactive() {
    require(active == false);
    _;
  }

  function RemittanceFactory()
    public
    Ownable(msg.sender) {}

  function newRemittance(address recipient, bytes32 hash, uint expiration)
    public
    payable
    isActive
    returns (address) {
      uint fee = tx.gasprice * gasFee;
      require(msg.value > fee);

      accumulatedFee += fee;
      // should we be passing in the owner rather than using msg.sender?
      LogNewRemittance(msg.sender, recipient, r, msg.value, expiration + block.number);
      Remittance r = (new Remittance).value(msg.value - fee)(msg.sender, recipient, hash, expiration);
      remittanceContracts.push(r);

      return r;
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
      accumulatedFee = 0;
      LogWithdrawFee(getOwner(), accumulatedFee);
      getOwner().transfer(accumulatedFee);
  }

  function() private {}
}

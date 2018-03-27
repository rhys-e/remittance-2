pragma solidity ^0.4.19;

import "./Remittance.sol";
import "./PasswordVerifier.sol";
import "./Stoppable.sol";

contract RemittanceFactory is Stoppable, PasswordVerifier {

  address[] public remittanceContracts;
  uint private gasFee = 53000; // tx fee + contract create fee
  uint private accumulatedFee = 0;

  event LogCreateRemittance(
    address indexed owner,
    address indexed recipient,
    address indexed remittanceAddr,
    uint amount,
    uint expiration);

  event LogWithdrawFee(address indexed sender, uint fee);

  function remittanceContractCount()
    public
    view
    returns(uint count) {
    return remittanceContracts.length;
  }

  function RemittanceFactory()
    public
    Ownable(msg.sender) {}

  function createRemittance(address recipient, bytes32 hash, uint expiration)
    public
    payable
    isActive
    returns (address) {
      uint fee = tx.gasprice * gasFee;
      require(msg.value > fee);

      accumulatedFee += fee;
      Remittance trustedRemittance = (new Remittance).value(msg.value - fee)(msg.sender, recipient, hash, expiration);
      remittanceContracts.push(trustedRemittance);
      LogCreateRemittance(msg.sender, recipient, trustedRemittance, msg.value, expiration + block.number);

      return trustedRemittance;
  }

  function getFeeAmount()
    view
    public
    returns (uint fee) {
    return accumulatedFee;
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

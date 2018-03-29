pragma solidity ^0.4.19;

import "./Remittance.sol";
import "./PasswordVerifier.sol";
import "./Stoppable.sol";

contract RemittanceFactory is Stoppable, PasswordVerifier {

  mapping(address => bool) private remittanceExists;
  uint private gasFee = 53000; // tx fee + contract create fee
  uint private accumulatedFee = 0;

  event LogCreateRemittance(
    address indexed remittanceAddr,
    address indexed sender,
    address indexed recipient,
    uint amountDeposited,
    uint feeClaimed,
    uint expiration);

  event LogWithdrawFee(address indexed sender, uint fee);
  event LogPauseRemittance(address indexed sender, address remittance);
  event LogResumeRemittance(address indexed sender, address remittance);
  event LogNewRemittanceOwner(address indexed sender, address indexed newOwner, address remittance);

  modifier onlyIfRemittance(address remittance) {
    require(remittanceExists[remittance] == true);
    _;
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
      uint amount = msg.value - fee;
      Remittance trustedRemittance = (new Remittance).value(amount)(msg.sender, recipient, hash, expiration);
      remittanceExists[trustedRemittance] = true;
      // ideally would log this before, but obviously can't log the contract address before it's created
      LogCreateRemittance(trustedRemittance, msg.sender, recipient, amount, fee, (expiration + block.number));

      return trustedRemittance;
  }

  function changeRemittanceOwner(address remittance, address newOwner)
    public
    onlyOwner
    onlyIfRemittance(remittance)
  {
    Remittance trustedRemittance = Remittance(remittance);
    LogNewRemittanceOwner(msg.sender, newOwner, trustedRemittance);
    trustedRemittance.changeOwner(newOwner);
  }

  function resumeRemittance(address remittance)
    public
    onlyOwner
    onlyIfRemittance(remittance)
  {
    Remittance trustedRemittance = Remittance(remittance);
    LogResumeRemittance(msg.sender, trustedRemittance);
    trustedRemittance.resume();
  }

  function pauseRemittance(address remittance)
    public
    onlyOwner
    onlyIfRemittance(remittance)
  {
    Remittance trustedRemittance = Remittance(remittance);
    LogPauseRemittance(msg.sender, trustedRemittance);
    trustedRemittance.pause();
  }

  function getAccumulatedFeeAmount()
    view
    public
    returns (uint fee) {
    return accumulatedFee;
  }

  function withdrawFee()
    public
    onlyOwner {
      uint fee = accumulatedFee;
      accumulatedFee = 0;
      LogWithdrawFee(getOwner(), fee);
      getOwner().transfer(fee);
  }

  function() private {}
}

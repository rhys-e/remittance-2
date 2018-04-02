pragma solidity ^0.4.19;

import "../PasswordVerifier.sol";
import "../Stoppable.sol";

contract Remittance is Stoppable, PasswordVerifier {
  struct Exchange {
    address sender;
    uint amount;
    uint expiryBlockNumber;
  }

  mapping (bytes32 => Exchange) public exchanges;

  uint constant public GAS_FEE = 21000 + 32000; // tx fee + contract create fee
  uint constant public BLOCK_LIMIT = (60 * 60 * 24 * 7) / 15; // roughly a week of blocks

  uint private accumulatedFee = 0;

  event LogWithdrawFee(address indexed sender, uint fee);
  event LogWithdraw(
    address indexed recipient,
    address indexed sender,
    uint amount,
    bytes32 hash);

  event LogRemittanceCreated(
    address indexed sender,
    address indexed recipient,
    uint amount,
    uint fee,
    uint expiresAtBlock);

  event LogInvalidated(
    address indexed sender,
    address indexed recipient,
    uint amount,
    bytes32 hash);

  function Remittance()
    Ownable(msg.sender)
    public {}

  function createRemittance(address recipient, bytes32 hash, uint expiration)
    public
    isActive
    payable
  {
    uint fee = tx.gasprice * GAS_FEE;
    require(msg.value > fee);
    Exchange storage exchange = exchanges[hash];
    require(exchange.sender == address(0));
    require(msg.sender != address(0));
    require(recipient != address(0));
    require(recipient != msg.sender);
    require(expiration > 0);
    require(expiration < BLOCK_LIMIT);

    accumulatedFee += fee;
    uint amount = msg.value - fee;
    uint expiresAtBlock = block.number + expiration;

    exchange.sender = msg.sender;
    exchange.amount = amount;
    exchange.expiryBlockNumber = expiresAtBlock;

    LogRemittanceCreated(msg.sender, recipient, amount, fee, expiresAtBlock);
  }

  function withdraw(address sender, bytes32 pw1, bytes32 pw2)
    public
    isActive
    returns(bool)
  {
    bytes32 hash = getHash(msg.sender, sender, pw1, pw2);
    Exchange storage exchange = exchanges[hash];
    uint amount = exchange.amount;

    require(amount > 0);
    require(block.number < exchange.expiryBlockNumber);

    exchange.amount = 0;

    LogWithdraw(msg.sender, sender, amount, hash);
    msg.sender.transfer(amount);

    return true;
  }

  function invalidate(address recipient, bytes32 pw1, bytes32 pw2)
    public
    isActive
    returns (bool)
  {
    bytes32 hash = getHash(recipient, msg.sender, pw1, pw2);
    Exchange storage exchange = exchanges[hash];
    uint amount = exchange.amount;

    require(amount > 0);
    require(block.number >= exchange.expiryBlockNumber);

    exchange.amount = 0;

    LogInvalidated(exchange.sender, recipient, amount, hash);
    msg.sender.transfer(exchange.amount);

    return true;
  }

  // might want to let owner withdraw fee when contract is stopped so leaving
  // off isActive modifier
  function withdrawFee()
    public
    onlyOwner
    returns (bool)
  {
    uint fee = accumulatedFee;
    accumulatedFee = 0;
    LogWithdrawFee(getOwner(), fee);
    getOwner().transfer(fee);

    return true;
  }

  function() private {}
}
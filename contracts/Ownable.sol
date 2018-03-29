pragma solidity ^0.4.19;

contract Ownable {

  address private owner;
  event LogNewOwner(address indexed newOwner, address indexed oldOwner);

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  function Ownable(address _owner) public {
    require(_owner != address(0));
    owner = _owner;
  }

  function getOwner()
    view
    public
    returns(address)
  {
    return owner;
  }

  function changeOwner(address newOwner)
    public
    onlyOwner
  {
    require(newOwner != address(0));

    LogNewOwner(newOwner, owner);
    owner = newOwner;
  }
}
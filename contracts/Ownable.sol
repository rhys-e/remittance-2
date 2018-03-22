pragma solidity ^0.4.19;

contract Ownable {

  address private owner;

  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  function Ownable(address _owner) public {
    require(_owner != address(0));
    owner = _owner;
  }

  function getOwner() view public returns(address) {
    return owner;
  }
}
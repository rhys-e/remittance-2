pragma solidity ^0.4.19;

import "./Ownable.sol";

contract Stoppable is Ownable {
  bool private active = true;

  event LogActiveState(bool state);

  modifier isActive() {
    require(active == true);
    _;
  }

  modifier isInactive() {
    require(active == false);
    _;
  }

  function resume()
    public
    onlyOwner
    isInactive {
      active = true;
      LogActiveState(active);
  }

  function pause()
    public
    onlyOwner
    isActive {
      active = false;
      LogActiveState(active);
  }

  function() private {}
}
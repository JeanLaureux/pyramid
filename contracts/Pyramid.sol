//SPDX-License-Identifier: Unlicense
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

struct PyramidHistoryItem {
  uint takePrice;
  address taker;
}

contract Pyramid is ERC721 {
  PyramidHistoryItem[] public history;
  bool public hasUnlocked;
  address payable private creator;
  uint unlockTimestampMs;

  constructor(uint takePrice) ERC721("Pyramid", "PYRMD") payable {
    require(takePrice <= msg.value);
    creator = payable(msg.sender);
    history.push(PyramidHistoryItem({
      takePrice: takePrice,
      taker: msg.sender
    }));

    hasUnlocked = false;
    unlockTimestampMs = block.timestamp + 100 days;
    _mint(msg.sender, 0);
  }

  function getContractBalance() public view returns(uint b) {
    return address(this).balance;
  }

  function getHistoryLength() public view returns(uint l) {
    return history.length;
  }

  function getNextTakePrice() public view returns(uint v) {
    return (history[history.length - 1].takePrice * 110) / 100;
  }

  function getPyramidOwner() public view returns(address o) {
    return ownerOf(0);
  }

  function take() public payable {
    require(!hasUnlocked, "The Pyramid has already been unlocked.");
    require(msg.value > getNextTakePrice(), "Insufficient takePrice");
    history.push(PyramidHistoryItem({
      takePrice: msg.value,
      taker: msg.sender
    }));
    _safeTransfer(ownerOf(0), msg.sender, 0, '');
  }

  function unlock() public {
    require(msg.sender == ownerOf(0), "Only the Pyramid's owner can unlock it.");
    require(!hasUnlocked, "The Pyramid has already been unlocked.");
    require(unlockTimestampMs <= block.timestamp, "The Pyramid cannot be unlocked yet.");

    hasUnlocked = true;
    address payable pyramidOwner = payable(ownerOf(0));
    creator.transfer((address(this).balance * 1) / 100);
    pyramidOwner.transfer(address(this).balance);
  }
}

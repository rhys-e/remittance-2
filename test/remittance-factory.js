const Promise = require("bluebird");
const { wait, waitUntilBlock } = require("@digix/tempo")(web3);
const BigNumber = require("bignumber.js");
const getBalance = Promise.promisify(web3.eth.getBalance);
const RemittanceFactory = artifacts.require("./remittance-hub/RemittanceFactory.sol");
const Remittance = artifacts.require("./remittance-hub/Remittance.sol");

//todo: events
contract("RemittanceFactory", (accounts) => {
  const owner = accounts[0];
  const sender = accounts[1];
  const recipient = accounts[2];

  const pwd1 = "abc";
  const pwd2 = "xyz";
  const gasPrice = new BigNumber("100000000000");

  let remittanceFactory;
  let standardHash;
  let allEvents;

  beforeEach(() => {
    return RemittanceFactory.new({ from: owner })
      .then((instance) => {
        remittanceFactory = instance;
      })
      .then(() => remittanceFactory.getHash(sender, recipient, pwd1, pwd2))
      .then((hash) => {
        standardHash = hash;
      })
      .then(() => {
        allEvents = Promise.promisify(remittanceFactory.allEvents().watch, {
          context: remittanceFactory.allEvents()
        });
      })
  });

  function getRemittanceAddress() {
    return allEvents()
      .then((event) => {
        assert.include(event.event, "LogCreateRemittance", "didn't receive necessary created event");
        return event.args.remittanceAddr;
      });
  }

  describe("should initialise", () => {
    it("should initialise with msg.sender as owner", () => {
      return remittanceFactory.getOwner()
        .then((_owner) => {
          assert(owner == owner);
        });
    });

    it("should fail to initialise if eth is sent to constructor", () => {
      return RemittanceFactory.new({ from: owner, value: 1 })
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "non-payable", "should revert when eth sent to constructor");
        });
    });
  });

  describe("should create remittance contracts", () => {
    it("should reject contracts with amounts less than the fee", () => {
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: 100 })
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert when supplied value is less than required fee");
        });
    });

    it("should create a remittance contract", () => {
      let fee;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then((tx) => remittanceFactory.getAccumulatedFeeAmount())
        .then((_fee) => {
          fee = _fee;
        })
        .then(() => getRemittanceAddress())
        .then((remittanceAddr) => getBalance(remittanceAddr))
        .then((remittanceValue) => {
          assert(remittanceValue.add(fee).eq(new BigNumber(web3.toWei(1, "ether"))));
        })
    });
  });

  describe("should allow/disallow created remittance contracts owner to be changed", () => {

    it("should allow the remittance contract to be changed by the factory owner", () => {
      let remittanceAddr;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.changeRemittanceOwner(remittanceAddr, accounts[3], { from: owner }))
        .then(() => Remittance.at(remittanceAddr).getOwner())
        .then((owner) => {
          assert(owner == accounts[3]);
        });
    });

    it("should reject remittance contract owner change for a bad remittance address", () => {
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => remittanceFactory.changeRemittanceOwner(0x0, accounts[3], { from: owner }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert on bad remittance address");
        });
    });

    it("should reject remittance contract owner change not from owner", () => {
      let remittanceAddr;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.changeRemittanceOwner(remittanceAddr, accounts[3], { from: accounts[3] }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert on bad owner address");
        });
    });
  });

  describe("should allow/disallow created remittance contracts to be paused", () => {
    it("should pause a remittance contract", () => {
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.pauseRemittance(remittanceAddr, { from: owner }))
        .then(() => Remittance.at(remittanceAddr).isRunning())
        .then((isActive) => {
          assert(isActive == false);
        });
    });

    it("should reject remittance contract pause for a bad remittance address", () => {
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => remittanceFactory.pauseRemittance(0x0, { from: owner }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert on bad remittance address");
        });
    });

    it("should reject remittance contract pause not from owner", () => {
      let remittanceAddr;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.pauseRemittance(remittanceAddr, { from: accounts[3] }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert on bad owner address");
        });
    });
  });

  describe("should allow/disallow created remittance contracts to be resumed", () => {
    it("should pause a remittance contract", () => {
      let remittanceAddr;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.pauseRemittance(remittanceAddr, { from: owner }))
        .then(() => remittanceFactory.resumeRemittance(remittanceAddr, { from: owner }))
        .then(() => Remittance.at(remittanceAddr).isRunning())
        .then((isActive) => {
          assert(isActive == true);
        });
    });

    it("should reject remittance contract pause for a bad remittance address", () => {
      let remittanceAddr;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.pauseRemittance(remittanceAddr, { from: owner }))
        .then(() => Remittance.at(remittanceAddr).isRunning())
        .then((active) => assert(active == false))
        .then(() => remittanceFactory.resumeRemittance(0x0, { from: owner }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert on bad remittance address");
        });
    });

    it("should reject remittance contract pause not from owner", () => {
      let remittanceAddr;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getRemittanceAddress())
        .then((_remittanceAddr) => {
          remittanceAddr = _remittanceAddr;
        })
        .then(() => remittanceFactory.pauseRemittance(remittanceAddr, { from: owner }))
        .then(() => Remittance.at(remittanceAddr).isRunning())
        .then((active) => assert(active == false))
        .then(() => remittanceFactory.resumeRemittance(remittanceAddr, { from: accounts[3] }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should revert on bad owner address");
        });
    });
  });

  describe("should allow/disallow fees to be withdrawn", () => {
    it("should allow fees to be withdrawn", () => {
      let initBalance;
      let feeReward;
      let gasUsed;
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => getBalance(owner))
        .then((balance) => {
          initBalance = balance;
        })
        .then(() => remittanceFactory.getAccumulatedFeeAmount())
        .then((_fee) => {
          feeReward = _fee;
        })
        .then(() => remittanceFactory.withdrawFee({ from: owner }))
        .then((tx) => {
          gasUsed = new BigNumber(tx.receipt.gasUsed).times(gasPrice);
        })
        .then(() => getBalance(owner))
        .then((balance) => {
          assert(balance.eq(initBalance.minus(gasUsed).add(feeReward)));
        })
        .then(() => remittanceFactory.getAccumulatedFeeAmount())
        .then((fee) => {
          assert(fee.eq(0));
        });
    });

    it("should reject fee withdrawal not from owner", () => {
      return remittanceFactory.createRemittance(recipient, standardHash, 10, { from: sender, value: web3.toWei(1, "ether") })
        .then(() => remittanceFactory.withdrawFee({ from: sender }))
        .then(assert.fail)
        .catch((err) => {
          assert.include(err.message, "revert", "should reject withdrawals not from owner");
        });
    });
  });
});
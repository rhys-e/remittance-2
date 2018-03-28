const Promise = require("bluebird");
const { wait, waitUntilBlock } = require("@digix/tempo")(web3);
const BigNumber = require("big-number");
const getBalance = Promise.promisify(web3.eth.getBalance);
const RemittanceFactory = artifacts.require("./RemittanceFactory.sol");

contract("RemittanceFactory", (accounts) => {
  const owner = accounts[0];
  const sender = accounts[1];
  const recipient = accounts[2];

  const pwd1 = "abc";
  const pwd2 = "xyz";

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
        .then(() => allEvents())
        .then((event) => {
          assert.include(event.event, "LogCreateRemittance", "didn't receive necessary created event");
          return event.args.remittanceAddr;
        })
        .then((remittanceAddr) => getBalance(remittanceAddr))
        .then((remittanceValue) => {
          assert(remittanceValue.add(fee).eq(new BigNumber(web3.toWei(1, "ether"))));
        })
    });
  });
});
const Promise = require("bluebird");
const { wait, waitUntilBlock } = require("@digix/tempo")(web3);
const BigNumber = require("big-number");
const getBalance = Promise.promisify(web3.eth.getBalance);
const RemittanceFactory = artifacts.require("./RemittanceFactory.sol");

contract("RemittanceFactory", (accounts) => {
  const owner = accounts[0];

  let remittanceFactory;

  beforeEach(() => {
    return RemittanceFactory.new({ from: owner })
      .then((instance) => {
        remittanceFactory = instance;
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
    //it("should ")
  });
});
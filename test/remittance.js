const Promise = require("bluebird");
const { wait, waitUntilBlock } = require("@digix/tempo")(web3);
const BigNumber = require("bignumber.js");
const getBalance = Promise.promisify(web3.eth.getBalance);
const Remittance = artifacts.require("./Remittance.sol");
const PasswordVerifier = artifacts.require("./PasswordVerifier.sol");

contract("Remittance", (accounts) => {

  const deployer = accounts[0];
  const sender = accounts[1];
  const recipient = accounts[2];
  const pwd1 = "abc";
  const pwd2 = "xyz";
  const gasPrice = new BigNumber("100000000000");

  let standardHash;
  let passwordVerifier;
  let blockLimit;

  before(() => {
    const p1 = PasswordVerifier.new({ from: sender })
      .then((instance) => {
        passwordVerifier = instance;
        passwordVerifier.getHash(recipient, sender, pwd1, pwd2)
          .then((_standardHash) => {
            standardHash = _standardHash;
          });
      });

    const p2 = Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 1 })
      .then((instance) => instance.getBlockLimit())
      .then((limit) => {
        blockLimit = limit.toNumber();
        assert(typeof blockLimit == "number");
      });

    return Promise.all([p1, p2]);
  });

  describe("should reject instantiation with bad construction data", () => {

    it("should reject a contract instantiation with 0 value", () => {
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 0 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert on 0 balance transfer");
        });
    });

    it("should reject a contract instantiation with a 0 sender address", () => {
      return Remittance.new(0, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert on 0 sender address");
        });
    });

    it("should reject a contract instantiation with a 0 recipient address", () => {
      return Remittance.new(sender, 0, standardHash, 10, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert on 0 recipient address");
        });
    });

    it("should reject a contract where sender == recipient", () => {
      return Remittance.new(sender, sender, standardHash, 10, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when sender == recipient");
        });
    });

    it("should reject a contract where expiration <= 0", () => {
      return Remittance.new(sender, recipient, standardHash, 0, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert where expiration <= 0");
        });
    });

    it("should reject a contract where expiration > block limit", () => {
      return Remittance.new(sender, recipient, standardHash, web3.eth.blockNumber + blockLimit + 1, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert where expiration > block limit");
        });
    });
  });

  describe("should allow instantiation", () => {
    it("should intantiate with good parameters", () => {
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .catch(err => {
          console.error(err);
          assert.fail(err);
        });
    });
  });

  describe("should fire events", () => {
    it("should fire an event on a successful instantiation", () => {
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((instance) => {
          return Promise.promisify(instance.allEvents().watch, { context: instance.allEvents() })();
        })
        .then((event) => {
          assert.include(event.event, "LogCreated", "didn't receive necessary created event");
        });
    });

    it("should fire an event on a successful withdrawal", () => {
      let instance;
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => instance.withdraw(pwd1, pwd2, { from: recipient }))
        .then(() => {
          return Promise.promisify(instance.allEvents().watch, { context: instance.allEvents() })();
        })
        .then((event) => {
          assert.include(event.event, "LogWithdraw", "didn't receive necessary withdraw event");
        });
    });

    it("should fire an event on a successful invalidate", () => {
      let instance;
      const blockNumber = web3.eth.blockNumber;
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => waitUntilBlock(1, blockNumber + 10))
        .then(() => instance.invalidate({ from: sender }))
        .then(() => {
          return Promise.promisify(instance.allEvents().watch, { context: instance.allEvents() })();
        })
        .then((event) => {
          assert.include(event.event, "LogInvalidate", "didn't receive necessary invalidate event");
        });
    });
  });

  describe("should reject withdrawal", () => {
    it("should reject withdrawal if message sender is not the intended recipient", () => {
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((instance) => instance.withdraw(pwd1, pwd2, { from: sender }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when msg.sender != recipient");
        });
    });

    it("should reject withdrawal if block.number >= expiration", () => {
      let instance;
      const blockNumber = web3.eth.blockNumber;
      return Remittance.new(sender, recipient, standardHash, 1, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => waitUntilBlock(1, blockNumber + 10))
        .then(() => instance.withdraw(pwd1, pwd2, { from: recipient }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when block.number >= expiration");
        });
    });

    it("should reject withdrawal if hash is incorrect", () => {
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((instance) => instance.withdraw(pwd2, pwd1, { from: sender }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when hash is incorrect");
        });
    });
  });

  describe("should allow withdrawal", () => {
    it("should allow withdrawal to the intended recipient", () => {
      let initBalance;
      let instance;
      let gasUsed;
      return Remittance.new(sender, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => getBalance(recipient))
        .then((balance) => {
          initBalance = balance;
        })
        .then(() => instance.withdraw(pwd1, pwd2, { from: recipient }))
        .then((tx) => {
          gasUsed = new BigNumber(tx.receipt.gasUsed).times(gasPrice);
        })
        .then(() => getBalance(recipient))
        .then((balance) => {
          assert(balance.eq(initBalance.minus(gasUsed).add(10)));
        });
    });
  });

  describe("should reject invalidate", () => {
    it("should reject an invalidate not from the sender", () => {
      let instance;
      const blockNumber = web3.eth.blockNumber;
      return Remittance.new(sender, recipient, standardHash, 1, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => waitUntilBlock(1, blockNumber + 5))
        .then(() => instance.invalidate({ from: recipient }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when invalidate not from sender");
        });
    });

    it("should reject an invalidate when not past block expiry", () => {
      return Remittance.new(sender, recipient, standardHash, 2, { from: deployer, value: 10 })
        .then((instance) => instance.invalidate({ from: sender }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when invalidate called before block expiry");
        });
    });
  });

  describe("should invalidate", () => {
    it("should invalidate when block expiry has been met and when called by sender", () => {
      let instance;
      let initBalance;
      let gasUsed;
      const blockNumber = web3.eth.blockNumber;
      return Remittance.new(sender, recipient, standardHash, 2, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => getBalance(sender))
        .then((balance) => {
          initBalance = balance;
        })
        .then(() => waitUntilBlock(1, blockNumber + 5))
        .then(() => instance.invalidate({ from: sender }))
        .then((tx) => {
          gasUsed = new BigNumber(tx.receipt.gasUsed).times(gasPrice);
        })
        .then(() => getBalance(sender))
        .then((balance) => {
          assert(balance.eq(initBalance.minus(gasUsed).add(10)));
        });
    });
  });
});
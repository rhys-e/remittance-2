const Promise = require("bluebird");
const { wait, waitUntilBlock } = require("@digix/tempo")(web3);
const getBalance = Promise.promisify(web3.eth.getBalance);
const Remittance = artifacts.require("./Remittance.sol");
const PasswordVerifier = artifacts.require("./PasswordVerifier.sol");

contract("Remittance", (accounts) => {

  const deployer = accounts[0];
  const owner = accounts[1];
  const recipient = accounts[2];
  const pwd1 = "abc";
  const pwd2 = "xyz";
  const gasPrice = 100000000000;

  let standardHash;
  let passwordVerifier;
  let blockLimit;

  before(() => {
    var p1 = PasswordVerifier.new({ from: owner })
      .then((instance) => {
        passwordVerifier = instance;
        passwordVerifier.getHash(recipient, owner, pwd1, pwd2)
          .then((_standardHash) => {
            standardHash = _standardHash;
          });
      });

    var p2 = Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 1 })
      .then((instance) => instance.blockLimit())
      .then((limit) => {
        blockLimit = limit.toNumber();
        assert(typeof blockLimit == "number");
      });

    return Promise.all([p1, p2]);
  });

  describe("should reject instantiation with bad construction data", () => {

    it("should reject a contract instantiation with 0 value", () => {
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 0 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert on 0 balance transfer");
        });
    });

    it("should reject a contract instantiation with a 0 owner address", () => {
      return Remittance.new(0, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert on 0 owner address");
        });
    });

    it("should reject a contract instantiation with a 0 recipient address", () => {
      return Remittance.new(owner, 0, standardHash, 10, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert on 0 recipient address");
        });
    });

    it("should reject a contract where owner == recipient", () => {
      return Remittance.new(owner, owner, standardHash, 10, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when owner == recipient");
        });
    });

    it("should reject a contract where expiration <= 0", () => {
      return Remittance.new(owner, recipient, standardHash, 0, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert where expiration <= 0");
        });
    });

    it("should reject a contract where expiration > block limit", () => {
      return Remittance.new(owner, recipient, standardHash, web3.eth.blockNumber + blockLimit + 1, { from: deployer, value: 10 })
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert where expiration > block limit");
        });
    });
  });

  describe("should allow instantiation", () => {
    it("should intantiate with good parameters", () => {
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 10 })
        .catch(err => {
          console.error(err);
          assert.fail(err);
        });
    });
  });

  describe("should fire events", () => {
    it("should fire an event on a successful instantiation", () => {
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((instance) => {
          return Promise.promisify(instance.allEvents().watch, { context: instance.allEvents() })();
        })
        .then((event) => {
          assert.include(event.event, "LogCreated", "didn't receive necessary created event");
        });
    });

    it("should fire an event on a successful withdrawal", () => {
      let instance;
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 10 })
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
  });

  describe("should reject withdrawal", () => {
    it("should reject withdrawal if message sender is not the intended recipient", () => {
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((instance) => instance.withdraw(pwd1, pwd2, { from: owner }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when msg.sender != recipient");
        });
    });

    it("should reject withdrawal if block.number >= expiration", () => {
      let instance;
      return Remittance.new(owner, recipient, standardHash, 1, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => waitUntilBlock(1, web3.eth.blockNumber + 10))
        .then(() => instance.withdraw(pwd1, pwd2, { from: recipient }))
        .then(assert.fail)
        .catch(err => {
          assert.include(err.message, "revert", "should revert when block.number >= expiration");
        });
    });

    it("should reject withdrawal if hash is incorrect", () => {
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((instance) => instance.withdraw(pwd2, pwd1, { from: owner }))
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
      return Remittance.new(owner, recipient, standardHash, 10, { from: deployer, value: 10 })
        .then((_instance) => {
          instance = _instance;
        })
        .then(() => getBalance(recipient))
        .then((balance) => {
          initBalance = balance;
        })
        .then(() => instance.withdraw(pwd1, pwd2, { from: recipient }))
        .then((tx) => {
          gasUsed = tx.receipt.gasUsed * gasPrice;
        })
        .then(() => getBalance(recipient))
        .then((balance) => {
          assert(balance.eq(initBalance.minus(gasUsed).add(10)));
        });
    });
  });
});
const Promise = require("bluebird");
const Remittance = artifacts.require("./Remittance.sol");
const PasswordVerifier = artifacts.require("./PasswordVerifier.sol");

contract("Remittance", (accounts) => {

  const deployer = accounts[0];
  const owner = accounts[1];
  const recipient = accounts[2];

  let standardHash;
  let passwordVerifier;
  let blockLimit;

  before(() => {
    var p1 = PasswordVerifier.new({ from: owner })
      .then((instance) => {
        passwordVerifier = instance;
        passwordVerifier.getHash(recipient, owner, "abc", "xyz")
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
});
const Promise = require("bluebird");
const Remittance = artifacts.require("./Remittance.sol");

contract("Remittance", (accounts) => {

  let remittance;
  beforeEach(() => {
    return Remittance.new({ from: accounts[0] }).then(instance => {
      remittance = instance;
    });
  });
});
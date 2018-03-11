var RemittanceFactory = artifacts.require("./RemittanceFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(RemittanceFactory);
}

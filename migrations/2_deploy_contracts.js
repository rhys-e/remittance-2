var RemittanceFactory = artifacts.require("./remittance-hub/RemittanceFactory.sol");

module.exports = function(deployer) {
  deployer.deploy(RemittanceFactory);
}

var RemittanceFactory = artifacts.require("./RemittanceFactory.sol");
var HashLib = artifacts.require("./HashLib.sol");

module.exports = function(deployer) {
  deployer.deploy(HashLib);
  deployer.link(HashLib, RemittanceFactory);
  deployer.deploy(RemittanceFactory);
}

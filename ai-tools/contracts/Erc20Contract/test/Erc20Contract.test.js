const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Erc20Contract", function () {
  let contract;
  let owner;
  let addr1;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const ContractFactory = await ethers.getContractFactory("Erc20Contract");
    contract = await ContractFactory.deploy("Test Token", "TEST", 1000000);
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      expect(await contract.getAddress()).to.be.properAddress;
    });
  });
});
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Simple', function () {
    let contract;
    let owner;
    let addr1;
    let addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const SimpleFactory = await ethers.getContractFactory('Simple');
        contract = await SimpleFactory.deploy(/* Add constructor args here if needed */);
        await contract.waitForDeployment();
    });
    
    it('Should deploy successfully', async function () {
        expect(await contract.getAddress()).to.be.properAddress;
    });
});

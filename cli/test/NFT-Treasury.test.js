const { expect } = require('chai');
const { ethers } = require('ethers');

describe('NFT-Treasury', function () {
    let contract;
    let owner;
    let addr1;
    let addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const NFT-Treasury = await ethers.getContractFactory('NFT-Treasury');
        contract = await NFT-Treasury.deploy(/* constructor args */);
        await contract.deployed();
    });
    
    it('Should deploy successfully', async function () {
        expect(contract.address).to.be.properAddress;
    });
    
    // Add more tests here
});

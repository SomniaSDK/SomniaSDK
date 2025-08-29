// Deployment script for NFT-Treasury
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying NFT-Treasury...');
    
    // Deploy contract
    const NFT-Treasury = await ethers.getContractFactory('NFT-Treasury');
    const contract = await NFT-Treasury.deploy(/* constructor args */);
    
    await contract.deployed();
    
    console.log('NFT-Treasury deployed to:', contract.address);
    console.log('Transaction hash:', contract.deployTransaction.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

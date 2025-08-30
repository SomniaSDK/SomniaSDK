// Deployment script for NFTTreasury
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying NFTTreasury...');
    
    // Deploy contract
    const NFTTreasury = await ethers.getContractFactory('NFTTreasury');
    const contract = await NFTTreasury.deploy(/* constructor args */);
    
    await contract.deployed();
    
    console.log('NFTTreasury deployed to:', contract.address);
    console.log('Transaction hash:', contract.deployTransaction.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

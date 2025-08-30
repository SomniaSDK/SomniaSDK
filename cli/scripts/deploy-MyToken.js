// Deployment script for MyToken
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying MyToken...');
    
    // Deploy contract
    const MyToken = await ethers.getContractFactory('MyToken');
    const contract = await MyToken.deploy(/* constructor args */);
    
    await contract.deployed();
    
    console.log('MyToken deployed to:', contract.address);
    console.log('Transaction hash:', contract.deployTransaction.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

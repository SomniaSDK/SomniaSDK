// Deployment script for MyNewToken
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying MyNewToken...');
    
    // Deploy contract
    const MyNewToken = await ethers.getContractFactory('MyNewToken');
    const contract = await MyNewToken.deploy(/* constructor args */);
    
    await contract.deployed();
    
    console.log('MyNewToken deployed to:', contract.address);
    console.log('Transaction hash:', contract.deployTransaction.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

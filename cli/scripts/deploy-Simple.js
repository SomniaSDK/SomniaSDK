// Deployment script for Simple
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying Simple...');
    
    // Get contract factory
    const SimpleFactory = await ethers.getContractFactory('Simple');
    
    // Deploy contract (adjust constructor parameters as needed)
    const contract = await SimpleFactory.deploy(/* Add constructor args here if needed */);
    
    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log('Simple deployed to:', contractAddress);
    console.log('Transaction hash:', contract.deploymentTransaction()?.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

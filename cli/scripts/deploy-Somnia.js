// Deployment script for Somnia
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying Somnia...');
    
    // Deploy contract
    const Somnia = await ethers.getContractFactory('Somnia');
    const contract = await Somnia.deploy(/* constructor args */);
    
    await contract.deployed();
    
    console.log('Somnia deployed to:', contract.address);
    console.log('Transaction hash:', contract.deployTransaction.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

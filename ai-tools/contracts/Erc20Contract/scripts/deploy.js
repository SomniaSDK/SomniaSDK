const hre = require("hardhat");

async function main() {
  console.log("Deploying Erc20Contract...");

  const ContractFactory = await hre.ethers.getContractFactory("Erc20Contract");
  const contract = await ContractFactory.deploy("My Token", "MTK", 1000000);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("Erc20Contract deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
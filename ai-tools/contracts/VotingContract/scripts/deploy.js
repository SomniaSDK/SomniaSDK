const hre = require("hardhat");

async function main() {
  console.log("Deploying VotingContract...");

  const ContractFactory = await hre.ethers.getContractFactory("VotingContract");
  const contract = await ContractFactory.deploy("My Token", "MTK", 1000000);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("VotingContract deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
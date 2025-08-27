require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    somnia: {
      url: "https://rpc.somnia.network",
      accounts: []
    }
  }
};
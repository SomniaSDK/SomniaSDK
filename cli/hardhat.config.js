require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    somnia_testnet: {
      url: "https://dream-rpc.somnia.network",
      chainId: 50312,
      accounts: []
    },
    somnia_mainnet: {
      url: "https://rpc.somnia.network", 
      chainId: 50311,
      accounts: []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

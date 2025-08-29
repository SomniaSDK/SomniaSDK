import { 
  createTestnetSDK, 
  createMainnetSDK,
  SomniaSDK,
  SomniaNetwork,
  WalletFactory,
  NumberUtils,
  AddressUtils 
} from '../src/index';

/**
 * Basic SDK usage examples
 */
async function basicSDKUsage() {
  console.log('=== Somnia SDK Basic Usage Examples ===\n');

  // 1. Create SDK instance for testnet
  console.log('1. Creating testnet SDK...');
  const testnetSDK = createTestnetSDK();
  
  const networkConfig = testnetSDK.getNetworkConfig();
  console.log(`Connected to: ${networkConfig.name} (${networkConfig.chainId})`);
  console.log(`RPC URL: ${networkConfig.rpcUrl}\n`);

  // 2. Create and connect a wallet
  console.log('2. Creating a random wallet...');
  const wallet = testnetSDK.createWallet();
  console.log(`Wallet address: ${wallet.getAddress()}`);
  console.log(`Wallet address (short): ${AddressUtils.toShort(wallet.getAddress())}\n`);

  // 3. Check wallet balance
  console.log('3. Checking wallet balance...');
  try {
    const balance = await testnetSDK.getBalance();
    console.log(`Balance: ${NumberUtils.formatEther(balance)} STT\n`);
  } catch (error) {
    console.log(`Balance check failed: ${(error as Error).message}\n`);
  }

  // 4. Get network information
  console.log('4. Getting network information...');
  try {
    const blockNumber = await testnetSDK.getBlockNumber();
    const gasPrice = await testnetSDK.getGasPrice();
    
    console.log(`Current block: ${blockNumber}`);
    console.log(`Gas price: ${NumberUtils.formatGwei(gasPrice)} gwei\n`);
  } catch (error) {
    console.log(`Network info failed: ${(error as Error).message}\n`);
  }

  // 5. Contract interaction example (placeholder)
  console.log('5. Contract interaction example...');
  const contractAddress = '0x742d35Cc6634C0532925a3b8D95a2e1dfe3F3ad1'; // Example address
  
  if (AddressUtils.isValidAddress(contractAddress)) {
    console.log(`Valid contract address: ${contractAddress}`);
    
    const isContract = await testnetSDK.isContract(contractAddress);
    console.log(`Is contract: ${isContract}\n`);
  }
}

/**
 * Advanced SDK usage examples
 */
async function advancedSDKUsage() {
  console.log('=== Advanced SDK Usage ===\n');

  // 1. Create SDK with custom configuration
  console.log('1. Creating SDK with custom configuration...');
  const customSDK = new SomniaSDK({
    network: SomniaNetwork.TESTNET,
    debug: true,
    timeout: 60000,
    retries: 5
  });

  // 2. Import wallet from private key (example - don't use in production)
  console.log('2. Importing wallet from private key...');
  const examplePrivateKey = '0x' + '1'.repeat(64); // Example key - not real
  
  try {
    const importedWallet = WalletFactory.fromPrivateKey(examplePrivateKey);
    console.log(`Imported wallet address: ${importedWallet.getAddress()}\n`);
  } catch (error) {
    console.log(`Wallet import failed: ${(error as Error).message}\n`);
  }

  // 3. Contract deployment simulation
  console.log('3. Contract deployment simulation example...');
  
  // Example contract bytecode and ABI (SimpleStorage contract)
  const exampleBytecode = '0x608060405234801561001057600080fd5b50600080819055506101f3806100266000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80636057361d1461003b578063a444f5e914610057575b600080fd5b61005560048036038101906100509190610125565b610075565b005b61005f61007f565b60405161006c9190610161565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b6100a08161008d565b81146100ab57600080fd5b50565b6000813590506100bd81610097565b92915050565b6000602082840312156100d9576100d8610088565b5b60006100e7848285016100ae565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061013757607f821691505b60208210810361014a576101496100f0565b5b50919050565b61015b8161008d565b82525050565b60006020820190506101766000830184610152565b9291505056fea26469706673582212203a2e4f5e6a5d4e1c9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9e8d7c6b5a49564736f6c63430008110033';
  const exampleABI = [
    {
      "inputs": [],
      "name": "get",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "_value", "type": "uint256" }],
      "name": "set",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  if (customSDK.wallet) {
    try {
      const simulation = await customSDK.simulateDeployment(
        exampleBytecode,
        exampleABI,
        [], // No constructor arguments
        { gasLimit: 1000000 }
      );
      
      console.log('Deployment simulation result:');
      console.log(`Success: ${simulation.success}`);
      console.log(`Gas used: ${simulation.gasUsed}`);
      if (simulation.contractAddress) {
        console.log(`Predicted address: ${simulation.contractAddress}`);
      }
      if (simulation.error) {
        console.log(`Error: ${simulation.error}`);
      }
    } catch (error) {
      console.log(`Simulation failed: ${(error as Error).message}`);
    }
  } else {
    console.log('No wallet connected - skipping deployment simulation');
  }

  console.log('\n=== SDK Examples Complete ===');
}

/**
 * Run all examples
 */
async function runExamples() {
  try {
    await basicSDKUsage();
    await advancedSDKUsage();
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export for testing
export { basicSDKUsage, advancedSDKUsage, runExamples };

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}

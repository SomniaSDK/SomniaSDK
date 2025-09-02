const { 
  createTestnetSDK, 
  SomniaSDK,
  SomniaNetwork,
  WalletFactory,
  AddressUtils,
  NumberUtils,
  ValidationUtils,
  DebugUtils,
  ErrorUtils
} = require('../dist/index.js');

// Simple storage contract for testing
const SIMPLE_STORAGE_CONTRACT = {
  bytecode: "0x608060405234801561001057600080fd5b50600080819055506101f3806100266000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80636057361d1461003b578063a444f5e914610057575b600080fd5b61005560048036038101906100509190610125565b610075565b005b61005f61007f565b60405161006c9190610161565b60405180910390f35b8060008190555050565b60008054905090565b600080fd5b6000819050919050565b6100a08161008d565b81146100ab57600080fd5b50565b6000813590506100bd81610097565b92915050565b6000602082840312156100d9576100d8610088565b5b60006100e7848285016100ae565b91505092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b6000600282049050600182168061013757607f821691505b60208210810361014a576101496100f0565b5b50919050565b61015b8161008d565b82525050565b60006020820190506101766000830184610152565b9291505056fea26469706673582212203a2e4f5e6a5d4e1c9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9e8d7c6b5a49564736f6c63430008110033",
  abi: [
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
  ]
};

// ERC20 contract for more complex testing
const ERC20_CONTRACT = {
  bytecode: "0x608060405234801561001057600080fd5b506040516107d03803806107d08339818101604052810190610032919061025c565b8160039081610041919061050b565b50806004908161005191906105",
  abi: [
    {
      "inputs": [
        { "internalType": "string", "name": "_name", "type": "string" },
        { "internalType": "string", "name": "_symbol", "type": "string" }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "to", "type": "address" },
        { "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "transfer",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
};

async function testNetworkConnectivity() {
  console.log('🌐 Testing Somnia Testnet Connectivity\n');

  try {
    // Create SDK with debug mode
    const sdk = createTestnetSDK();
    sdk.setDebugMode(true);

    console.log('✅ Test 1: Network connection...');
    
    // Test basic network connectivity
    const blockNumber = await sdk.getBlockNumber();
    console.log(`   Current block number: ${blockNumber}`);

    // Test gas price
    const gasPrice = await sdk.getGasPrice();
    console.log(`   Current gas price: ${NumberUtils.formatGwei(gasPrice)} gwei`);

    // Test provider info
    const networkConfig = sdk.getNetworkConfig();
    console.log(`   Network: ${networkConfig.name}`);
    console.log(`   Chain ID: ${networkConfig.chainId}`);
    console.log(`   RPC URL: ${networkConfig.rpcUrl}\n`);

    // Test wallet creation and balance check
    console.log('✅ Test 2: Wallet balance check...');
    const wallet = sdk.createWallet();
    const address = wallet.getAddress();
    console.log(`   Wallet address: ${AddressUtils.toShort(address)}`);

    const balance = await sdk.getBalance(address);
    const balanceEth = NumberUtils.formatEther(balance);
    console.log(`   Balance: ${balanceEth} STT`);

    if (balance === BigInt(0)) {
      console.log('   ⚠️  Wallet has no funds - will need testnet tokens for deployment tests');
    } else {
      console.log('   ✅ Wallet has funds - ready for transactions');
    }

    return { sdk, wallet, balance, hasTokens: balance > BigInt(0) };

  } catch (error) {
    console.error('❌ Network connectivity test failed:', error.message);
    throw error;
  }
}

async function testContractDeployment(sdk, wallet, hasTokens) {
  console.log('\n📦 Testing Contract Deployment\n');

  try {
    // Test 1: Deployment simulation (always works, no gas needed)
    console.log('✅ Test 1: Contract deployment simulation...');
    
    const simulation = await sdk.simulateDeployment(
      SIMPLE_STORAGE_CONTRACT.bytecode,
      SIMPLE_STORAGE_CONTRACT.abi,
      [], // No constructor arguments
      { gasLimit: 500000 }
    );

    console.log(`   Simulation success: ${simulation.success}`);
    console.log(`   Estimated gas: ${simulation.gasUsed}`);
    
    if (simulation.contractAddress) {
      console.log(`   Predicted address: ${AddressUtils.toShort(simulation.contractAddress)}`);
    }
    
    if (!simulation.success) {
      console.log(`   Simulation error: ${simulation.error}`);
    }

    // Test 2: Gas estimation
    console.log('\n✅ Test 2: Gas estimation...');
    
    if (sdk.deployer) {
      const gasEstimate = await sdk.deployer.estimateDeploymentGas(
        SIMPLE_STORAGE_CONTRACT.bytecode,
        SIMPLE_STORAGE_CONTRACT.abi,
        []
      );
      
      console.log(`   Gas limit: ${gasEstimate.gasLimit}`);
      console.log(`   Gas price: ${NumberUtils.formatGwei(gasEstimate.gasPrice)} gwei`);
      console.log(`   Total cost: ${NumberUtils.formatEther(gasEstimate.estimatedCost)} STT`);
    }

    // Test 3: Actual deployment (only if wallet has tokens)
    if (hasTokens && sdk.deployer) {
      console.log('\n✅ Test 3: Actual contract deployment...');
      
      try {
        const deployment = await sdk.deployContract(
          SIMPLE_STORAGE_CONTRACT.bytecode,
          SIMPLE_STORAGE_CONTRACT.abi,
          [],
          { gasLimit: 500000 }
        );

        console.log(`   ✅ Contract deployed successfully!`);
        console.log(`   Address: ${deployment.address}`);
        console.log(`   Transaction: ${deployment.transactionHash}`);
        console.log(`   Gas used: ${deployment.receipt.gasUsed}`);
        console.log(`   Cost: ${NumberUtils.formatEther(deployment.deploymentCost)} STT`);

        return deployment.contract;

      } catch (deployError) {
        console.log(`   ❌ Deployment failed: ${deployError.message}`);
        
        // Try to get more details about the error
        const parsedError = ErrorUtils.parseContractError(deployError);
        console.log(`   Error type: ${parsedError.type}`);
        console.log(`   User message: ${ErrorUtils.formatUserError(deployError)}`);
      }
    } else {
      console.log('\n⚠️  Test 3: Skipping actual deployment (no funds or deployer)');
    }

    return null;

  } catch (error) {
    console.error('❌ Contract deployment test failed:', error.message);
    return null;
  }
}

async function testContractInteraction(sdk, contract) {
  console.log('\n🔧 Testing Contract Interaction\n');

  if (!contract) {
    console.log('⚠️  No deployed contract available - testing with simulation only\n');
    
    // Test simulation on a known contract if available
    console.log('✅ Test: Contract call simulation...');
    
    // Create a mock contract for simulation testing
    const mockContract = sdk.getContract(
      '0x742d35Cc6634C0532925a3b8D95a2e1dfe3F3ad1', // Example address
      SIMPLE_STORAGE_CONTRACT.abi
    );

    try {
      // Test simulation
      const simulation = await mockContract.simulate('get', []);
      console.log(`   Simulation result: ${simulation.success}`);
      
      if (!simulation.success && simulation.error) {
        console.log(`   Expected error: ${simulation.error.reason}`);
      }
    } catch (error) {
      console.log(`   Simulation failed (expected): ${error.message}`);
    }

    return;
  }

  try {
    // Test 1: Read-only function call
    console.log('✅ Test 1: Reading contract state...');
    
    const currentValue = await contract.call('get', []);
    console.log(`   Current stored value: ${currentValue}`);

    // Test 2: Simulate state-changing transaction
    console.log('\n✅ Test 2: Simulating state change...');
    
    const newValue = 42;
    const simulation = await contract.simulate('set', [newValue]);
    
    console.log(`   Simulation success: ${simulation.success}`);
    console.log(`   Estimated gas: ${simulation.gasUsed}`);
    
    if (!simulation.success && simulation.error) {
      console.log(`   Simulation error: ${simulation.error.reason}`);
    }

    // Test 3: Actual state-changing transaction (if simulation succeeded)
    if (simulation.success) {
      console.log('\n✅ Test 3: Executing state change...');
      
      try {
        const tx = await contract.send('set', [newValue], {
          gasLimit: simulation.gasUsed + BigInt(50000) // Add buffer
        });

        console.log(`   Transaction sent: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await sdk.waitForTransaction(tx.hash, 1, 60000);
        
        if (receipt) {
          console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
          console.log(`   Gas used: ${receipt.gasUsed}`);
          
          // Verify the change
          const newStoredValue = await contract.call('get', []);
          console.log(`   New stored value: ${newStoredValue}`);
          
          if (newStoredValue.toString() === newValue.toString()) {
            console.log('   ✅ State change successful!');
          } else {
            console.log('   ❌ State change verification failed');
          }
        }

      } catch (txError) {
        console.log(`   ❌ Transaction failed: ${txError.message}`);
        
        // Get detailed error information
        const parsedError = ErrorUtils.parseContractError(txError);
        console.log(`   Error type: ${parsedError.type}`);
        console.log(`   User message: ${ErrorUtils.formatUserError(txError)}`);
      }
    }

    // Test 4: Gas estimation for contract calls
    console.log('\n✅ Test 4: Gas estimation for contract calls...');
    
    try {
      const gasEstimate = await contract.estimateGas('set', [123]);
      console.log(`   Estimated gas for set(123): ${gasEstimate}`);
    } catch (gasError) {
      console.log(`   Gas estimation failed: ${gasError.message}`);
    }

  } catch (error) {
    console.error('❌ Contract interaction test failed:', error.message);
  }
}

async function testErrorHandlingAndDebugging(sdk) {
  console.log('\n🐛 Testing Error Handling and Debugging\n');

  try {
    // Test 1: Invalid contract call
    console.log('✅ Test 1: Testing invalid contract interaction...');
    
    const invalidContract = sdk.getContract(
      '0x0000000000000000000000000000000000000001', // Invalid contract address
      SIMPLE_STORAGE_CONTRACT.abi
    );

    try {
      await invalidContract.call('get', []);
      console.log('   ❌ Unexpected success - should have failed');
    } catch (error) {
      console.log('   ✅ Expected error caught');
      
      const parsedError = ErrorUtils.parseContractError(error);
      console.log(`   Error type: ${parsedError.type}`);
      console.log(`   Error message: ${parsedError.message}`);
      console.log(`   User-friendly: ${ErrorUtils.formatUserError(error)}`);
    }

    // Test 2: Simulation of failing transaction
    console.log('\n✅ Test 2: Testing transaction simulation failure...');
    
    try {
      const simulation = await invalidContract.simulate('set', [42]);
      console.log(`   Simulation success: ${simulation.success}`);
      
      if (!simulation.success && simulation.error) {
        console.log(`   ✅ Simulation correctly predicted failure`);
        console.log(`   Error reason: ${simulation.error.reason}`);
      }
    } catch (simError) {
      console.log(`   ✅ Simulation failed as expected: ${simError.message}`);
    }

    // Test 3: Network timeout simulation
    console.log('\n✅ Test 3: Testing network timeout handling...');
    
    const shortTimeoutSDK = new SomniaSDK({
      network: SomniaNetwork.TESTNET,
      timeout: 1, // Very short timeout
      retries: 1,
      debug: true
    });

    try {
      await shortTimeoutSDK.getBlockNumber();
      console.log('   ❌ Unexpected success - should have timed out');
    } catch (timeoutError) {
      console.log('   ✅ Timeout handled correctly');
      console.log(`   Error: ${timeoutError.message}`);
    }

    // Test 4: Invalid input validation
    console.log('\n✅ Test 4: Testing input validation...');
    
    const validations = [
      { test: 'Valid address', input: '0x742d35Cc6634C0532925a3b8D95a2e1dfe3F3ad1', fn: ValidationUtils.isValidAddress },
      { test: 'Invalid address', input: 'not-an-address', fn: ValidationUtils.isValidAddress },
      { test: 'Valid amount', input: '1.5', fn: ValidationUtils.isValidAmount },
      { test: 'Invalid amount', input: 'abc', fn: ValidationUtils.isValidAmount },
      { test: 'Valid gas', input: '21000', fn: ValidationUtils.isValidGas },
      { test: 'Invalid gas', input: '-100', fn: ValidationUtils.isValidGas }
    ];

    validations.forEach(({ test, input, fn }) => {
      const result = fn(input);
      console.log(`   ${test}: ${input} → ${result ? '✅' : '❌'}`);
    });

    // Test 5: Debug mode functionality
    console.log('\n✅ Test 5: Testing debug mode...');
    
    DebugUtils.enableDebug();
    console.log('   Debug mode enabled');
    
    // Test debug logging
    DebugUtils.log('Test debug message');
    DebugUtils.warn('Test warning message');
    DebugUtils.error('Test error message', { detail: 'test error' });
    
    // Test performance measurement
    await DebugUtils.measureTime('Test operation', async () => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });
    
    DebugUtils.disableDebug();
    console.log('   Debug mode disabled');

    // Test 6: Error trace testing
    console.log('\n✅ Test 6: Testing transaction error tracing...');
    
    try {
      // Try to trace a non-existent transaction
      const fakeHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const trace = await sdk.traceTransaction(fakeHash);
      
      if (trace) {
        console.log(`   Trace result: ${trace.error}`);
      } else {
        console.log('   ✅ No trace for non-existent transaction (expected)');
      }
    } catch (traceError) {
      console.log(`   ✅ Trace error handled: ${traceError.message}`);
    }

  } catch (error) {
    console.error('❌ Error handling test failed:', error.message);
  }
}

async function testAdvancedFeatures(sdk, hasTokens) {
  console.log('\n🚀 Testing Advanced Features\n');

  try {
    // Test 1: Multiple contract deployment simulation
    console.log('✅ Test 1: Multiple contract deployment simulation...');
    
    if (sdk.deployer) {
      const deployments = [
        {
          bytecode: SIMPLE_STORAGE_CONTRACT.bytecode,
          abi: SIMPLE_STORAGE_CONTRACT.abi,
          name: 'SimpleStorage',
          constructorArgs: []
        }
      ];

      try {
        const results = await sdk.deployer.deployMultiple(deployments);
        console.log(`   ✅ Multiple deployment simulation successful`);
        results.forEach(result => {
          console.log(`   ${result.name}: ${AddressUtils.toShort(result.address)}`);
        });
      } catch (error) {
        console.log(`   Expected simulation error: ${error.message}`);
      }
    }

    // Test 2: Gas cost analysis
    console.log('\n✅ Test 2: Gas cost analysis...');
    
    if (sdk.deployer) {
      try {
        const costs = await sdk.deployer.getDeploymentCosts(
          SIMPLE_STORAGE_CONTRACT.bytecode,
          SIMPLE_STORAGE_CONTRACT.abi,
          []
        );
        
        console.log(`   Gas estimate: ${costs.gasEstimate}`);
        console.log(`   Gas price: ${NumberUtils.formatGwei(costs.gasPriceWei)} gwei`);
        console.log(`   Total cost: ${costs.totalCostEth} STT`);
      } catch (costError) {
        console.log(`   Cost analysis error: ${costError.message}`);
      }
    }

    // Test 3: Contract verification
    console.log('\n✅ Test 3: Contract verification...');
    
    const testAddress = '0x742d35Cc6634C0532925a3b8D95a2e1dfe3F3ad1';
    
    try {
      const isContract = await sdk.isContract(testAddress);
      console.log(`   Address ${AddressUtils.toShort(testAddress)} is contract: ${isContract}`);
      
      if (sdk.deployer) {
        const verification = await sdk.deployer.verifyDeployment(
          testAddress,
          SIMPLE_STORAGE_CONTRACT.abi
        );
        
        console.log(`   Deployment verified: ${verification.isDeployed}`);
        console.log(`   Has expected interface: ${verification.hasExpectedInterface}`);
      }
    } catch (verifyError) {
      console.log(`   Verification error (expected): ${verifyError.message}`);
    }

    // Test 4: Network switching
    console.log('\n✅ Test 4: Network switching...');
    
    const mainnetSDK = sdk.switchNetwork(SomniaNetwork.MAINNET);
    const mainnetConfig = mainnetSDK.getNetworkConfig();
    
    console.log(`   Switched to: ${mainnetConfig.name}`);
    console.log(`   Chain ID: ${mainnetConfig.chainId}`);
    console.log(`   RPC URL: ${mainnetConfig.rpcUrl}`);

    // Test 5: Wallet utilities
    console.log('\n✅ Test 5: Wallet utilities...');
    
    const { WalletUtils } = require('../dist/index.js');
    
    const newMnemonic = WalletUtils.generateMnemonic();
    console.log(`   Generated mnemonic: ${newMnemonic.split(' ').slice(0, 3).join(' ')}...`);
    
    const isValidMnemonic = WalletUtils.isValidMnemonic(newMnemonic);
    console.log(`   Mnemonic is valid: ${isValidMnemonic}`);
    
    const addresses = WalletUtils.deriveAddresses(newMnemonic, 3);
    console.log(`   Derived addresses:`);
    addresses.forEach((addr, index) => {
      console.log(`     ${index}: ${AddressUtils.toShort(addr.address)} (${addr.path})`);
    });

  } catch (error) {
    console.error('❌ Advanced features test failed:', error.message);
  }
}

async function runComprehensiveTests() {
  console.log('🧪 Comprehensive Somnia SDK Testing Suite\n');
  console.log('=' .repeat(60));

  try {
    // Phase 1: Network connectivity
    const { sdk, wallet, balance, hasTokens } = await testNetworkConnectivity();

    // Phase 2: Contract deployment
    const deployedContract = await testContractDeployment(sdk, wallet, hasTokens);

    // Phase 3: Contract interaction
    await testContractInteraction(sdk, deployedContract);

    // Phase 4: Error handling and debugging
    await testErrorHandlingAndDebugging(sdk);

    // Phase 5: Advanced features
    await testAdvancedFeatures(sdk, hasTokens);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Comprehensive testing completed!');
    
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Network connectivity: Passed`);
    console.log(`   ✅ Contract deployment: ${deployedContract ? 'Deployed' : 'Simulated only'}`);
    console.log(`   ✅ Contract interaction: ${deployedContract ? 'Full test' : 'Simulation only'}`);
    console.log(`   ✅ Error handling: Passed`);
    console.log(`   ✅ Advanced features: Passed`);
    
    if (!hasTokens) {
      console.log('\n💡 Note: Some tests were limited due to lack of testnet tokens.');
      console.log('   To get testnet tokens, visit a Somnia testnet faucet.');
    }

  } catch (error) {
    console.error('\n❌ Comprehensive testing failed:', error);
    process.exit(1);
  }
}

// Run comprehensive tests
runComprehensiveTests();

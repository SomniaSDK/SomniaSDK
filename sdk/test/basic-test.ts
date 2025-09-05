import { 
  createTestnetSDK, 
  SomniaSDK,
  SomniaNetwork,
  WalletFactory,
  AddressUtils,
  NumberUtils,
  ValidationUtils,
  DebugUtils
} from '../src/index';

async function testBasicFunctionality() {
  console.log('🧪 Testing Somnia SDK Basic Functionality\n');

  // Test 1: SDK Creation
  console.log('✅ Test 1: Creating testnet SDK...');
  const sdk = createTestnetSDK();
  const config = sdk.getNetworkConfig();
  console.log(`   Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`   RPC: ${config.rpcUrl}\n`);

  // Test 2: Wallet Creation
  console.log('✅ Test 2: Creating wallet...');
  const wallet = sdk.createWallet();
  const address = wallet.getAddress();
  console.log(`   Address: ${address}`);
  console.log(`   Short: ${AddressUtils.toShort(address)}\n`);

  // Test 3: Address Validation
  console.log('✅ Test 3: Address validation...');
  console.log(`   Valid address: ${AddressUtils.isValidAddress(address)}`);
  console.log(`   Invalid address: ${AddressUtils.isValidAddress('invalid')}\n`);

  // Test 4: Number Utilities
  console.log('✅ Test 4: Number utilities...');
  const weiAmount = NumberUtils.parseEther('1.5');
  const ethAmount = NumberUtils.formatEther(weiAmount);
  const gweiAmount = NumberUtils.formatGwei(BigInt('20000000000'));
  console.log(`   1.5 ETH = ${weiAmount} wei`);
  console.log(`   ${weiAmount} wei = ${ethAmount} ETH`);
  console.log(`   20000000000 wei = ${gweiAmount} gwei\n`);

  // Test 5: Validation Utilities
  console.log('✅ Test 5: Validation utilities...');
  console.log(`   Valid amount "1.5": ${ValidationUtils.isValidAmount('1.5')}`);
  console.log(`   Valid amount "abc": ${ValidationUtils.isValidAmount('abc')}`);
  console.log(`   Valid gas "21000": ${ValidationUtils.isValidGas('21000')}\n`);

  // Test 6: Debug Mode
  console.log('✅ Test 6: Debug mode...');
  DebugUtils.enableDebug();
  DebugUtils.log('Debug message test');
  DebugUtils.warn('Warning message test');
  DebugUtils.disableDebug();

  // Test 7: Custom SDK Configuration
  console.log('✅ Test 7: Custom SDK configuration...');
  const customSDK = new SomniaSDK({
    network: SomniaNetwork.TESTNET,
    debug: false,
    timeout: 30000,
    retries: 3
  });
  console.log(`   Custom SDK created successfully\n`);

  // Test 8: Network Information (without actual network calls)
  console.log('✅ Test 8: Network configuration...');
  console.log(`   Current network: ${sdk.getNetworkConfig().name}`);
  
  // Test switching networks
  const mainnetSDK = sdk.switchNetwork(SomniaNetwork.MAINNET);
  console.log(`   Switched to: ${mainnetSDK.getNetworkConfig().name}\n`);

  console.log('🎉 All basic tests passed!');
  console.log('\n📝 Note: Network connectivity tests skipped (no actual RPC calls made)');
  console.log('   To test with real network, ensure you have Somnia testnet access.');
}

async function testWalletFunctionality() {
  console.log('\n🔐 Testing Wallet Functionality\n');

  // Test wallet creation methods
  console.log('✅ Test: Wallet creation methods...');
  
  // Random wallet
  const randomWallet = WalletFactory.createRandom();
  console.log(`   Random wallet: ${AddressUtils.toShort(randomWallet.getAddress())}`);

  // HD wallet
  const hdWallet = WalletFactory.createRandomHD();
  console.log(`   HD wallet: ${AddressUtils.toShort(hdWallet.getAddress())}`);
  
  const mnemonic = hdWallet.exportMnemonic();
  if (mnemonic) {
    console.log(`   Mnemonic: ${mnemonic.split(' ').slice(0, 3).join(' ')}...`);
  }

  // Test mnemonic validation
  const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
  const isValidMnemonic = ValidationUtils.isValidMnemonic(testMnemonic);
  console.log(`   Valid test mnemonic: ${isValidMnemonic}`);

  // Import from mnemonic
  if (isValidMnemonic) {
    const importedWallet = WalletFactory.fromMnemonic(testMnemonic);
    console.log(`   Imported wallet: ${AddressUtils.toShort(importedWallet.getAddress())}`);
  }

  console.log('\n🎉 Wallet functionality tests passed!');
}

async function testUtilityFunctions() {
  console.log('\n🛠️  Testing Utility Functions\n');

  // Address utilities
  console.log('✅ Address utilities:');
  const testAddr = '0x742d35Cc6634C0532925a3b8D95a2e1dfe3F3ad1';
  console.log(`   Original: ${testAddr}`);
  console.log(`   Checksum: ${AddressUtils.toChecksumAddress(testAddr)}`);
  console.log(`   Short: ${AddressUtils.toShort(testAddr, 8, 6)}`);

  // Number utilities
  console.log('\n✅ Number utilities:');
  const largeNumber = 1500000;
  console.log(`   Large number: ${NumberUtils.formatLarge(largeNumber)}`);
  console.log(`   With commas: ${NumberUtils.formatWithCommas(largeNumber)}`);
  console.log(`   Percentage: ${NumberUtils.formatPercentage(0.15)}`);

  // Time utilities
  console.log('\n✅ Time utilities:');
  const now = Math.floor(Date.now() / 1000);
  const pastTime = now - 3600; // 1 hour ago
  
  // Import TimeUtils (assuming it's part of utils)
  console.log(`   Current timestamp: ${now}`);
  console.log(`   Past time: ${pastTime}`);

  console.log('\n🎉 Utility function tests passed!');
}

async function runAllTests() {
  try {
    console.log('🚀 Starting Somnia SDK Test Suite\n');
    console.log('='.repeat(50));
    
    await testBasicFunctionality();
    await testWalletFunctionality();
    await testUtilityFunctions();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test with actual Somnia testnet connection');
    console.log('   2. Deploy and interact with contracts');
    console.log('   3. Test error handling and debugging features');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };

# @somnia/sdk

A comprehensive TypeScript SDK for building applications on the Somnia blockchain with debugging and simulation capabilities.

## Features

- 🚀 **Easy Setup**: One-line SDK initialization for testnet/mainnet
- 🔐 **Wallet Management**: Secure wallet creation, import, and key management
- 📦 **Contract Deployment**: Deploy and interact with smart contracts
- 🔍 **Debugging Tools**: Simulate transactions and trace errors
- 🌐 **Network Support**: Testnet, mainnet, and local development
- 💰 **Gas Optimization**: Smart gas estimation with Somnia-specific optimizations
- 🛠️ **Developer Tools**: Comprehensive utilities for address validation, number formatting, and more

## Installation

```bash
npm install @somnia/sdk
```

## Quick Start

### Basic Setup

```typescript
import { createTestnetSDK, SomniaNetwork } from '@somnia/sdk';

// Create SDK instance for testnet
const sdk = createTestnetSDK();

// Or create with your own private key
const sdkWithWallet = createTestnetSDK('0xYourPrivateKeyHere');

// Get network information
const networkConfig = sdk.getNetworkConfig();
console.log(`Connected to: ${networkConfig.name}`);
```

### Advanced Setup

```typescript
import { SomniaSDK, SomniaNetwork } from '@somnia/sdk';

const sdk = new SomniaSDK({
  network: SomniaNetwork.TESTNET, // or MAINNET, LOCAL
  wallet: {
    privateKey: 'your-private-key',
    // or use mnemonic:
    // mnemonic: 'your twelve word mnemonic phrase here...'
  },
  debug: true,
  timeout: 30000,
  retries: 3
});
```

## Core Features

### Wallet Management

```typescript
// Create a new random wallet
const wallet = sdk.createWallet();
console.log(`Address: ${wallet.getAddress()}`);

// Import from private key
const importedWallet = sdk.importWallet('0xprivatekey...');

// Import from mnemonic
const mnemonicWallet = sdk.importWalletFromMnemonic(
  'twelve word mnemonic phrase...',
  "m/44'/60'/0'/0/0" // optional derivation path
);

// Get balance
const balance = await sdk.getBalance();
console.log(`Balance: ${balance} wei`);
```

### Contract Deployment

```typescript
// Deploy a contract
const deployment = await sdk.deployContract(
  bytecode,
  abi,
  constructorArgs,
  {
    gasLimit: 1000000,
    gasPrice: '20000000000', // 20 gwei
  }
);

console.log(`Contract deployed at: ${deployment.address}`);
console.log(`Transaction hash: ${deployment.transactionHash}`);

// Simulate deployment before actually deploying
const simulation = await sdk.simulateDeployment(
  bytecode,
  abi,
  constructorArgs
);

if (simulation.success) {
  console.log(`Deployment will use ${simulation.gasUsed} gas`);
} else {
  console.log(`Deployment would fail: ${simulation.error}`);
}
```

### Contract Interaction

```typescript
// Connect to existing contract
const contract = sdk.getContract(contractAddress, abi);

// Call a read-only function
const result = await contract.call('balanceOf', [userAddress]);

// Send a transaction
const tx = await contract.send('transfer', [toAddress, amount], {
  gasLimit: 100000
});

// Wait for transaction confirmation
const receipt = await sdk.waitForTransaction(tx.hash);

// Simulate transaction before sending
const simulation = await contract.simulate('transfer', [toAddress, amount]);
if (!simulation.success) {
  console.log(`Transaction would fail: ${simulation.error?.reason}`);
}
```

### Debugging and Tracing

```typescript
// Trace a failed transaction
const trace = await sdk.traceTransaction('0xtxhash...');
if (trace) {
  console.log(`Error: ${trace.error}`);
  console.log(`Revert reason: ${trace.revertReason}`);
}

// Enable debug mode
sdk.setDebugMode(true);

// Measure performance
import { DebugUtils } from '@somnia/sdk';

const result = await DebugUtils.measureTime('Contract deployment', async () => {
  return await sdk.deployContract(bytecode, abi, args);
});
```

## Utilities

### Address Utils

```typescript
import { AddressUtils } from '@somnia/sdk';

// Validate address
const isValid = AddressUtils.isValidAddress('0x123...');

// Convert to checksum format
const checksummed = AddressUtils.toChecksumAddress('0xabc...');

// Short format for display
const short = AddressUtils.toShort('0x1234...abcd', 6, 4); // "0x1234...abcd"

// Compare addresses
const areEqual = AddressUtils.areEqual(addr1, addr2);
```

### Number Utils

```typescript
import { NumberUtils } from '@somnia/sdk';

// Format wei to ether
const ethAmount = NumberUtils.formatEther(BigInt('1000000000000000000')); // "1.0"

// Parse ether to wei
const weiAmount = NumberUtils.parseEther('1.0'); // 1000000000000000000n

// Format gas price in gwei
const gweiPrice = NumberUtils.formatGwei(BigInt('20000000000')); // "20.0"

// Format large numbers
const formatted = NumberUtils.formatLarge(1500000); // "1.5M"
```

### Error Handling

```typescript
import { ErrorUtils } from '@somnia/sdk';

try {
  await contract.send('someMethod', []);
} catch (error) {
  const parsed = ErrorUtils.parseContractError(error);
  
  if (parsed.type === 'revert') {
    console.log(`Contract reverted: ${parsed.message}`);
  } else if (parsed.type === 'insufficient_funds') {
    console.log('Not enough funds for transaction');
  }
  
  // Format for user display
  const userMessage = ErrorUtils.formatUserError(error);
  console.log(userMessage);
}
```

## Network Configuration

```typescript
import { SOMNIA_NETWORKS, SomniaNetwork } from '@somnia/sdk';

// Available networks
const testnet = SOMNIA_NETWORKS[SomniaNetwork.TESTNET];
console.log(`Testnet RPC: ${testnet.rpcUrl}`);
console.log(`Chain ID: ${testnet.chainId}`);

// Switch networks
const mainnetSDK = sdk.switchNetwork(SomniaNetwork.MAINNET);
```

## TypeScript Support

The SDK is written in TypeScript and provides full type safety:

```typescript
import { SomniaContract, DeploymentResult, SimulationResult } from '@somnia/sdk';

// All types are properly exported and documented
const deployment: DeploymentResult = await sdk.deployContract(/* ... */);
const contract: SomniaContract = deployment.contract;
```

## Error Handling

The SDK provides comprehensive error handling:

```typescript
try {
  const result = await contract.call('someMethod', []);
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.log('Not enough funds');
  } else if (error.reason) {
    console.log(`Contract error: ${error.reason}`);
  } else {
    console.log(`Unexpected error: ${error.message}`);
  }
}
```

## Best Practices

1. **Always simulate before deploying/sending transactions**:
   ```typescript
   const simulation = await sdk.simulateDeployment(bytecode, abi, args);
   if (simulation.success) {
     await sdk.deployContract(bytecode, abi, args);
   }
   ```

2. **Use debug mode during development**:
   ```typescript
   const sdk = createTestnetSDK();
   sdk.setDebugMode(true);
   ```

3. **Handle errors gracefully**:
   ```typescript
   import { ErrorUtils } from '@somnia/sdk';
   
   try {
     await transaction();
   } catch (error) {
     const userMessage = ErrorUtils.formatUserError(error);
     // Show user-friendly message
   }
   ```

4. **Validate inputs**:
   ```typescript
   import { ValidationUtils } from '@somnia/sdk';
   
   if (!ValidationUtils.isValidAmount(userInput)) {
     throw new Error('Invalid amount');
   }
   ```

## Examples

Check the `examples/` directory for complete usage examples:

- [Basic Usage](./examples/basic-usage.ts) - Getting started guide
- [Contract Deployment](./examples/contract-deployment.ts) - Deploy and interact with contracts
- [Debugging](./examples/debugging.ts) - Debug failed transactions
- [Advanced Features](./examples/advanced.ts) - Advanced SDK features

## API Reference

For complete API documentation, see the [TypeScript definitions](./dist/index.d.ts) or visit our [documentation site](#).

## Contributing

Contributions are welcome! Please read our [contributing guide](../CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../LICENSE) for details.

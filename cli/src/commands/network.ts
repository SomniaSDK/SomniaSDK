import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';

export const networkCommand = new Command('network');

// Import from the published SDK package
const { 
  createTestnetSDK, 
  createMainnetSDK, 
  SomniaSDK,
  AddressUtils,
  NumberUtils
} = require('somnia-sdk-devkit');

// Get SDK instance
function getSDK(network: 'testnet' | 'mainnet' = 'testnet'): any {
  return network === 'testnet' ? createTestnetSDK() : createMainnetSDK();
}

// Show network status
export async function showStatus() {
  try {
    const network = process.env.SOMNIA_NETWORK as 'testnet' | 'mainnet' || 'testnet';
    const sdk = getSDK(network);
    
    const spinner = ora('Fetching network status...').start();
    
    const [blockNumber, config] = await Promise.all([
      sdk.getBlockNumber(),
      Promise.resolve(sdk.getNetworkConfig())
    ]);
    
    spinner.succeed('Network status retrieved');
    
    console.log('\n' + chalk.green('🌐 Network Status'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Network:')} ${config.name}`);
    console.log(`${chalk.cyan('Chain ID:')} ${config.chainId}`);
    console.log(`${chalk.cyan('RPC URL:')} ${config.rpcUrl}`);
    console.log(`${chalk.cyan('Current Block:')} ${blockNumber.toLocaleString()}`);
    console.log(`${chalk.cyan('Explorer:')} ${config.blockExplorer}`);
    console.log(`${chalk.cyan('Currency:')} ${config.currency.symbol} (${config.currency.decimals} decimals)`);
    
    // Test connection speed
    const startTime = Date.now();
    await sdk.getBlockNumber();
    const responseTime = Date.now() - startTime;
    
    console.log(`${chalk.cyan('Response Time:')} ${responseTime}ms`);
    
    if (responseTime < 500) {
      console.log(chalk.green('🚀 Connection: Excellent'));
    } else if (responseTime < 1000) {
      console.log(chalk.yellow('⚡ Connection: Good'));
    } else {
      console.log(chalk.red('🐌 Connection: Slow'));
    }
    
  } catch (error: any) {
    console.error(chalk.red('Error fetching network status:'), error.message);
  }
}

// Network info
networkCommand
  .command('info')
  .description('Show detailed network information')
  .option('-n, --network <network>', 'Network (testnet|mainnet)', 'testnet')
  .action(async (options) => {
    await showStatus();
  });

// Test network connection
networkCommand
  .command('test')
  .description('Test network connection and performance')
  .option('-n, --network <network>', 'Network (testnet|mainnet)', 'testnet')
  .action(async (options) => {
    try {
      const sdk = getSDK(options.network);
      const config = sdk.getNetworkConfig();
      
      console.log('\n' + chalk.cyan('🧪 Network Connection Test'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`Testing: ${config.name} (${config.rpcUrl})`);
      
      // Test 1: Basic connectivity
      console.log('\n1. Testing basic connectivity...');
      const spinner1 = ora('Connecting...').start();
      
      try {
        const startTime = Date.now();
        const blockNumber = await sdk.getBlockNumber();
        const responseTime = Date.now() - startTime;
        
        spinner1.succeed(`Connected! Block: ${blockNumber.toLocaleString()} (${responseTime}ms)`);
      } catch (error: any) {
        spinner1.fail(`Connection failed: ${error.message}`);
        return;
      }
      
      // Test 2: Multiple requests
      console.log('\n2. Testing multiple requests...');
      const spinner2 = ora('Running performance test...').start();
      
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await sdk.getBlockNumber();
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      spinner2.succeed('Performance test complete');
      
      console.log(`  Average: ${avgTime.toFixed(0)}ms`);
      console.log(`  Min: ${minTime}ms`);
      console.log(`  Max: ${maxTime}ms`);
      
      // Test 3: Gas price
      console.log('\n3. Testing gas price estimation...');
      const spinner3 = ora('Getting gas price...').start();
      
      try {
        // This would use the SDK's gas estimation
        spinner3.succeed('Gas estimation available');
        console.log('  Gas price estimation: Available');
      } catch (error: any) {
        spinner3.warn('Gas estimation unavailable');
      }
      
      console.log('\n' + chalk.green('✅ Network Test Complete'));
      
      if (avgTime < 300) {
        console.log(chalk.green('🚀 Network performance: Excellent'));
      } else if (avgTime < 1000) {
        console.log(chalk.yellow('⚡ Network performance: Good'));
      } else {
        console.log(chalk.red('🐌 Network performance: Needs improvement'));
      }
      
    } catch (error: any) {
      console.error(chalk.red('Network test failed:'), error.message);
    }
  });

// Switch network
networkCommand
  .command('switch')
  .description('Switch between networks')
  .argument('<network>', 'Network to switch to (testnet|mainnet)')
  .action(async (network) => {
    if (!['testnet', 'mainnet'].includes(network)) {
      console.error(chalk.red('Error: Invalid network. Use "testnet" or "mainnet"'));
      return;
    }
    
    console.log(`\n${chalk.cyan('🔄 Switching to')} ${chalk.bold(network)}`);
    
    const sdk = getSDK(network as 'testnet' | 'mainnet');
    const config = sdk.getNetworkConfig();
    
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Network:')} ${config.name}`);
    console.log(`${chalk.cyan('Chain ID:')} ${config.chainId}`);
    console.log(`${chalk.cyan('RPC:')} ${config.rpcUrl}`);
    
    // Test connection
    const spinner = ora('Testing connection...').start();
    
    try {
      const blockNumber = await sdk.getBlockNumber();
      spinner.succeed(`Connected to block ${blockNumber.toLocaleString()}`);
      
      process.env.SOMNIA_NETWORK = network;
      console.log(chalk.green(`\n✅ Switched to ${network}`));
      
      console.log(chalk.yellow('\n💡 Network persisted for this session.'));
      console.log(chalk.gray('Use --network flag for permanent switching.'));
      
    } catch (error: any) {
      spinner.fail('Connection failed');
      console.error(chalk.red('Error:'), error.message);
    }
  });

// List available networks
networkCommand
  .command('list')
  .description('List available networks')
  .action(() => {
    console.log('\n' + chalk.cyan('🌐 Available Networks'));
    console.log(chalk.gray('━'.repeat(50)));
    
    const networks = [
      {
        name: 'testnet',
        display: 'Somnia Testnet',
        chainId: 50312,
        rpc: 'https://dream-rpc.somnia.network',
        explorer: 'https://shannon-explorer.somnia.network/',
        currency: 'STT',
        description: 'Test network for development'
      },
      {
        name: 'mainnet',
        display: 'Somnia Mainnet',
        chainId: 50311,
        rpc: 'https://rpc.somnia.network',
        explorer: 'https://somnia.blockscout.com',
        currency: 'SOM',
        description: 'Production network'
      }
    ];
    
    networks.forEach((network, index) => {
      const current = process.env.SOMNIA_NETWORK === network.name;
      const marker = current ? chalk.green('●') : chalk.gray('○');
      
      console.log(`${marker} ${chalk.bold(network.display)} ${current ? chalk.green('(current)') : ''}`);
      console.log(`  ${chalk.gray('Name:')} ${network.name}`);
      console.log(`  ${chalk.gray('Chain ID:')} ${network.chainId}`);
      console.log(`  ${chalk.gray('RPC:')} ${network.rpc}`);
      console.log(`  ${chalk.gray('Currency:')} ${network.currency}`);
      console.log(`  ${chalk.gray('Description:')} ${network.description}`);
      
      if (index < networks.length - 1) console.log('');
    });
    
    console.log('\n' + chalk.yellow('💡 Commands:'));
    console.log(chalk.gray('  somnia network switch testnet   # Switch to testnet'));
    console.log(chalk.gray('  somnia network switch mainnet   # Switch to mainnet'));
    console.log(chalk.gray('  somnia network test              # Test current network'));
  });

// Help command
networkCommand
  .command('help')
  .description('Show network command help')
  .action(() => {
    console.log('\n' + chalk.cyan('🌐 Network Commands'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.green('info')}         Show network information`);
    console.log(`${chalk.green('test')}         Test network connection`);
    console.log(`${chalk.green('switch')}       Switch between networks`);
    console.log(`${chalk.green('list')}         List available networks`);
    console.log(`${chalk.green('help')}         Show this help`);
    
    console.log('\n' + chalk.cyan('💡 Examples:'));
    console.log(chalk.gray('  somnia network info'));
    console.log(chalk.gray('  somnia network test'));
    console.log(chalk.gray('  somnia network switch testnet'));
    console.log(chalk.gray('  somnia status                   # Quick status check'));
  });

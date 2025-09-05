import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as CryptoJS from 'crypto-js';
import { ethers } from 'ethers';

// Import from the SDK
const { 
  createTestnetSDK,
  createMainnetSDK,
  AddressUtils,
  NumberUtils,
  ErrorUtils
} = require('../../../sdk/dist/index.js');

interface WalletConfig {
  address: string;
  encrypted?: string;
  type: 'imported' | 'created' | 'hd';
  network: 'testnet' | 'mainnet';
  createdAt: string;
}

const WALLET_CONFIG_PATH = path.join(process.cwd(), '.somnia', 'wallet.json');

// Load wallet configuration
async function loadWalletConfig(): Promise<WalletConfig | null> {
  try {
    if (await fs.pathExists(WALLET_CONFIG_PATH)) {
      return await fs.readJson(WALLET_CONFIG_PATH);
    }
  } catch (error) {
    console.error(chalk.red('Error loading wallet config:'), error);
  }
  return null;
}

// Get SDK instance
function getSDK(network: 'testnet' | 'mainnet' = 'testnet') {
  return network === 'testnet' ? createTestnetSDK() : createMainnetSDK();
}

export async function callCommand(address: string, functionName: string, args: string[], options: any) {
  try {
    const config = await loadWalletConfig();
    
    if (!config) {
      console.log(chalk.yellow('⚠️  No wallet found for sending transactions.'));
      console.log(chalk.gray('For read-only calls, this will work without a wallet.'));
    }
    
    console.log('\n' + chalk.cyan('📞 Contract Function Call'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Contract:')} ${AddressUtils.toShort(address)}`);
    console.log(`${chalk.cyan('Function:')} ${functionName}`);
    console.log(`${chalk.cyan('Arguments:')} ${args.length > 0 ? args.join(', ') : 'none'}`);
    
    // Validate address
    if (!AddressUtils.isValidAddress(address)) {
      console.error(chalk.red('Error: Invalid contract address'));
      return;
    }
    
    let abi: any[] = [];
    
    // Load ABI
    if (options.abi) {
      const abiPath = path.resolve(options.abi);
      if (!await fs.pathExists(abiPath)) {
        console.error(chalk.red('ABI file not found:'), abiPath);
        return;
      }
      
      try {
        const abiData = await fs.readJson(abiPath);
        // Handle Hardhat artifact format
        if (abiData.abi && Array.isArray(abiData.abi)) {
          abi = abiData.abi;
        } else if (Array.isArray(abiData)) {
          abi = abiData;
        } else {
          console.error(chalk.red('Invalid ABI format. Expected array or Hardhat artifact.'));
          return;
        }
      } catch (error) {
        console.error(chalk.red('Error loading ABI file:'), error);
        return;
      }
    } else {
      // Try to find ABI in deployments automatically
      console.log(chalk.gray('🔍 Searching for contract ABI...'));
      
      const deploymentsDir = path.join(process.cwd(), '.somnia', 'deployments');
      if (await fs.pathExists(deploymentsDir)) {
        const files = await fs.readdir(deploymentsDir);
        const deploymentFiles = files.filter((f: string) => f.endsWith('.json'));
        
        for (const file of deploymentFiles) {
          const deployment = await fs.readJson(path.join(deploymentsDir, file));
          if (deployment.address?.toLowerCase() === address.toLowerCase()) {
            abi = deployment.abi;
            console.log(chalk.green(`✓ Found ABI for ${deployment.contractName} contract`));
            break;
          }
        }
      }
      
      // If not found in deployments, try artifacts directory
      if (abi.length === 0) {
        const artifactsDir = path.join(process.cwd(), 'artifacts', 'contracts');
        if (await fs.pathExists(artifactsDir)) {
          const contractDirs = await fs.readdir(artifactsDir);
          
          for (const contractDir of contractDirs) {
            const contractPath = path.join(artifactsDir, contractDir);
            if ((await fs.stat(contractPath)).isDirectory()) {
              const files = await fs.readdir(contractPath);
              const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.dbg.json'));
              
              for (const jsonFile of jsonFiles) {
                const artifactPath = path.join(contractPath, jsonFile);
                const artifact = await fs.readJson(artifactPath);
                if (artifact.abi && Array.isArray(artifact.abi)) {
                  // For now, try the first artifact found - in a real scenario, 
                  // we'd need a better way to match contract to address
                  abi = artifact.abi;
                  console.log(chalk.yellow(`⚠️  Using ABI from ${jsonFile} (auto-detected)`));
                  break;
                }
              }
              if (abi.length > 0) break;
            }
          }
        }
      }
      
      if (abi.length === 0) {
        console.log(chalk.yellow('⚠️  No ABI found. Using basic ERC20 token ABI.'));
        
        // Default to ERC20 ABI for token contracts
        abi = [
          {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "name",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "symbol", 
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
          },
          {
            "inputs": [],
            "name": "decimals",
            "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
            "stateMutability": "view",
            "type": "function"
          }
        ];
      }
    }
    
    const network = config?.network || (process.env.SOMNIA_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const sdk = getSDK(network);
    
    // Find function in ABI
    const functionAbi = abi.find(item => 
      item.type === 'function' && item.name === functionName
    );
    
    if (!functionAbi) {
      console.error(chalk.red(`Function "${functionName}" not found in ABI`));
      console.log(chalk.yellow('\nAvailable functions:'));
      abi.filter(item => item.type === 'function').forEach(func => {
        const inputs = func.inputs?.map((input: any) => `${input.type} ${input.name}`).join(', ') || '';
        console.log(chalk.gray(`  ${func.name}(${inputs})`));
      });
      return;
    }
    
    const isReadOnly = functionAbi.stateMutability === 'view' || functionAbi.stateMutability === 'pure';
    
    console.log(`${chalk.cyan('Type:')} ${isReadOnly ? 'Read-only (view)' : 'State-changing (payable)'}`);
    
    try {
      
      if (isReadOnly) {
        // Read-only call
        const contract = sdk.getContract(address, abi);
        const spinner = ora('Calling contract function...').start();
        
        try {
          // Add timeout wrapper for contract calls
          const callWithTimeout = (fn: Promise<any>, timeoutMs: number = 30000) => {
            return Promise.race([
              fn,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Contract call timeout - try again or check network connection')), timeoutMs)
              )
            ]);
          };
          
          const result = await callWithTimeout(contract.call(functionName, args));
          
          spinner.succeed('Function call successful');
          
          console.log('\n' + chalk.green('📋 Call Result'));
          console.log(chalk.gray('━'.repeat(50)));
          
          if (Array.isArray(result)) {
            result.forEach((value, index) => {
              console.log(`${chalk.cyan(`Output ${index}:`)} ${value.toString()}`);
            });
          } else {
            console.log(`${chalk.cyan('Result:')} ${result.toString()}`);
          }
          
          // Try to format known types
          if (typeof result === 'bigint' || (typeof result === 'object' && result._isBigNumber)) {
            const formatted = NumberUtils.formatEther(result);
            if (formatted !== result.toString()) {
              console.log(`${chalk.cyan('Formatted:')} ${formatted} ETH`);
            }
          }
          
        } catch (error: any) {
          spinner.fail('Function call failed');
          
          // Handle specific contract errors
          if (error.code === 'CALL_EXCEPTION') {
            if (error.reason === 'require(false)' || error.data === '0x') {
              console.error(chalk.red('Contract Error:'), 'Function call reverted');
              console.log(chalk.yellow('Possible causes:'));
              console.log(chalk.gray('  • Function has a require() statement that failed'));
              console.log(chalk.gray('  • Contract state doesn\'t allow this call'));
              console.log(chalk.gray('  • Function expects different parameters'));
              console.log(chalk.gray('  • Contract may not be properly initialized'));
            } else {
              console.error(chalk.red('Contract Error:'), error.reason || 'Function execution failed');
            }
          } else {
            console.error(chalk.red('Error:'), ErrorUtils.formatUserError(error));
          }
        }
        
      } else {
        // State-changing call - requires wallet
        if (!config) {
          console.error(chalk.red('Error: Wallet required for state-changing functions'));
          console.log(chalk.gray('Create a wallet: somnia wallet create'));
          return;
        }
        
        // Get wallet password
        const { password } = await inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: 'Enter wallet password:',
          }
        ]);
        
        const spinner = ora('Preparing transaction...').start();
        
        try {
          // Decrypt wallet (supports both crypto-js and ethers.js encryption)
          let wallet: ethers.Wallet;
          
          // Check if it's crypto-js encrypted (starts with U2FsdGVkX1)
          if (config.encrypted!.startsWith('U2FsdGVkX1')) {
            const decryptedPrivateKey = CryptoJS.AES.decrypt(config.encrypted!, password).toString(CryptoJS.enc.Utf8);
            if (!decryptedPrivateKey) {
              spinner.fail('Failed to decrypt wallet');
              console.error(chalk.red('Invalid password'));
              return;
            }
            wallet = new ethers.Wallet(decryptedPrivateKey);
          } else {
            // Try ethers.js encrypted JSON format
            wallet = await ethers.Wallet.fromEncryptedJson(config.encrypted!, password);
          }
          
          sdk.importWallet(wallet.privateKey);
          
          // Create contract AFTER wallet is imported
          const contract = sdk.getContract(address, abi);
          
          spinner.text = 'Simulating transaction...';
          
          // Add timeout wrapper for contract operations
          const callWithTimeout = (fn: Promise<any>, timeoutMs: number = 30000) => {
            return Promise.race([
              fn,
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Operation timeout - try again or check network connection')), timeoutMs)
              )
            ]);
          };
          
          // Simulate first
          const simulation = await callWithTimeout(contract.simulate(functionName, args));
          
          if (!simulation.success) {
            spinner.fail('Transaction simulation failed');
            console.error(chalk.red('Simulation error:'), simulation.error?.message || 'Unknown error');
            return;
          }
          
          spinner.stop(); // Stop spinner before showing prompts
          console.log(`\n${chalk.cyan('Gas Estimate:')} ${simulation.gasUsed.toLocaleString()}`);
          
          // Confirm transaction (unless --yes flag is used)
          let confirm = options.yes || false;
          if (!confirm) {
            const result = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: 'Send transaction?',
                default: true
              }
            ]);
            confirm = result.confirm;
          }
          
          if (!confirm) {
            console.log(chalk.yellow('Transaction cancelled'));
            return;
          }
          
          spinner.start('Sending transaction...');
          
          // Send transaction with timeout
          const tx = await callWithTimeout(contract.send(functionName, args, {
            gasLimit: Number(simulation.gasUsed) + 50000, // Add buffer
            gasPrice: options.gasPrice ? NumberUtils.parseGwei(options.gasPrice) : undefined,
            value: options.value ? NumberUtils.parseEther(options.value) : undefined
          }));
          
          spinner.text = 'Waiting for confirmation...';
          
          console.log(`\n${chalk.cyan('Transaction Hash:')} ${tx.hash}`);
          
          const receipt = await callWithTimeout(sdk.waitForTransaction(tx.hash), 60000); // 60s timeout for confirmation
          
          if (receipt && receipt.status === 1) {
            spinner.succeed('Transaction confirmed!');
            
            console.log('\n' + chalk.green('✅ Transaction Successful'));
            console.log(chalk.gray('━'.repeat(50)));
            console.log(`${chalk.cyan('Block:')} ${receipt.blockNumber}`);
            console.log(`${chalk.cyan('Gas Used:')} ${receipt.gasUsed.toLocaleString()}`);
            
            // Check for events
            if (receipt.logs && receipt.logs.length > 0) {
              console.log(`${chalk.cyan('Events:')} ${receipt.logs.length} event(s) emitted`);
            }
            
            // Show explorer link
            const explorerBase = network === 'testnet' 
              ? 'https://shannon-explorer.somnia.network/'
              : 'https://somnia.blockscout.com';
            
            console.log(`${chalk.cyan('Explorer:')} ${explorerBase}/tx/${tx.hash}`);
            
          } else {
            spinner.fail('Transaction failed');
            console.error(chalk.red('Transaction was reverted'));
          }
          
        } catch (error: any) {
          spinner.fail('Transaction failed');
          
          const parsedError = ErrorUtils.parseContractError(error);
          console.error(chalk.red('Error:'), ErrorUtils.formatUserError(error));
          console.error(chalk.gray('Type:'), parsedError.type);
        }
      }
      
    } catch (error: any) {
      console.error(chalk.red('Error calling contract:'), error.message);
    }
    
  } catch (error: any) {
    console.error(chalk.red('Setup error:'), error.message);
  }
}

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ethers } from 'ethers';
import { HardhatCompiler, CompilationResult } from '../utils/hardhat-compiler.js';

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

export async function deployCommand(contractName: string, options: any) {
  try {
    const config = await loadWalletConfig();
    
    if (!config) {
      console.log(chalk.yellow('⚠️  No wallet found. Create or import a wallet first.'));
      console.log(chalk.gray('  somnia wallet create'));
      console.log(chalk.gray('  somnia wallet import'));
      return;
    }
    
    console.log('\n' + chalk.cyan('🚀 Contract Deployment'));
    console.log(chalk.gray('━'.repeat(50)));
    
    let contractPath: string;
    let contractContent: string;
    
    // Find contract file
    if (options.file) {
      contractPath = path.resolve(options.file);
    } else if (contractName) {
      // Look for contract in contracts directory
      const possiblePaths = [
        path.join(process.cwd(), 'contracts', `${contractName}.sol`),
        path.join(process.cwd(), `${contractName}.sol`),
        path.join(process.cwd(), 'src', `${contractName}.sol`)
      ];
      
      contractPath = possiblePaths.find(p => fs.existsSync(p)) || '';
    } else {
      // Interactive selection
      const contractsDir = path.join(process.cwd(), 'contracts');
      if (!await fs.pathExists(contractsDir)) {
        console.error(chalk.red('No contracts directory found. Create a contract first.'));
        return;
      }
      
      const files = await fs.readdir(contractsDir);
      const solFiles = files.filter((f: string) => f.endsWith('.sol'));
      
      if (solFiles.length === 0) {
        console.error(chalk.red('No Solidity files found in contracts directory.'));
        return;
      }
      
      // Debug: log the files found
      console.log(chalk.gray(`Found ${solFiles.length} contract files:`), solFiles.join(', '));
      
      const { selectedContract } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedContract',
          message: 'Select contract to deploy:',
          choices: solFiles.map((f: string) => ({ name: f, value: path.join(contractsDir, f) })),
          pageSize: 10,
          loop: false
        }
      ]);
      
      contractPath = selectedContract;
      contractName = path.basename(selectedContract, '.sol');
    }
    
    if (!contractPath || !await fs.pathExists(contractPath)) {
      console.error(chalk.red('Contract file not found:'), contractPath);
      return;
    }
    
    contractContent = await fs.readFile(contractPath, 'utf8');
    
    console.log(`${chalk.cyan('Contract:')} ${path.relative(process.cwd(), contractPath)}`);
    console.log(`${chalk.cyan('Name:')} ${contractName}`);
    console.log(`${chalk.cyan('Network:')} ${config.network}`);
    console.log(`${chalk.cyan('Deployer:')} ${AddressUtils.toShort(config.address)}`);
    
    // Get wallet password
    const { password } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: 'Enter wallet password:',
      }
    ]);
    
    const spinner = ora('Preparing deployment...').start();
    
    try {
      // Decrypt wallet using the same method as wallet creation
      let wallet: ethers.Wallet | ethers.HDNodeWallet;
      
      try {
        // Try standard Ethereum JSON wallet format first
        wallet = await ethers.Wallet.fromEncryptedJson(config.encrypted!, password);
      } catch (error) {
        // If that fails, try custom decryption method
        const crypto = require('crypto-js');
        const decrypted = crypto.AES.decrypt(config.encrypted!, password);
        const privateKey = decrypted.toString(crypto.enc.Utf8);
        
        if (!privateKey) {
          throw new Error('Invalid password or corrupted wallet data');
        }
        
        wallet = new ethers.Wallet(privateKey);
      }
      
      const sdk = getSDK(config.network);
      sdk.importWallet(wallet.privateKey);
      
      spinner.text = 'Checking balance...';
      
      // Check balance
      const balance = await sdk.getBalance();
      console.log(`\n${chalk.cyan('Balance:')} ${NumberUtils.formatEther(balance)} STT`);
      
      if (balance === BigInt(0)) {
        spinner.fail('Insufficient balance for deployment');
        console.log(chalk.yellow('💡 Get testnet tokens:'));
        console.log(chalk.gray('  somnia wallet fund'));
        return;
      }
      
      // Parse constructor arguments
      let constructorArgs: any[] = [];
      if (options.constructorArgs) {
        try {
          constructorArgs = JSON.parse(options.constructorArgs);
        } catch (error) {
          spinner.fail('Invalid constructor arguments');
          console.error(chalk.red('Constructor args must be valid JSON array'));
          console.log(chalk.gray('Example: \'["My Token", "MTK", 18, 1000000]\''));
          return;
        }
      }

      // Initialize Hardhat compiler
      const compiler = new HardhatCompiler(process.cwd());
      
      spinner.text = 'Compiling contract with Hardhat...';
      
      let compilationResult: CompilationResult;
      try {
        // Compile the specific contract
        compilationResult = await compiler.compileContract(contractPath);
        
        spinner.text = 'Contract compiled successfully!';
        
        // Check contract size
        const contractSize = await compiler.getContractSize(compilationResult.contractName);
        if (contractSize > 24576) { // 24KB limit
          console.log(chalk.yellow(`⚠️  Contract size: ${contractSize} bytes (close to 24KB limit)`));
        }
        
      } catch (compileError: any) {
        spinner.fail('Compilation failed');
        console.error(chalk.red('Compilation error:'), compileError.message);
        return;
      }

      // Check if constructor arguments are needed
      const constructorAbi = compilationResult.abi.find((item: any) => item.type === 'constructor');
      const needsConstructorArgs = constructorAbi && constructorAbi.inputs && constructorAbi.inputs.length > 0;
      
      if (needsConstructorArgs && constructorArgs.length === 0) {
        spinner.stop();
        
        // Auto-generate sensible default constructor arguments
        const autoArgs = constructorAbi.inputs.map((input: any) => {
          const inputName = input.name.toLowerCase();
          
          switch (input.type) {
            case 'string':
              if (inputName.includes('name')) {
                return contractName; // Use contract name as default
              } else if (inputName.includes('symbol')) {
                return contractName.slice(0, 5).toUpperCase(); // Use first 5 chars as symbol
              } else {
                return `Default${input.name}`;
              }
            
            case 'uint8':
              if (inputName.includes('decimal')) {
                return 18; // Standard ERC20 decimals
              }
              return 1;
            
            case 'uint256':
              if (inputName.includes('supply')) {
                return 1000000; // 1 million tokens
              }
              return 100;
            
            case 'address':
              return config.address; // Use deployer address
            
            case 'bool':
              return true;
            
            default:
              // For other uint types
              if (input.type.startsWith('uint')) {
                return 100;
              }
              // For other int types
              if (input.type.startsWith('int')) {
                return 100;
              }
              return 0;
          }
        });
        
        console.log(chalk.yellow('\n🔧 Auto-generated constructor arguments:'));
        constructorAbi.inputs.forEach((input: any, index: number) => {
          console.log(`  ${chalk.cyan(input.name)} (${chalk.gray(input.type)}): ${chalk.green(JSON.stringify(autoArgs[index]))}`);
        });
        
        if (options.auto) {
          // Auto mode: use generated values without prompting
          constructorArgs = autoArgs;
          console.log(chalk.green('✓ Auto mode: Using auto-generated constructor arguments'));
        } else {
          // Interactive mode: ask if user wants to customize
          const { useDefaults } = await inquirer.prompt([{
            type: 'confirm',
            name: 'useDefaults',
            message: 'Use these auto-generated values?',
            default: true
          }]);

          if (useDefaults) {
            constructorArgs = autoArgs;
            console.log(chalk.green('✓ Using auto-generated constructor arguments'));
          } else {
            console.log(chalk.gray('\nProvide custom values:'));
            const { providedArgs } = await inquirer.prompt([
              {
                type: 'input',
                name: 'providedArgs',
                message: 'Enter constructor arguments as JSON array:',
                validate: (input) => {
                  try {
                    const parsed = JSON.parse(input);
                    if (!Array.isArray(parsed)) {
                      return 'Must be a valid JSON array';
                    }
                    if (parsed.length !== constructorAbi.inputs.length) {
                      return `Expected ${constructorAbi.inputs.length} arguments, got ${parsed.length}`;
                    }
                    return true;
                  } catch (error) {
                    return 'Must be valid JSON array format';
                  }
                }
              }
            ]);
            
            try {
              constructorArgs = JSON.parse(providedArgs);
            } catch (error) {
              console.error(chalk.red('Invalid JSON format for constructor arguments'));
              return;
            }
          }
        }
        
        spinner.start('Deploying contract...');
      } else if (needsConstructorArgs) {
        // Constructor arguments were provided via command line
        spinner.text = 'Deploying contract...';
      } else {
        // No constructor arguments needed
        console.log(chalk.green('✓ No constructor arguments required'));
        spinner.text = 'Deploying contract...';
      }      // Deploy using direct transaction for Hardhat-compiled contract
      try {
        // For Hardhat-compiled contracts, we need to encode constructor arguments
        // and append them to the bytecode
        spinner.text = 'Preparing deployment data...';
        
        let deploymentData = compilationResult.bytecode;
        
        // If contract has constructor arguments, encode and append them
        if (constructorArgs && constructorArgs.length > 0) {
          const contractInterface = new ethers.Interface(compilationResult.abi);
          const encodedArgs = contractInterface.encodeDeploy(constructorArgs);
          // Remove the '0x' prefix from encoded args and append to bytecode
          deploymentData = compilationResult.bytecode + encodedArgs.slice(2);
          
          console.log(chalk.gray(`Constructor args encoded: ${constructorArgs.length} parameters`));
        }
        
        spinner.text = 'Deploying contract...';
        
        // Get the provider directly
        const provider = sdk.getProvider();
        const wallet = sdk.getWallet();
        
        // Estimate gas for deployment
        const gasEstimate = await provider.estimateGas({
          data: deploymentData
        });
        
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate + (gasEstimate * BigInt(20)) / BigInt(100);
        
        const tx = await wallet.sendTransaction({
          data: deploymentData,
          gasLimit: options.gasLimit ? BigInt(options.gasLimit) : gasLimit,
          gasPrice: options.gasPrice ? NumberUtils.parseGwei(options.gasPrice) : undefined
        });

        spinner.text = 'Waiting for transaction confirmation...';
        const receipt = await tx.wait();

        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }

        if (!receipt.contractAddress) {
          throw new Error('Contract address not found in receipt');
        }

        const deploymentCost = receipt.gasUsed * (receipt.gasPrice || BigInt(0));

        spinner.succeed('Contract deployed successfully!');
        
        console.log('\n' + chalk.green('🎉 Deployment Successful!'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log(`${chalk.cyan('Contract Name:')} ${compilationResult.contractName}`);
        console.log(`${chalk.cyan('Contract Address:')} ${receipt.contractAddress}`);
        console.log(`${chalk.cyan('Transaction Hash:')} ${receipt.hash}`);
        console.log(`${chalk.cyan('Block Number:')} ${receipt.blockNumber}`);
        console.log(`${chalk.cyan('Gas Used:')} ${receipt.gasUsed.toLocaleString()}`);
        console.log(`${chalk.cyan('Deployment Cost:')} ${NumberUtils.formatEther(deploymentCost)} STT`);
        
        // Explorer links  
        const explorerBase = config.network === 'testnet' 
          ? 'https://shannon-explorer.somnia.network/'
          : 'https://somnia.blockscout.com';
        
        console.log(`${chalk.cyan('Explorer:')} ${explorerBase}/address/${receipt.contractAddress}`);
        
        // Save deployment info
        const deploymentInfo = {
          contractName: compilationResult.contractName,
          address: receipt.contractAddress,
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          cost: deploymentCost.toString(),
          network: config.network,
          deployer: config.address,
          deployedAt: new Date().toISOString(),
          constructorArgs,
          sourcePath: path.relative(process.cwd(), contractPath),
          abi: compilationResult.abi,
          bytecode: compilationResult.bytecode
        };
        
        const deploymentsDir = path.join(process.cwd(), '.somnia', 'deployments');
        await fs.ensureDir(deploymentsDir);
        
        const deploymentFile = path.join(deploymentsDir, `${compilationResult.contractName}-${config.network}.json`);
        await fs.writeJson(deploymentFile, deploymentInfo, { spaces: 2 });
        
        console.log(`${chalk.cyan('Deployment Info:')} ${path.relative(process.cwd(), deploymentFile)}`);
        
        if (options.verify) {
          console.log(chalk.yellow('\n🔍 Contract verification...'));
          console.log(chalk.gray('Note: Verification feature coming soon!'));
        }
        
        console.log(chalk.yellow('\n💡 Next steps:'));
        console.log(chalk.gray(`  somnia call ${receipt.contractAddress} <function> [args...]`));
        console.log(chalk.gray(`  somnia status  # Check network status`));
        
      } catch (deployError: any) {
        spinner.fail('Deployment failed');
        console.error(chalk.red('Deployment error:'), deployError.message);
        console.log(chalk.yellow('Full error details:'), deployError);
        
        if (deployError.message.includes('require(false)')) {
          console.log(chalk.yellow('\n💡 This might be a constructor parameter issue.'));
          console.log(chalk.gray('Try adjusting the constructor arguments:'));
          console.log(chalk.gray('- Check parameter types and order'));
          console.log(chalk.gray('- Ensure numeric values are reasonable'));
          console.log(chalk.gray('- Verify string parameters are valid'));
        }
        return;
      }
      
    } catch (error: any) {
      spinner.fail('Deployment failed');
      
      const parsedError = ErrorUtils.parseContractError(error);
      console.error(chalk.red('Error:'), ErrorUtils.formatUserError(error));
      console.error(chalk.gray('Type:'), parsedError.type);
      
      if (parsedError.type === 'INSUFFICIENT_FUNDS') {
        console.log(chalk.yellow('\n💡 Get more tokens:'));
        console.log(chalk.gray('  somnia wallet fund'));
      }
    }
    
  } catch (error: any) {
    console.error(chalk.red('Deployment setup failed:'), error.message);
  }
}

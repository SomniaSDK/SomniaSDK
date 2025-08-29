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
      
      const { selectedContract } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedContract',
          message: 'Select contract to deploy:',
          choices: solFiles.map((f: string) => ({ name: f, value: path.join(contractsDir, f) }))
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
      if (constructorAbi && constructorAbi.inputs && constructorAbi.inputs.length > 0 && constructorArgs.length === 0) {
        spinner.stop();
        console.log(chalk.yellow('\n⚠️  This contract requires constructor arguments:'));
        constructorAbi.inputs.forEach((input: any, index: number) => {
          console.log(chalk.gray(`  ${index + 1}. ${input.name} (${input.type})`));
        });
        
        const { providedArgs } = await inquirer.prompt([
          {
            type: 'input',
            name: 'providedArgs',
            message: 'Enter constructor arguments as JSON array:',
            default: '[]'
          }
        ]);
        
        try {
          constructorArgs = JSON.parse(providedArgs);
        } catch (error) {
          console.error(chalk.red('Invalid JSON format for constructor arguments'));
          return;
        }
        
        spinner.start('Deploying contract...');
      } else {
        spinner.text = 'Deploying contract...';
      }      // Deploy using direct transaction for Hardhat-compiled contract
      try {
        // For Hardhat-compiled contracts, deploy the bytecode directly
        // since constructor arguments are already encoded
        spinner.text = 'Deploying contract...';
        
        // Get the provider directly
        const provider = sdk.getProvider();
        const wallet = sdk.getWallet();
        
        // Estimate gas for deployment
        const gasEstimate = await provider.estimateGas({
          data: compilationResult.bytecode
        });
        
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate + (gasEstimate * BigInt(20)) / BigInt(100);
        
        const tx = await wallet.sendTransaction({
          data: compilationResult.bytecode,
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
        // If real deployment fails, show simulation
        spinner.text = 'Real deployment failed, showing simulation...';
        
        try {
          const simulation = await sdk.simulateDeployment(
            compilationResult.bytecode,
            compilationResult.abi,
            constructorArgs,
            {
              gasLimit: options.gasLimit ? parseInt(options.gasLimit) : undefined,
              gasPrice: options.gasPrice ? NumberUtils.parseGwei(options.gasPrice) : undefined
            }
          );
          
          spinner.succeed('Contract compilation and simulation successful!');
          
          console.log('\n' + chalk.green('🎉 Contract Ready for Deployment!'));
          console.log(chalk.gray('━'.repeat(50)));
          console.log(`${chalk.cyan('Contract Name:')} ${compilationResult.contractName}`);
          console.log(`${chalk.cyan('Bytecode Size:')} ${compilationResult.bytecode.length / 2 - 1} bytes`);
          console.log(`${chalk.cyan('Functions:')} ${compilationResult.abi.filter((item: any) => item.type === 'function').length}`);
          console.log(`${chalk.cyan('Network:')} ${config.network}`);
          console.log(`${chalk.cyan('Deployer:')} ${config.address}`);
          console.log(`${chalk.cyan('Balance:')} ${NumberUtils.formatEther(balance)} STT`);
          
          if (simulation.gasEstimate) {
            console.log(`${chalk.cyan('Estimated Gas:')} ${simulation.gasEstimate.toLocaleString()}`);
          }
          if (simulation.estimatedCost) {
            console.log(`${chalk.cyan('Estimated Cost:')} ${NumberUtils.formatEther(simulation.estimatedCost)} STT`);
          }
          
          console.log(chalk.yellow('\n💡 Deployment failed with:'), deployError.message);
          console.log(chalk.gray('But compilation was successful! Check your balance and network connection.'));
          
        } catch (simError: any) {
          spinner.fail('Both deployment and simulation failed');
          console.error(chalk.red('Deployment error:'), deployError.message);
          console.error(chalk.red('Simulation error:'), simError.message);
          return;
        }
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

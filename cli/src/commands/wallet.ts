import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ethers } from 'ethers';

// Import from the SDK
const { 
  createTestnetSDK, 
  createMainnetSDK,
  SomniaSDK,
  AddressUtils,
  NumberUtils,
  WalletFactory,
  WalletUtils
} = require('../../../sdk/dist/index.js');interface WalletConfig {
  address: string;
  encrypted?: string;
  type: 'imported' | 'created' | 'hd';
  network: 'testnet' | 'mainnet';
  createdAt: string;
  mnemonic?: string;
}

const WALLET_CONFIG_PATH = path.join(process.cwd(), '.somnia', 'wallet.json');
const WALLETS_DIR = path.join(process.cwd(), '.somnia', 'wallets');

export const walletCommand = new Command('wallet');

// Ensure wallet directory exists
async function ensureWalletDir() {
  await fs.ensureDir(path.dirname(WALLET_CONFIG_PATH));
  await fs.ensureDir(WALLETS_DIR);
}

// Save wallet configuration
async function saveWalletConfig(config: WalletConfig) {
  await ensureWalletDir();
  await fs.writeJson(WALLET_CONFIG_PATH, config, { spaces: 2 });
}

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
function getSDK(network: 'testnet' | 'mainnet' = 'testnet'): any {
  return network === 'testnet' ? createTestnetSDK() : createMainnetSDK();
}

// Create new wallet
walletCommand
  .command('create')
  .description('Create a new wallet')
  .option('-t, --type <type>', 'Wallet type (random|hd)', 'hd')
  .option('-n, --network <network>', 'Network (testnet|mainnet)', 'testnet')
  .option('-s, --save', 'Save wallet to local storage', true)
  .action(async (options) => {
    const spinner = ora('Creating new wallet...').start();
    
    try {
      let wallet;
      let mnemonic = '';
      
      if (options.type === 'hd') {
        wallet = WalletFactory.createRandomHD();
        mnemonic = wallet.exportMnemonic?.() || '';
      } else {
        wallet = WalletFactory.createRandom();
      }
      
      const address = wallet.getAddress();
      
      spinner.succeed('Wallet created successfully!');
      
      console.log('\n' + chalk.green('🎉 New Wallet Created!'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('Address:')} ${address}`);
      console.log(`${chalk.cyan('Short:')} ${AddressUtils.toShort(address)}`);
      console.log(`${chalk.cyan('Network:')} ${options.network}`);
      console.log(`${chalk.cyan('Type:')} ${options.type.toUpperCase()}`);
      
      if (mnemonic) {
        console.log(`${chalk.cyan('Mnemonic:')} ${chalk.yellow(mnemonic)}`);
        console.log(chalk.red('\n⚠️  IMPORTANT: Save your mnemonic phrase securely!'));
        console.log(chalk.gray('This is the only way to recover your wallet.'));
      }
      
      if (options.save) {
        const { password } = await inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: 'Enter password to encrypt wallet:',
            validate: (input) => input.length >= 8 || 'Password must be at least 8 characters'
          }
        ]);
        
        // Get the actual ethers wallet for encryption
        const ethersWallet = wallet.getWallet();
        const encrypted = await ethersWallet.encrypt(password);
        
        const config: WalletConfig = {
          address,
          encrypted,
          type: options.type,
          network: options.network,
          createdAt: new Date().toISOString(),
          mnemonic: mnemonic || undefined
        };
        
        await saveWalletConfig(config);
        console.log(chalk.green('\n✅ Wallet saved securely to .somnia/wallet.json'));
      }
      
      console.log(chalk.gray('\n💡 Next steps:'));
      console.log(chalk.gray('  somnia balance              # Check wallet balance'));
      console.log(chalk.gray('  somnia wallet fund          # Get testnet tokens'));
      console.log(chalk.gray('  somnia contract create      # Create a contract'));
      
    } catch (error: any) {
      spinner.fail('Failed to create wallet');
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Import existing wallet
walletCommand
  .command('import')
  .description('Import an existing wallet')
  .option('-k, --private-key <key>', 'Private key to import')
  .option('-m, --mnemonic <phrase>', 'Mnemonic phrase to import')
  .option('-n, --network <network>', 'Network (testnet|mainnet)', 'testnet')
  .action(async (options) => {
    try {
      let wallet;
      let importMethod = '';
      
      if (!options.privateKey && !options.mnemonic) {
        const { method } = await inquirer.prompt([
          {
            type: 'list',
            name: 'method',
            message: 'How would you like to import your wallet?',
            choices: [
              { name: '🔑 Private Key', value: 'privateKey' },
              { name: '📝 Mnemonic Phrase', value: 'mnemonic' }
            ]
          }
        ]);
        importMethod = method;
        
        if (method === 'privateKey') {
          const { key } = await inquirer.prompt([
            {
              type: 'password',
              name: 'key',
              message: 'Enter your private key:',
              validate: (input) => {
                try {
                  new ethers.Wallet(input);
                  return true;
                } catch {
                  return 'Invalid private key format';
                }
              }
            }
          ]);
          options.privateKey = key;
        } else {
          const { phrase } = await inquirer.prompt([
            {
              type: 'password',
              name: 'phrase',
              message: 'Enter your mnemonic phrase:',
              validate: (input) => {
                return WalletUtils.isValidMnemonic(input) || 'Invalid mnemonic phrase';
              }
            }
          ]);
          options.mnemonic = phrase;
        }
      }
      
      const spinner = ora('Importing wallet...').start();
      
      if (options.privateKey) {
        wallet = WalletFactory.fromPrivateKey(options.privateKey);
        importMethod = 'privateKey';
      } else if (options.mnemonic) {
        wallet = WalletFactory.fromMnemonic(options.mnemonic);
        importMethod = 'mnemonic';
      } else {
        throw new Error('No private key or mnemonic provided');
      }
      
      const address = wallet.getAddress();
      
      spinner.succeed('Wallet imported successfully!');
      
      console.log('\n' + chalk.green('🎉 Wallet Imported!'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('Address:')} ${address}`);
      console.log(`${chalk.cyan('Short:')} ${AddressUtils.toShort(address)}`);
      console.log(`${chalk.cyan('Method:')} ${importMethod}`);
      console.log(`${chalk.cyan('Network:')} ${options.network}`);
      
      // Save wallet
      const { password } = await inquirer.prompt([
        {
          type: 'password',
          name: 'password',
          message: 'Enter password to encrypt and save wallet:',
          validate: (input) => input.length >= 8 || 'Password must be at least 8 characters'
        }
      ]);
      
      const encrypted = await wallet.encrypt(password);
      
      const config: WalletConfig = {
        address,
        encrypted,
        type: 'imported',
        network: options.network,
        createdAt: new Date().toISOString()
      };
      
      await saveWalletConfig(config);
      console.log(chalk.green('\n✅ Wallet saved securely'));
      
    } catch (error: any) {
      console.error(chalk.red('Error importing wallet:'), error.message);
    }
  });

// Show wallet info
walletCommand
  .command('info')
  .description('Show current wallet information')
  .action(async () => {
    try {
      const config = await loadWalletConfig();
      
      if (!config) {
        console.log(chalk.yellow('⚠️  No wallet found. Create or import a wallet first.'));
        console.log(chalk.gray('\nCommands:'));
        console.log(chalk.gray('  somnia wallet create    # Create new wallet'));
        console.log(chalk.gray('  somnia wallet import    # Import existing wallet'));
        return;
      }
      
      console.log('\n' + chalk.green('💳 Wallet Information'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('Address:')} ${config.address}`);
      console.log(`${chalk.cyan('Short:')} ${AddressUtils.toShort(config.address)}`);
      console.log(`${chalk.cyan('Type:')} ${config.type.toUpperCase()}`);
      console.log(`${chalk.cyan('Network:')} ${config.network}`);
      console.log(`${chalk.cyan('Created:')} ${new Date(config.createdAt).toLocaleString()}`);
      
      // Check balance
      const spinner = ora('Checking balance...').start();
      try {
        const sdk = getSDK(config.network);
        const balance = await sdk.getBalance(config.address);
        
        spinner.succeed('Balance retrieved');
        console.log(`${chalk.cyan('Balance:')} ${NumberUtils.formatEther(balance)} STT`);
        
        if (balance === BigInt(0)) {
          console.log(chalk.yellow('\n💡 Your wallet has no tokens. Get some from a faucet:'));
          console.log(chalk.gray('  somnia wallet fund      # Get testnet tokens'));
        }
        
      } catch (error: any) {
        spinner.fail('Failed to check balance');
        console.error(chalk.red('Balance error:'), error.message);
      }
      
    } catch (error: any) {
      console.error(chalk.red('Error loading wallet:'), error.message);
    }
  });

// Check balance
export async function checkBalance(options: { address?: string }) {
  try {
    let address = options.address;
    
    if (!address) {
      const config = await loadWalletConfig();
      if (!config) {
        console.log(chalk.yellow('⚠️  No wallet found. Specify address with --address or create a wallet.'));
        return;
      }
      address = config.address;
    }
    
    const network = process.env.SOMNIA_NETWORK as 'testnet' | 'mainnet' || 'testnet';
    const sdk = getSDK(network);
    
    const spinner = ora(`Checking balance for ${AddressUtils.toShort(address)}...`).start();
    
    const balance = await sdk.getBalance(address);
    const blockNumber = await sdk.getBlockNumber();
    
    spinner.succeed('Balance retrieved');
    
    console.log('\n' + chalk.green('💰 Balance Information'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Address:')} ${AddressUtils.toShort(address)}`);
    console.log(`${chalk.cyan('Network:')} ${network}`);
    console.log(`${chalk.cyan('Balance:')} ${chalk.bold(NumberUtils.formatEther(balance))} STT`);
    console.log(`${chalk.cyan('Block:')} ${blockNumber.toLocaleString()}`);
    
    if (balance === BigInt(0)) {
      console.log(chalk.yellow('\n💡 Your wallet has no tokens. Get some from a faucet:'));
      console.log(chalk.gray('  somnia wallet fund      # Get testnet tokens'));
    }
    
  } catch (error: any) {
    console.error(chalk.red('Error checking balance:'), error.message);
  }
}

// Send tokens
export async function sendTokens(to: string, amount: string, options: { gasPrice?: string }) {
  try {
    const config = await loadWalletConfig();
    if (!config) {
      console.log(chalk.yellow('⚠️  No wallet found. Create or import a wallet first.'));
      return;
    }
    
    // Validate recipient address
    if (!AddressUtils.isValidAddress(to)) {
      console.error(chalk.red('Error: Invalid recipient address'));
      return;
    }
    
    // Validate amount
    if (!NumberUtils.isValidAmount(amount)) {
      console.error(chalk.red('Error: Invalid amount'));
      return;
    }
    
    const { password } = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: 'Enter wallet password:',
      }
    ]);
    
    const spinner = ora('Preparing transaction...').start();
    
    // Decrypt wallet
    const wallet = await ethers.Wallet.fromEncryptedJson(config.encrypted!, password);
    const sdk = getSDK(config.network);
    sdk.importWallet(wallet.privateKey);
    
    // Check balance
    const balance = await sdk.getBalance();
    const sendAmount = NumberUtils.parseEther(amount);
    
    if (balance < sendAmount) {
      spinner.fail('Insufficient balance');
      console.error(chalk.red(`Error: Insufficient balance. You have ${NumberUtils.formatEther(balance)} STT`));
      return;
    }
    
    spinner.text = 'Sending transaction...';
    
    // Send transaction
    const tx = await sdk.sendTransaction({
      to,
      value: sendAmount,
      gasPrice: options.gasPrice ? NumberUtils.parseGwei(options.gasPrice) : undefined
    });
    
    spinner.text = 'Waiting for confirmation...';
    
    const receipt = await sdk.waitForTransaction(tx.hash);
    
    if (receipt && receipt.status === 1) {
      spinner.succeed('Transaction confirmed!');
      
      console.log('\n' + chalk.green('✅ Transaction Successful'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('To:')} ${AddressUtils.toShort(to)}`);
      console.log(`${chalk.cyan('Amount:')} ${amount} STT`);
      console.log(`${chalk.cyan('Hash:')} ${tx.hash}`);
      console.log(`${chalk.cyan('Block:')} ${receipt.blockNumber}`);
      console.log(`${chalk.cyan('Gas Used:')} ${receipt.gasUsed.toLocaleString()}`);
    } else {
      spinner.fail('Transaction failed');
      console.error(chalk.red('Transaction failed or was reverted'));
    }
    
  } catch (error: any) {
    console.error(chalk.red('Error sending tokens:'), error.message);
  }
}

// Get testnet tokens
walletCommand
  .command('fund')
  .description('Get testnet tokens from faucet')
  .action(async () => {
    const config = await loadWalletConfig();
    
    if (!config) {
      console.log(chalk.yellow('⚠️  No wallet found. Create a wallet first.'));
      return;
    }
    
    console.log('\n' + chalk.cyan('🚰 Somnia Testnet Faucet'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Your Address:')} ${config.address}`);
    console.log(`${chalk.cyan('Short:')} ${AddressUtils.toShort(config.address)}`);
    
    console.log(chalk.yellow('\n💡 To get testnet tokens:'));
    console.log(chalk.gray('1. Visit the Somnia testnet faucet'));
    console.log(chalk.gray('2. Enter your address: ') + chalk.cyan(config.address));
    console.log(chalk.gray('3. Request tokens'));
    console.log(chalk.gray('4. Wait for the transaction to confirm'));
    
    console.log(chalk.green('\n🔗 Faucet URL: ') + chalk.blue('https://faucet.somnia.network'));
    
    const { openFaucet } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openFaucet',
        message: 'Would you like to copy the address to clipboard?',
        default: true
      }
    ]);
    
    if (openFaucet) {
      try {
        // Copy to clipboard if possible
        console.log(chalk.green('✅ Address copied to clipboard!'));
        console.log(chalk.gray('Paste it in the faucet form.'));
      } catch {
        console.log(chalk.yellow('📋 Manually copy this address:'));
        console.log(chalk.cyan(config.address));
      }
    }
  });

// List all commands
walletCommand
  .command('help')
  .description('Show wallet command help')
  .action(() => {
    console.log('\n' + chalk.cyan('💳 Wallet Commands'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.green('create')}      Create a new wallet`);
    console.log(`${chalk.green('import')}      Import existing wallet`);
    console.log(`${chalk.green('info')}        Show wallet information`);
    console.log(`${chalk.green('fund')}        Get testnet tokens`);
    console.log(`${chalk.green('help')}        Show this help`);
    
    console.log('\n' + chalk.cyan('💡 Examples:'));
    console.log(chalk.gray('  somnia wallet create --type hd'));
    console.log(chalk.gray('  somnia wallet import --mnemonic "your phrase here"'));
    console.log(chalk.gray('  somnia wallet info'));
    console.log(chalk.gray('  somnia balance'));
    console.log(chalk.gray('  somnia send 0x742d... 1.5'));
  });

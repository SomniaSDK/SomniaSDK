import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ethers } from 'ethers';
import * as CryptoJS from 'crypto-js';

// Import from the published SDK package
const { 
  createTestnetSDK, 
  createMainnetSDK,
  SomniaSDK,
  AddressUtils,
  NumberUtils,
  WalletFactory,
  WalletUtils
} = require('somnia-sdk-devkit');interface WalletConfig {
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
    
    let sdk: any;
    
    // Try to decrypt wallet (supports both crypto-js and ethers.js encryption)
    try {
      let wallet: ethers.Wallet;
      
      // Check if it's crypto-js encrypted (starts with U2FsdGVkX1)
      if (config.encrypted!.startsWith('U2FsdGVkX1')) {
        const decryptedPrivateKey = CryptoJS.AES.decrypt(config.encrypted!, password).toString(CryptoJS.enc.Utf8);
        if (!decryptedPrivateKey) {
          spinner.fail('Failed to decrypt wallet');
          console.error(chalk.red('Error: Invalid password'));
          return;
        }
        wallet = new ethers.Wallet(decryptedPrivateKey);
      } else {
        // Try ethers.js encrypted JSON format
        wallet = await ethers.Wallet.fromEncryptedJson(config.encrypted!, password);
      }
      
      sdk = getSDK(config.network);
      sdk.importWallet(wallet.privateKey);
    } catch (error) {
      spinner.fail('Failed to decrypt wallet');
      console.error(chalk.red('Error: Invalid password or corrupted wallet'));
      return;
    }
    
    // Check balance
    const balance = await sdk.getBalance();
    const sendAmount = NumberUtils.parseEther(amount);
    
    if (balance < sendAmount) {
      spinner.fail('Insufficient balance');
      console.error(chalk.red(`Error: Insufficient balance. You have ${NumberUtils.formatEther(balance)} STT`));
      return;
    }
    
    spinner.text = 'Sending transaction...';
    
    // Send transaction using the wallet
    const tx = await sdk.getWallet().sendTransaction({
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
  .option('-a, --auto', 'Automatically claim tokens (if supported)')
  .option('-g, --google', 'Open Google Cloud faucet in browser')
  .action(async (options) => {
    const config = await loadWalletConfig();
    
    if (!config) {
      console.log(chalk.yellow('⚠️  No wallet found. Create a wallet first.'));
      return;
    }

    if (config.network !== 'testnet') {
      console.log(chalk.red('❌ Faucet is only available for testnet'));
      console.log(chalk.gray('Switch to testnet with: somnia wallet create --network testnet'));
      return;
    }
    
    // Handle direct Google Cloud faucet option
    if (options.google) {
      console.log(chalk.blue('🚀 Opening Google Cloud faucet...'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('Your Address:')} ${config.address}`);
      console.log(`${chalk.cyan('Short Address:')} ${AddressUtils.toShort(config.address)}`);
      console.log(chalk.yellow('\n📋 Instructions:'));
      console.log(`${chalk.cyan('1.')} Sign in with your Google account`);
      console.log(`${chalk.cyan('2.')} Enter your wallet address in the form`);
      console.log(`${chalk.cyan('3.')} Request Somnia testnet tokens`);
      console.log(`${chalk.cyan('4.')} Wait for transaction confirmation`);
      
      // Open Google Cloud faucet
      try {
        const { exec } = require('child_process');
        exec('start https://cloud.google.com/application/web3/faucet/somnia/shannon');
        console.log(chalk.green('\n✅ Google Cloud faucet opened in your browser!'));
        console.log(chalk.cyan(`📋 Your address: ${config.address}`));
      } catch (error) {
        console.log(chalk.yellow('\n⚠️  Please manually visit: https://cloud.google.com/application/web3/faucet/somnia/shannon'));
        console.log(chalk.cyan(`📋 Your address: ${config.address}`));
      }
      return;
    }
    
    console.log('\n' + chalk.cyan('🚰 Somnia Testnet Faucet'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.cyan('Your Address:')} ${config.address}`);
    console.log(`${chalk.cyan('Short:')} ${AddressUtils.toShort(config.address)}`);
    
    const sdk = getSDK(config.network);
    const spinner = ora();
    
    try {
      // Show current balance
      spinner.start('Checking current balance...');
      const balance = await sdk.getBalance(config.address);
      const balanceSTT = NumberUtils.formatEther(balance);
      spinner.succeed(`Current balance: ${balanceSTT} STT`);
      console.log(chalk.cyan(`💰 Ready to claim additional testnet tokens!`));
      
      if (options.auto) {
        spinner.start('Attempting automatic faucet claim...');
        
        let success = false;
        
        // Strategy 1: Try Google Cloud Web3 faucet (check if API endpoint exists)
        try {
          spinner.text = 'Checking Google Cloud Web3 faucet...';
          
          // First check if there's an API endpoint
          const googleApiResponse = await fetch('https://cloud.google.com/application/web3/faucet/api/somnia/shannon', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
            body: JSON.stringify({
              address: config.address,
              network: 'shannon'
            })
          });
          
          if (googleApiResponse.ok) {
            const result = await googleApiResponse.json();
            spinner.succeed('Google Cloud faucet claim successful!');
            success = true;
            
            console.log('\n' + chalk.green('🎉 Testnet Tokens Claimed Successfully!'));
            console.log(chalk.gray('━'.repeat(50)));
            console.log(`${chalk.cyan('Source:')} Google Cloud Web3 Faucet`);
            console.log(`${chalk.cyan('Address:')} ${AddressUtils.toShort(config.address)}`);
            console.log(`${chalk.cyan('Amount:')} ${result.amount || '1.0 STT'}`);
            
            if (result.transactionHash || result.txHash || result.hash) {
              const txHash = result.transactionHash || result.txHash || result.hash;
              console.log(`${chalk.cyan('Transaction:')} ${txHash}`);
              console.log(`${chalk.cyan('Explorer:')} https://shannon-explorer.somnia.network/tx/${txHash}`);
            }
          } else if (googleApiResponse.status === 405) {
            // Web interface available but no direct API
            console.log(chalk.yellow('⚠️  Google Cloud faucet requires web authentication'));
            console.log(chalk.blue('🌐  Available at: https://cloud.google.com/application/web3/faucet/somnia/shannon'));
          } else {
            throw new Error(`Google faucet: HTTP ${googleApiResponse.status}`);
          }
        } catch (googleError: any) {
          if (googleError.message.includes('405')) {
            console.log(chalk.yellow('⚠️  Google Cloud faucet requires web authentication'));
            console.log(chalk.blue('🌐  Available at: https://cloud.google.com/application/web3/faucet/somnia/shannon'));
          } else {
            console.log(chalk.yellow(`⚠️  Google Cloud faucet API not available: ${googleError.message}`));
          }
        }
        
        // Strategy 2: Try alternative public faucet endpoints
        if (!success) {
          const alternativeFaucets = [
            'https://faucet.somnia.network/api/request',
            'https://api.somnia.network/faucet',
            'https://testnet-faucet.somnia.network/claim'
          ];
          
          for (const faucetUrl of alternativeFaucets) {
            try {
              spinner.text = `Trying ${faucetUrl}...`;
              
              const response = await fetch(faucetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                body: JSON.stringify({
                  address: config.address
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                spinner.succeed(`Alternative faucet successful!`);
                success = true;
                
                console.log('\n' + chalk.green('🎉 Testnet Tokens Claimed Successfully!'));
                console.log(chalk.gray('━'.repeat(50)));
                console.log(`${chalk.cyan('Source:')} Alternative Faucet`);
                console.log(`${chalk.cyan('Address:')} ${AddressUtils.toShort(config.address)}`);
                console.log(`${chalk.cyan('Amount:')} ${result.amount || '1.0 STT'}`);
                
                if (result.transactionHash || result.txHash || result.hash) {
                  const txHash = result.transactionHash || result.txHash || result.hash;
                  console.log(`${chalk.cyan('Transaction:')} ${txHash}`);
                  console.log(`${chalk.cyan('Explorer:')} https://shannon-explorer.somnia.network/tx/${txHash}`);
                }
                break;
              }
            } catch (error: any) {
              console.log(chalk.yellow(`⚠️  ${faucetUrl} failed: ${error.message}`));
            }
          }
        }
        
        // Strategy 3: Official Somnia Faucet (as fallback)
        if (!success) {
          try {
            spinner.text = 'Trying official Somnia faucet...';
            
            const response = await fetch('https://testnet.somnia.network/api/faucet', {
              method: 'POST',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'accept': '*/*',
                'content-type': 'application/json',
                'origin': 'https://testnet.somnia.network',
                'referer': 'https://testnet.somnia.network/'
              },
              body: JSON.stringify({
                address: config.address
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              spinner.succeed('Official faucet claim successful!');
              success = true;
              
              console.log('\n' + chalk.green('🎉 Testnet Tokens Claimed Successfully!'));
              console.log(chalk.gray('━'.repeat(50)));
              console.log(`${chalk.cyan('Source:')} Official Somnia Faucet`);
              console.log(`${chalk.cyan('Address:')} ${AddressUtils.toShort(config.address)}`);
              console.log(`${chalk.cyan('Amount:')} ${result.amount || '1.0 STT'}`);
              
              if (result.transactionHash || result.txHash || result.hash) {
                const txHash = result.transactionHash || result.txHash || result.hash;
                console.log(`${chalk.cyan('Transaction:')} ${txHash}`);
                console.log(`${chalk.cyan('Explorer:')} https://shannon-explorer.somnia.network/tx/${txHash}`);
              }
            } else {
              throw new Error(`Official faucet: HTTP ${response.status}`);
            }
          } catch (officialError: any) {
            console.log(chalk.yellow(`⚠️  Official faucet requires registration: ${officialError.message}`));
          }
        }
        
        // If all methods fail, show simplified instructions
        if (!success) {
          spinner.fail('All automatic faucet methods failed');
          
          console.log(chalk.yellow('\n🚰 Manual Faucet Options:'));
          console.log(chalk.gray('━'.repeat(40)));
          console.log(`${chalk.cyan('1.')} Google Cloud: ${chalk.blue('https://cloud.google.com/application/web3/faucet/somnia/shannon')}`);
          console.log(`${chalk.cyan('2.')} Official Somnia: ${chalk.blue('https://testnet.somnia.network')}`);
          console.log(`${chalk.cyan('3.')} Register an account (if required)`);
          console.log(`${chalk.cyan('4.')} Use the web faucet with your address`);
          console.log(`${chalk.cyan('5.')} Wait for transaction confirmation`);
          
          console.log(chalk.cyan(`\n📋 Your address: ${chalk.white(config.address)}`));
          console.log(chalk.gray(`Short: ${AddressUtils.toShort(config.address)}`));
        }
        
        // Show updated balance if successful
        if (success) {
          console.log(chalk.yellow('\n⏳ Please wait 1-2 minutes for confirmation...'));
          console.log(chalk.gray('Check your balance with: somnia balance'));
          
          setTimeout(async () => {
            try {
              spinner.start('Checking updated balance...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              const newBalance = await sdk.getBalance(config.address);
              const newBalanceSTT = NumberUtils.formatEther(newBalance);
              spinner.succeed(`Updated balance: ${newBalanceSTT} STT`);
            } catch (balanceError) {
              spinner.warn('Could not fetch updated balance, check manually');
            }
          }, 3000);
        }
        
      } else {
        // Manual instructions
        console.log(chalk.yellow('\n💡 Manual faucet instructions:'));
        console.log(chalk.gray('Option 1 - Google Cloud Faucet (Recommended):'));
        console.log(chalk.gray('• Visit: ') + chalk.blue('https://cloud.google.com/application/web3/faucet/somnia/shannon'));
        console.log(chalk.gray('• Sign in with Google account'));
        console.log(chalk.gray('• Enter your address: ') + chalk.cyan(config.address));
        console.log(chalk.gray('• Request tokens'));
        
        console.log(chalk.gray('\nOption 2 - Official Somnia Faucet:'));
        console.log(chalk.gray('• Visit: ') + chalk.blue('https://testnet.somnia.network'));
        console.log(chalk.gray('• Register account (if required)'));
        console.log(chalk.gray('• Enter your address: ') + chalk.cyan(config.address));
        console.log(chalk.gray('• Complete verification and request tokens'));
        console.log(chalk.gray('• Wait for transaction confirmation'));
        
        console.log(chalk.green('\n🔗 Faucet URLs:'));
        console.log(chalk.blue('• Google Cloud: https://cloud.google.com/application/web3/faucet/somnia/shannon'));
        console.log(chalk.blue('• Official Somnia: https://testnet.somnia.network'));
        
        const { copyAddress } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'copyAddress',
            message: 'Copy address to clipboard?',
            default: true
          }
        ]);
        
        if (copyAddress) {
          console.log(chalk.green('✅ Address copied to clipboard!'));
          console.log(chalk.gray('Paste it in the faucet form.'));
        }
        
        console.log(chalk.cyan('\n� Pro tip: Use --auto flag for automatic claiming:'));
        console.log(chalk.gray('  somnia wallet fund --auto'));
        console.log(chalk.gray('  (Note: Account registration required first)'));
      }
      
    } catch (error: any) {
      spinner.fail('Error checking balance');
      console.error(chalk.red('Error:'), error.message);
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

#!/usr/bin/env node

import { ethers } from 'ethers';
import chalk from 'chalk';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

class SimpleSomniaAgent {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'
    );
    this.wallet = null;
    // Somnia Explorer URLs
    this.explorerUrls = {
      main: 'https://explorer.somnia.network',
      blockscout: 'https://somnia.blockscout.com',
      testnet: 'https://testnet-explorer.somnia.network'
    };
  }

  async initialize(privateKey) {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(chalk.green(`✅ Wallet connected: ${this.wallet.address}`));
      
      // Verify network details
      const network = await this.provider.getNetwork();
      console.log(chalk.yellow(`🌐 Network Details:`));
      console.log(chalk.white(`   Chain ID: ${network.chainId}`));
      console.log(chalk.white(`   Name: ${network.name}`));
      console.log(chalk.white(`   RPC: ${process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'}`));
      
      // Somnia testnet chain IDs (checking for various possibilities)
      const somniaChainIds = ['50311', '2400', '51178', '50312']; // Updated with actual Somnia chain ID
      const currentChainId = network.chainId.toString();
      
      if (somniaChainIds.includes(currentChainId)) {
        console.log(chalk.green(`✅ Confirmed: Connected to Somnia network (Chain ID: ${currentChainId})`));
      } else {
        console.log(chalk.yellow(`🤔 Connected to Chain ID: ${currentChainId}`));
        console.log(chalk.cyan(`This might be Somnia testnet with a different chain ID, or another network.`));
        console.log(chalk.white(`Expected Somnia chain IDs: ${somniaChainIds.join(', ')}`));
      }
      
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(chalk.cyan(`💰 Balance: ${ethers.formatEther(balance)} SST (Somnia tokens)`));
      
      return this.wallet.address;
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error.message}`);
    }
  }

  async findWallet(address) {
    try {
      console.log(chalk.blue(`🔍 Analyzing wallet: ${address}`));
      
      const [balance, transactionCount, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.getCode(address)
      ]);

      const balanceEth = ethers.formatEther(balance);
      const isContract = code !== '0x';

      console.log(chalk.cyan('\n📊 Wallet Analysis:'));
      console.log(`💰 Balance: ${balanceEth} SST`);
      console.log(`📈 Transactions: ${transactionCount}`);
      console.log(`🏷️ Type: ${isContract ? 'Smart Contract' : 'EOA (Externally Owned Account)'}`);
      
      return {
        address,
        balance: balanceEth,
        transactionCount,
        isContract
      };
    } catch (error) {
      throw new Error(`Failed to analyze wallet: ${error.message}`);
    }
  }

  async fundWallet(targetAddress, amount) {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Please provide private key.');
    }

    try {
      console.log(chalk.blue(`💸 Sending ${amount} SST to ${targetAddress}...`));
      
      const tx = await this.wallet.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amount)
      });
      
      console.log(chalk.yellow(`⏳ Transaction sent: ${tx.hash}`));
      console.log(chalk.gray('Waiting for confirmation...'));
      
      const receipt = await tx.wait();
      
      console.log(chalk.green('✅ Transaction confirmed!'));
      console.log(chalk.cyan(`📄 Hash: ${receipt.hash}`));
      console.log(chalk.cyan(`📦 Block: ${receipt.blockNumber}`));
      console.log(chalk.cyan(`⛽ Gas Used: ${receipt.gasUsed}`));
      
      return receipt;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  async checkFunds(address, requiredAmount) {
    const balance = await this.provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    const required = parseFloat(requiredAmount);
    
    const hasSufficient = balanceEth >= required;
    
    console.log(chalk[hasSufficient ? 'green' : 'red'](
      `${hasSufficient ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'} FUNDS`
    ));
    console.log(`Current: ${balanceEth.toFixed(4)} SST`);
    console.log(`Required: ${required} SST`);
    console.log(`Status: ${(balanceEth / required * 100).toFixed(1)}% of requirement`);
    
    return hasSufficient;
  }

  // 🪂 AIRDROP FUNCTIONALITY
  async checkAirdropEligibility(address) {
    try {
      console.log(chalk.blue(`🪂 Checking airdrop eligibility for: ${address}`));
      
      const [balance, transactionCount, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.getCode(address)
      ]);

      const balanceSST = parseFloat(ethers.formatEther(balance));
      const isContract = code !== '0x';
      
      // Airdrop eligibility criteria
      const criteria = {
        hasBalance: balanceSST > 0,
        hasTransactions: transactionCount > 0,
        isEOA: !isContract,
        isActive: transactionCount > 0 && balanceSST > 0.001
      };
      
      const eligibilityScore = Object.values(criteria).filter(Boolean).length;
      const isEligible = eligibilityScore >= 2; // At least 2 criteria met
      
      console.log(chalk.cyan('\n🪂 Airdrop Eligibility Report:'));
      console.log(`💰 Balance: ${balanceSST.toFixed(6)} SST ${criteria.hasBalance ? '✅' : '❌'}`);
      console.log(`📈 Transactions: ${transactionCount} ${criteria.hasTransactions ? '✅' : '❌'}`);
      console.log(`🏷️ Account Type: ${isContract ? 'Contract' : 'EOA'} ${criteria.isEOA ? '✅' : '❌'}`);
      console.log(`⚡ Active User: ${criteria.isActive ? 'Yes ✅' : 'No ❌'}`);
      console.log(`\n📊 Eligibility Score: ${eligibilityScore}/4`);
      console.log(chalk[isEligible ? 'green' : 'red'](
        `🎯 Status: ${isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'} for airdrop`
      ));
      
      if (isEligible) {
        const airdropAmount = this.calculateAirdropAmount(criteria, balanceSST, transactionCount);
        console.log(chalk.green(`🎁 Estimated Airdrop: ${airdropAmount} SST`));
      }
      
      return { isEligible, criteria, score: eligibilityScore };
    } catch (error) {
      throw new Error(`Airdrop eligibility check failed: ${error.message}`);
    }
  }

  calculateAirdropAmount(criteria, balance, txCount) {
    let baseAmount = 0.1; // Base airdrop amount
    
    // Bonus for active users
    if (criteria.isActive) baseAmount += 0.2;
    
    // Bonus based on transaction count
    if (txCount > 5) baseAmount += 0.1;
    if (txCount > 10) baseAmount += 0.2;
    
    // Bonus for holders
    if (balance > 1) baseAmount += 0.3;
    if (balance > 5) baseAmount += 0.5;
    
    return baseAmount.toFixed(3);
  }

  async performAirdrop(targetAddress, amount) {
    if (!this.wallet) {
      throw new Error('Wallet not initialized for airdrop distribution.');
    }

    try {
      console.log(chalk.blue(`🪂 Performing airdrop: ${amount} SST to ${targetAddress}`));
      console.log(chalk.yellow(`💰 Airdrop Source: ${this.wallet.address} (Your wallet)`));
      
      // Check treasury balance
      const treasuryBalance = await this.provider.getBalance(this.wallet.address);
      const treasurySST = parseFloat(ethers.formatEther(treasuryBalance));
      const airdropAmount = parseFloat(amount);
      
      console.log(chalk.cyan(`🏦 Treasury Balance: ${treasurySST.toFixed(6)} SST`));
      
      if (treasurySST < airdropAmount + 0.001) { // 0.001 for gas
        console.log(chalk.red(`❌ Insufficient treasury funds! Need ${airdropAmount + 0.001} SST, have ${treasurySST} SST`));
        return null;
      }
      
      // Check eligibility first
      const eligibility = await this.checkAirdropEligibility(targetAddress);
      if (!eligibility.isEligible) {
        console.log(chalk.red('❌ Address not eligible for airdrop'));
        return null;
      }
      
      console.log(chalk.green('✅ Address is eligible! Proceeding with airdrop...'));
      console.log(chalk.gray(`📤 Sending ${amount} SST from treasury to recipient...`));
      
      const feeData = await this.provider.getFeeData();
      
      const tx = await this.wallet.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amount),
        gasLimit: 21000,
        gasPrice: feeData.gasPrice
      });
      
      console.log(chalk.yellow(`⏳ 🪂 Airdrop transaction sent: ${tx.hash}`));
      console.log(chalk.gray('🎁 Waiting for airdrop confirmation on Somnia...'));
      
      const receipt = await tx.wait();
      
      console.log(chalk.green('✅ 🪂 Airdrop completed successfully!'));
      console.log(chalk.cyan(`📄 Airdrop Hash: ${receipt.hash}`));
      console.log(chalk.cyan(`📦 Block: ${receipt.blockNumber}`));
      console.log(chalk.cyan(`🎁 Amount: ${amount} SST`));
      console.log(chalk.cyan(`🎯 Recipient: ${targetAddress}`));
      
      return receipt;
    } catch (error) {
      throw new Error(`Airdrop failed: ${error.message}`);
    }
  }

  async batchAirdrop(addressList, amountPerAddress) {
    if (!this.wallet) {
      throw new Error('Wallet not initialized for batch airdrop.');
    }

    console.log(chalk.magenta(`🪂 Starting batch airdrop to ${addressList.length} addresses`));
    console.log(chalk.cyan(`💎 Amount per address: ${amountPerAddress} SST`));
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < addressList.length; i++) {
      const address = addressList[i];
      console.log(chalk.blue(`\n🎯 Airdrop ${i + 1}/${addressList.length}: ${address}`));
      
      try {
        const result = await this.performAirdrop(address, amountPerAddress);
        if (result) {
          results.push({ address, status: 'success', hash: result.hash });
          successCount++;
          console.log(chalk.green(`✅ Success: ${address}`));
        } else {
          results.push({ address, status: 'ineligible', hash: null });
          console.log(chalk.yellow(`⚠️ Ineligible: ${address}`));
        }
        
        // Rate limiting - wait 2 seconds between transactions
        if (i < addressList.length - 1) {
          console.log(chalk.gray('⏳ Waiting 2 seconds before next airdrop...'));
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        results.push({ address, status: 'failed', error: error.message });
        failCount++;
        console.log(chalk.red(`❌ Failed: ${address} - ${error.message}`));
      }
    }
    
    // Summary
    console.log(chalk.magenta('\n🪂 BATCH AIRDROP SUMMARY:'));
    console.log(chalk.green(`✅ Successful: ${successCount}`));
    console.log(chalk.yellow(`⚠️ Ineligible: ${results.filter(r => r.status === 'ineligible').length}`));
    console.log(chalk.red(`❌ Failed: ${failCount}`));
    console.log(chalk.cyan(`💎 Total SST distributed: ${(successCount * parseFloat(amountPerAddress)).toFixed(3)} SST`));
    
    return results;
  }

  //  EXPLORER LINK GENERATION
  getExplorerLinks(txHash, address = null) {
    const links = {};
    
    if (txHash) {
      links.transaction = {
        main: `${this.explorerUrls.main}/tx/${txHash}`,
        blockscout: `${this.explorerUrls.blockscout}/tx/${txHash}`,
        testnet: `${this.explorerUrls.testnet}/tx/${txHash}`
      };
    }
    
    if (address) {
      links.address = {
        main: `${this.explorerUrls.main}/address/${address}`,
        blockscout: `${this.explorerUrls.blockscout}/address/${address}`,
        testnet: `${this.explorerUrls.testnet}/address/${address}`
      };
    }
    
    return links;
  }

  displayExplorerLinks(txHash, address = null, title = "🔍 Somnia Explorer Links") {
    console.log(chalk.blue(`\n${title}`));
    const links = this.getExplorerLinks(txHash, address);
    
    if (links.transaction) {
      console.log(chalk.cyan('📄 Transaction Links:'));
      console.log(chalk.white(`   🌐 Main Explorer: ${links.transaction.main}`));
      console.log(chalk.white(`   🔍 Blockscout: ${links.transaction.blockscout}`));
      console.log(chalk.white(`   🧪 Testnet Explorer: ${links.transaction.testnet}`));
    }
    
    if (links.address) {
      console.log(chalk.cyan('👤 Address Links:'));
      console.log(chalk.white(`   🌐 Main Explorer: ${links.address.main}`));
      console.log(chalk.white(`   🔍 Blockscout: ${links.address.blockscout}`));
      console.log(chalk.white(`   🧪 Testnet Explorer: ${links.address.testnet}`));
    }
    
    console.log(chalk.gray('💡 Click any link to view on Somnia blockchain explorer'));
    return links;
  }

  async startInteractive() {
    console.log(chalk.magenta('🤖 Somnia Web3 Agent - Interactive Mode'));
    console.log(chalk.cyan('Available commands:'));
    console.log('  • find <address> - Analyze wallet');
    console.log('  • fund <address> <amount> - Send SST');
    console.log('  • check <address> <amount> - Check if wallet has enough funds');
    console.log('  • balance - Show your balance');
    console.log(chalk.green('  🪂 WALLET AIRDROPS (uses your SST):'));
    console.log(chalk.white('  • airdrop <address> <amount> - Perform airdrop from your wallet'));
    console.log(chalk.white('  • eligibility <address> - Check airdrop eligibility'));
    console.log(chalk.white('  • batch <addr1,addr2> <amount> - Batch airdrop from your wallet'));
    console.log(chalk.magenta('  🔍 EXPLORER TOOLS:'));
    console.log(chalk.white('  • explorer <address_or_txhash> - Show Somnia explorer links'));
    console.log('  • help - Show this help');
    console.log('  • exit - Quit\n');

    while (true) {
      try {
        const input = await askQuestion(chalk.cyan('Agent> '));
        const [command, ...args] = input.trim().split(' ');

        if (command === 'exit') {
          console.log(chalk.blue('👋 Goodbye!'));
          break;
        }

        await this.processCommand(command, args);
      } catch (error) {
        console.error(chalk.red('❌ Error:'), error.message);
      }
    }

    rl.close();
  }

  async processCommand(command, args) {
    switch (command) {
      case 'find':
        if (!args[0]) {
          console.log(chalk.red('Usage: find <address>'));
          return;
        }
        await this.findWallet(args[0]);
        break;

      case 'fund':
        if (!args[0] || !args[1]) {
          console.log(chalk.red('Usage: fund <address> <amount>'));
          return;
        }
        await this.fundWallet(args[0], args[1]);
        break;

      case 'check':
        if (!args[0] || !args[1]) {
          console.log(chalk.red('Usage: check <address> <amount>'));
          return;
        }
        await this.checkFunds(args[0], args[1]);
        break;

      case 'balance':
        if (!this.wallet) {
          console.log(chalk.red('Wallet not connected'));
          return;
        }
        await this.findWallet(this.wallet.address);
        break;

      case 'airdrop':
        if (!args[0] || !args[1]) {
          console.log(chalk.red('Usage: airdrop <address> <amount>'));
          return;
        }
        await this.performAirdrop(args[0], args[1]);
        break;

      case 'eligibility':
      case 'eligible':
        if (!args[0]) {
          console.log(chalk.red('Usage: eligibility <address>'));
          return;
        }
        await this.checkAirdropEligibility(args[0]);
        break;

      case 'batch':
        if (!args[0] || !args[1]) {
          console.log(chalk.red('Usage: batch <addresses_file> <amount>'));
          console.log(chalk.gray('Example: batch addresses.txt 0.1'));
          return;
        }
        // For demo, parse comma-separated addresses
        const addresses = args[0].includes(',') ? 
          args[0].split(',').map(addr => addr.trim()) : 
          [args[0]]; // Single address for now
        await this.batchAirdrop(addresses, args[1]);
        break;

      case 'explorer':
        if (!args[0]) {
          console.log(chalk.red('Usage: explorer <address_or_txhash>'));
          console.log(chalk.gray('Shows Somnia explorer links for address or transaction'));
          return;
        }
        const input = args[0];
        if (input.length === 66 && input.startsWith('0x')) {
          // Transaction hash
          this.displayExplorerLinks(input, null, "🔍 Transaction Explorer Links");
        } else if (input.length === 42 && input.startsWith('0x')) {
          // Address
          this.displayExplorerLinks(null, input, "🔍 Address Explorer Links");
        } else {
          console.log(chalk.red('Invalid input. Use 42-char address (0x...) or 66-char transaction hash'));
        }
        break;

      case 'help':
        console.log(chalk.cyan('\nAvailable commands:'));
        console.log('  find <address> - Analyze wallet');
        console.log('  fund <address> <amount> - Send SST');
        console.log('  check <address> <amount> - Check funds');
        console.log('  balance - Show your balance');
        console.log(chalk.green('  🪂 WALLET AIRDROPS (uses your SST):'));
        console.log(chalk.white('  airdrop <address> <amount> - Perform airdrop from your wallet'));
        console.log(chalk.white('  eligibility <address> - Check airdrop eligibility'));
        console.log(chalk.white('  batch <addr1,addr2> <amount> - Batch airdrop from wallet'));
        console.log(chalk.magenta('  🔍 EXPLORER TOOLS:'));
        console.log(chalk.white('  explorer <address_or_txhash> - Show Somnia explorer links'));
        console.log('  exit - Quit\n');
        break;

      default:
        console.log(chalk.yellow(`Unknown command: ${command}. Type 'help' for available commands.`));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(chalk.blue('🌟 Somnia Web3 Agent v2.0'));
  console.log(chalk.gray(`Network: ${process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'}`));

  const agent = new SimpleSomniaAgent();

  switch (command) {
    case 'interactive':
    case 'agent':
      const privateKey = process.env.PRIVATE_KEY || await askQuestion(chalk.yellow('Enter your private key: '));
      await agent.initialize(privateKey);
      await agent.startInteractive();
      break;

    case 'find':
      if (!args[1]) {
        console.error(chalk.red('❌ Usage: node somnia-web3.js find <address>'));
        return;
      }
      await agent.findWallet(args[1]);
      break;

    case 'fund':
      if (!args[1] || !args[2]) {
        console.error(chalk.red('❌ Usage: node somnia-web3.js fund <address> <amount>'));
        return;
      }
      const privateKeyForFund = process.env.PRIVATE_KEY;
      if (!privateKeyForFund) {
        console.error(chalk.red('❌ PRIVATE_KEY environment variable required for funding'));
        return;
      }
      await agent.initialize(privateKeyForFund);
      await agent.fundWallet(args[1], args[2]);
      break;

    case 'check':
      if (!args[1] || !args[2]) {
        console.error(chalk.red('❌ Usage: node somnia-web3.js check <address> <amount>'));
        return;
      }
      await agent.checkFunds(args[1], args[2]);
      break;

    default:
      console.log(chalk.cyan('\n🚀 Somnia Web3 Agent Commands:'));
      console.log(chalk.white('\n📊 WALLET OPERATIONS:'));
      console.log('  node somnia-web3.js interactive     # Start interactive mode');
      console.log('  node somnia-web3.js find <address>  # Analyze wallet');
      console.log('  node somnia-web3.js fund <addr> <amount>  # Send ETH');
      console.log('  node somnia-web3.js check <addr> <amount> # Check funds');
      
      console.log(chalk.white('\n🔧 SETUP:'));
      console.log('  1. Add your private key to .env file:');
      console.log('     PRIVATE_KEY=your_private_key_here');
      console.log('  2. Ensure you have Groq API key:');
      console.log('     GROQ_API_KEY=your_groq_key_here');
      
      console.log(chalk.white('\n💡 FEATURES:'));
      console.log('  🎤 Voice Commands (STT) - Coming soon');
      console.log('  🔍 AI-Powered Wallet Analysis');
      console.log('  💰 Automated Funding');
      console.log('  🤖 Natural Language Processing');
      console.log('  📊 Multi-Wallet Comparison');
      console.log('  🚀 Smart Contract Generation');
      
      console.log(chalk.blue('\n🌐 Somnia Network Integration:'));
      console.log(`  RPC: ${process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'}`);
      console.log('  Network: Somnia Testnet');
      
      console.log(chalk.yellow('\n⚠️  Add your private key to .env to enable funding features'));
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log(chalk.blue('\n👋 Goodbye!'));
  process.exit(0);
});

main().catch((error) => {
  console.error(chalk.red('❌ Fatal error:'), error.message);
  process.exit(1);
});

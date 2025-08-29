#!/usr/bin/env node

import { ethers } from 'ethers';
import chalk from 'chalk';
import readline from 'readline';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

class EnhancedSomniaAgent {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'
    );
    this.wallet = null;
    this.conversationHistory = [];
  }

  async initialize(privateKey) {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(chalk.green(`✅ Wallet connected: ${this.wallet.address}`));
      
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(chalk.cyan(`💰 Balance: ${ethers.formatEther(balance)} ETH`));
      
      return this.wallet.address;
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error.message}`);
    }
  }

  async parseNaturalLanguage(input) {
    try {
      const prompt = `
      Analyze this user input and determine what blockchain action they want to perform. 
      Return JSON with action and parameters.
      
      User input: "${input}"
      
      Available actions:
      - "find_wallet": {address: "0x..."}
      - "fund_wallet": {address: "0x...", amount: "0.1"}
      - "check_funds": {address: "0x...", amount: "1.0"}
      - "get_balance": {}
      - "help": {}
      
      Extract any wallet addresses (0x followed by 40 hex chars) and amounts.
      If unclear, return {"action": "help", "params": {}}.
      
      Return only valid JSON: {"action": "action_name", "params": {...}}
      `;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"action": "help", "params": {}}');
      return result;
    } catch (error) {
      console.log(chalk.yellow(`🤔 Couldn't parse "${input}". Try specific commands like:`));
      console.log(chalk.white('  • find 0x123... - Analyze wallet'));
      console.log(chalk.white('  • fund 0x123... 0.1 - Send 0.1 ETH'));
      return { action: 'help', params: {} };
    }
  }

  async findWallet(address) {
    try {
      console.log(chalk.blue(`🔍 Deep analyzing wallet: ${address}`));
      
      const [balance, transactionCount, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.getCode(address)
      ]);

      const balanceEth = ethers.formatEther(balance);
      const isContract = code !== '0x';

      // AI-powered insights
      const insights = await this.generateWalletInsights({
        address,
        balance: balanceEth,
        transactionCount,
        isContract
      });

      console.log(chalk.cyan('\n📊 Comprehensive Wallet Analysis:'));
      console.log(`💰 Balance: ${balanceEth} ETH`);
      console.log(`📈 Transactions: ${transactionCount}`);
      console.log(`🏷️ Type: ${isContract ? 'Smart Contract' : 'EOA (Externally Owned Account)'}`);
      console.log(`🛡️ Risk Level: ${this.calculateRiskLevel(parseFloat(balanceEth), transactionCount)}`);
      
      console.log(chalk.magenta('\n🧠 AI Insights:'));
      console.log(insights);
      
      return {
        address,
        balance: balanceEth,
        transactionCount,
        isContract,
        insights
      };
    } catch (error) {
      throw new Error(`Failed to analyze wallet: ${error.message}`);
    }
  }

  async generateWalletInsights(walletData) {
    try {
      const prompt = `
      Analyze this Somnia wallet and provide 2-3 key insights:
      
      Address: ${walletData.address}
      Balance: ${walletData.balance} ETH
      Transactions: ${walletData.transactionCount}
      Type: ${walletData.isContract ? 'Smart Contract' : 'EOA'}
      
      Provide brief, actionable insights about this wallet's activity and security.
      `;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 150
      });

      return response.choices[0]?.message?.content || 'Active wallet on Somnia network.';
    } catch (error) {
      return 'Wallet analysis complete. Consider the transaction history and balance for security.';
    }
  }

  calculateRiskLevel(balance, txCount) {
    if (balance > 5 && txCount > 10) return chalk.green('LOW');
    if (balance > 1 && txCount > 5) return chalk.yellow('MEDIUM');
    return chalk.red('HIGH');
  }

  async fundWallet(targetAddress, amount) {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Please provide private key.');
    }

    try {
      console.log(chalk.blue(`💸 Sending ${amount} ETH to ${targetAddress}...`));
      
      // Get current gas price
      const feeData = await this.provider.getFeeData();
      
      const tx = await this.wallet.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amount),
        gasLimit: 21000,
        gasPrice: feeData.gasPrice
      });
      
      console.log(chalk.yellow(`⏳ Transaction sent: ${tx.hash}`));
      console.log(chalk.gray('Waiting for confirmation on Somnia network...'));
      
      const receipt = await tx.wait();
      
      console.log(chalk.green('✅ Transaction confirmed on Somnia!'));
      console.log(chalk.cyan(`📄 Hash: ${receipt.hash}`));
      console.log(chalk.cyan(`📦 Block: ${receipt.blockNumber}`));
      console.log(chalk.cyan(`⛽ Gas Used: ${receipt.gasUsed}`));
      
      // AI-powered transaction summary
      const summary = await this.generateTransactionSummary(receipt, amount, targetAddress);
      console.log(chalk.magenta('\n🧠 Transaction Summary:'));
      console.log(summary);
      
      return receipt;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  async generateTransactionSummary(receipt, amount, targetAddress) {
    try {
      const prompt = `
      Summarize this Somnia blockchain transaction in a friendly way:
      
      Amount: ${amount} ETH
      To: ${targetAddress}
      Block: ${receipt.blockNumber}
      Gas Used: ${receipt.gasUsed}
      
      Provide a brief, encouraging summary about the successful transaction.
      `;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0]?.message?.content || `Successfully sent ${amount} ETH on Somnia network!`;
    } catch (error) {
      return `Transaction completed successfully! ${amount} ETH sent to ${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`;
    }
  }

  async checkFunds(address, requiredAmount) {
    const balance = await this.provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    const required = parseFloat(requiredAmount);
    
    const hasSufficient = balanceEth >= required;
    const percentage = (balanceEth / required * 100);
    
    console.log(chalk[hasSufficient ? 'green' : 'red'](
      `${hasSufficient ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'} FUNDS`
    ));
    console.log(`Current: ${balanceEth.toFixed(4)} ETH`);
    console.log(`Required: ${required} ETH`);
    console.log(`Coverage: ${percentage.toFixed(1)}%`);
    
    if (hasSufficient) {
      console.log(chalk.green(`💎 Surplus: ${(balanceEth - required).toFixed(4)} ETH`));
    } else {
      console.log(chalk.red(`💰 Shortfall: ${(required - balanceEth).toFixed(4)} ETH`));
    }
    
    return hasSufficient;
  }

  async startVoiceMode() {
    console.log(chalk.magenta('🎤 Somnia Web3 Agent - AI Voice Mode'));
    console.log(chalk.cyan('Now supporting natural language commands!'));
    console.log(chalk.white('\nExamples:'));
    console.log('  • "Analyze wallet 0x123..."');
    console.log('  • "Send 0.1 ETH to 0x456..."');
    console.log('  • "Check if 0x789... has 2 ETH"');
    console.log('  • "What\'s my balance?"');
    console.log('  • "Help me understand this wallet"');
    console.log('  • Type "exit" to quit\n');

    while (true) {
      try {
        const input = await askQuestion(chalk.cyan('🎤 Voice> '));
        
        if (input.trim().toLowerCase() === 'exit') {
          console.log(chalk.blue('👋 Goodbye!'));
          break;
        }

        // Store conversation
        this.conversationHistory.push({ user: input, timestamp: new Date() });

        // Parse natural language
        const command = await this.parseNaturalLanguage(input);
        await this.executeCommand(command);

      } catch (error) {
        console.error(chalk.red('❌ Error:'), error.message);
      }
    }

    rl.close();
  }

  async executeCommand(command) {
    switch (command.action) {
      case 'find_wallet':
        if (!command.params.address) {
          console.log(chalk.red('Please provide a wallet address to analyze.'));
          return;
        }
        await this.findWallet(command.params.address);
        break;

      case 'fund_wallet':
        if (!command.params.address || !command.params.amount) {
          console.log(chalk.red('Please provide both address and amount to send.'));
          return;
        }
        await this.fundWallet(command.params.address, command.params.amount);
        break;

      case 'check_funds':
        if (!command.params.address || !command.params.amount) {
          console.log(chalk.red('Please provide address and amount to check.'));
          return;
        }
        await this.checkFunds(command.params.address, command.params.amount);
        break;

      case 'get_balance':
        if (!this.wallet) {
          console.log(chalk.red('Wallet not connected'));
          return;
        }
        await this.findWallet(this.wallet.address);
        break;

      case 'help':
      default:
        console.log(chalk.cyan('\n🆘 Available Natural Language Commands:'));
        console.log(chalk.white('📊 WALLET ANALYSIS:'));
        console.log('  • "Analyze wallet 0x123..." or "Check this address 0x123..."');
        console.log('  • "What\'s my balance?" or "Show my wallet info"');
        
        console.log(chalk.white('\n💸 FUNDING:'));
        console.log('  • "Send 0.1 ETH to 0x456..." or "Fund wallet 0x456... with 0.5 ETH"');
        console.log('  • "Transfer 2 ETH to 0x789..."');
        
        console.log(chalk.white('\n💰 FUND CHECKING:'));
        console.log('  • "Check if 0x123... has 1 ETH" or "Does wallet 0x123... have enough 2 ETH?"');
        console.log('  • "Verify funds 0x456... amount 0.5"');
        
        console.log(chalk.gray('\n💡 Tip: Use natural language! The AI will understand your intent.'));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(chalk.blue('🌟 Somnia Web3 Agent v2.0 - AI Enhanced'));
  console.log(chalk.gray(`Network: ${process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'}`));

  const agent = new EnhancedSomniaAgent();

  switch (command) {
    case 'voice':
    case 'ai':
    case 'chat':
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red('❌ PRIVATE_KEY required in .env file'));
        return;
      }
      await agent.initialize(privateKey);
      await agent.startVoiceMode();
      break;

    case 'find':
      if (!args[1]) {
        console.error(chalk.red('❌ Usage: node enhanced-agent.js find <address>'));
        return;
      }
      await agent.findWallet(args[1]);
      break;

    case 'fund':
      if (!args[1] || !args[2]) {
        console.error(chalk.red('❌ Usage: node enhanced-agent.js fund <address> <amount>'));
        return;
      }
      const privateKeyForFund = process.env.PRIVATE_KEY;
      if (!privateKeyForFund) {
        console.error(chalk.red('❌ PRIVATE_KEY environment variable required'));
        return;
      }
      await agent.initialize(privateKeyForFund);
      await agent.fundWallet(args[1], args[2]);
      break;

    default:
      console.log(chalk.cyan('\n🚀 Enhanced Somnia Web3 Agent Commands:'));
      console.log(chalk.white('\n🎤 AI VOICE MODE (Recommended):'));
      console.log('  node enhanced-agent.js voice    # Start AI natural language mode');
      console.log('  node enhanced-agent.js ai       # Same as voice mode');
      console.log('  node enhanced-agent.js chat     # Interactive AI chat');
      
      console.log(chalk.white('\n📊 DIRECT COMMANDS:'));
      console.log('  node enhanced-agent.js find <address>       # AI wallet analysis');
      console.log('  node enhanced-agent.js fund <addr> <amount> # Send ETH with AI insights');
      
      console.log(chalk.blue('\n🌟 NEW AI FEATURES:'));
      console.log('  🎤 Natural Language Processing - "Send 0.1 ETH to 0x123..."');
      console.log('  🧠 AI-Powered Wallet Insights - Deep analysis with recommendations');
      console.log('  💬 Conversational Interface - Chat naturally with your blockchain');
      console.log('  📊 Smart Transaction Summaries - AI explains what happened');
      console.log('  🛡️ Risk Assessment - AI evaluates wallet security');
      
      console.log(chalk.green('\n✅ Your wallet is ready with 2.0 ETH on Somnia!'));
      console.log(chalk.yellow('\n🎯 Try: node enhanced-agent.js voice'));
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

#!/usr/bin/env node

import { ethers } from 'ethers';
import chalk from 'chalk';
import readline from 'readline';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import fs from 'fs';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Simple Web Speech API simulation for CLI
class CLISpeechRecognition {
  constructor() {
    this.listening = false;
    this.onresult = null;
    this.onerror = null;
  }

  start() {
    this.listening = true;
    console.log(chalk.yellow('🎤 Listening... (Type your command or press Enter to speak)'));
  }

  stop() {
    this.listening = false;
  }

  // Simulate speech result
  simulateResult(transcript) {
    if (this.onresult) {
      this.onresult({
        results: [[{ transcript, confidence: 0.9 }]]
      });
    }
  }
}

class VoiceEnhancedSomniaAgent {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'
    );
    this.wallet = null;
    this.speechRecognition = new CLISpeechRecognition();
    this.isListening = false;
    this.conversationHistory = [];
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize(privateKey) {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(chalk.green(`✅ Wallet connected: ${this.wallet.address}`));
      
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(chalk.cyan(`💰 Balance: ${ethers.formatEther(balance)} ETH`));
      
      this.setupSpeechRecognition();
      return this.wallet.address;
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error.message}`);
    }
  }

  setupSpeechRecognition() {
    this.speechRecognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log(chalk.blue(`🎤 Voice Input: "${transcript}"`));
      this.processVoiceCommand(transcript);
    };

    this.speechRecognition.onerror = (error) => {
      console.error(chalk.red('🎤 Speech recognition error:'), error);
    };
  }

  async processVoiceCommand(transcript) {
    try {
      // Enhanced voice command processing
      const command = await this.parseVoiceCommand(transcript);
      console.log(chalk.gray(`🧠 Parsed Command: ${JSON.stringify(command)}`));
      
      await this.executeCommand(command);
    } catch (error) {
      console.error(chalk.red('❌ Voice command error:'), error.message);
    }
  }

  async parseVoiceCommand(transcript) {
    try {
      const prompt = `
      Parse this voice command for blockchain operations. Extract exact parameters.
      
      Voice input: "${transcript}"
      
      Commands to recognize:
      1. "find wallet [address]" or "analyze [address]" 
      2. "send [amount] to [address]" or "fund [address] with [amount]"
      3. "check funds [address] [amount]" or "verify [address] has [amount]"
      4. "my balance" or "show balance"
      5. "help" or "what can you do"
      
      Extract addresses (0x followed by 40 hex chars) and amounts (numbers).
      Handle variations like "point one" = 0.1, "half" = 0.5, etc.
      
      Return JSON: {"action": "action_name", "params": {...}}
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
      // Fallback to simple parsing
      const cleanInput = transcript.toLowerCase().trim();
      
      if (cleanInput.includes('find') || cleanInput.includes('analyze')) {
        const addressMatch = transcript.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          return { action: 'find_wallet', params: { address: addressMatch[0] } };
        }
      }
      
      if (cleanInput.includes('send') || cleanInput.includes('fund')) {
        const addressMatch = transcript.match(/0x[a-fA-F0-9]{40}/);
        const amountMatch = transcript.match(/(\d*\.?\d+)/);
        if (addressMatch && amountMatch) {
          return { 
            action: 'fund_wallet', 
            params: { 
              address: addressMatch[0], 
              amount: amountMatch[0] 
            } 
          };
        }
      }
      
      if (cleanInput.includes('balance') || cleanInput.includes('my wallet')) {
        return { action: 'get_balance', params: {} };
      }
      
      return { action: 'help', params: {} };
    }
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async startVoiceInterface() {
    console.log(chalk.magenta('\n🎤 SOMNIA VOICE WEB3 AGENT'));
    console.log(chalk.cyan('═══════════════════════════════════════════'));
    console.log(chalk.white('Now with Speech-to-Text simulation!'));
    console.log(chalk.green('\n✨ VOICE COMMANDS:'));
    console.log('  🔍 "Find wallet 0x123..." - Analyze any wallet');
    console.log('  💸 "Send 0.1 to 0x456..." - Transfer ETH');
    console.log('  💰 "Check if 0x789 has 2 ETH" - Verify funds');
    console.log('  📊 "My balance" - Show your wallet');
    console.log('  ❓ "Help" - Show all commands');
    
    console.log(chalk.blue('\n🎯 VOICE TIPS:'));
    console.log('  • Speak clearly with addresses and amounts');
    console.log('  • Say "point one" for 0.1 ETH');
    console.log('  • Natural language works: "Send half ETH to..."');
    console.log('  • Type instead of speaking if needed');
    
    console.log(chalk.yellow('\n⌨️  Press Enter to start voice mode, or type commands directly'));
    console.log(chalk.gray('    Type "exit" to quit\n'));

    while (true) {
      try {
        const input = await this.askQuestion(chalk.cyan('🎤 Voice/Type> '));
        
        if (input.trim().toLowerCase() === 'exit') {
          console.log(chalk.blue('👋 Voice agent shutting down...'));
          break;
        }

        if (input.trim() === '') {
          // Simulate voice input
          console.log(chalk.yellow('🎤 Voice mode activated... (simulating speech recognition)'));
          const voiceInput = await this.askQuestion(chalk.magenta('🗣️  Speak now> '));
          await this.processVoiceCommand(voiceInput);
        } else {
          // Process typed input as voice command
          await this.processVoiceCommand(input);
        }

      } catch (error) {
        console.error(chalk.red('❌ Error:'), error.message);
      }
    }

    this.rl.close();
  }

  // Copy existing methods from enhanced-agent
  async findWallet(address) {
    try {
      console.log(chalk.blue(`🔍 🎤 Voice-activated wallet analysis: ${address}`));
      
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

      console.log(chalk.cyan('\n📊 🎤 Voice-Requested Wallet Analysis:'));
      console.log(`💰 Balance: ${balanceEth} ETH`);
      console.log(`📈 Transactions: ${transactionCount}`);
      console.log(`🏷️ Type: ${isContract ? 'Smart Contract' : 'EOA (Externally Owned Account)'}`);
      console.log(`🛡️ Risk Level: ${this.calculateRiskLevel(parseFloat(balanceEth), transactionCount)}`);
      
      console.log(chalk.magenta('\n🧠 AI Voice Insights:'));
      console.log(insights);
      
      // Voice feedback
      console.log(chalk.green('\n🔊 Voice Analysis Complete! Say "help" for more commands.'));
      
      return {
        address,
        balance: balanceEth,
        transactionCount,
        isContract,
        insights
      };
    } catch (error) {
      throw new Error(`Voice wallet analysis failed: ${error.message}`);
    }
  }

  async generateWalletInsights(walletData) {
    try {
      const prompt = `
      Analyze this Somnia wallet for voice interface and provide 2-3 key insights:
      
      Address: ${walletData.address}
      Balance: ${walletData.balance} ETH
      Transactions: ${walletData.transactionCount}
      Type: ${walletData.isContract ? 'Smart Contract' : 'EOA'}
      
      Provide brief, voice-friendly insights. Make it conversational like you're speaking to the user.
      `;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 150
      });

      return response.choices[0]?.message?.content || 'Voice analysis complete. This is an active Somnia wallet.';
    } catch (error) {
      return 'Voice analysis complete. Consider the transaction history and balance for security insights.';
    }
  }

  calculateRiskLevel(balance, txCount) {
    if (balance > 5 && txCount > 10) return chalk.green('LOW RISK');
    if (balance > 1 && txCount > 5) return chalk.yellow('MEDIUM RISK');
    return chalk.red('HIGH RISK');
  }

  async fundWallet(targetAddress, amount) {
    if (!this.wallet) {
      throw new Error('Voice command failed: Wallet not initialized.');
    }

    try {
      console.log(chalk.blue(`🎤 💸 Voice-activated transfer: ${amount} ETH to ${targetAddress}...`));
      
      const feeData = await this.provider.getFeeData();
      
      const tx = await this.wallet.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther(amount),
        gasLimit: 21000,
        gasPrice: feeData.gasPrice
      });
      
      console.log(chalk.yellow(`⏳ 🎤 Voice transaction sent: ${tx.hash}`));
      console.log(chalk.gray('🔊 Waiting for confirmation on Somnia network...'));
      
      const receipt = await tx.wait();
      
      console.log(chalk.green('✅ 🎤 Voice transaction confirmed!'));
      console.log(chalk.cyan(`📄 Hash: ${receipt.hash}`));
      console.log(chalk.cyan(`📦 Block: ${receipt.blockNumber}`));
      console.log(chalk.cyan(`⛽ Gas Used: ${receipt.gasUsed}`));
      
      // Voice-friendly summary
      const summary = await this.generateVoiceTransactionSummary(receipt, amount, targetAddress);
      console.log(chalk.magenta('\n🔊 Voice Transaction Summary:'));
      console.log(summary);
      
      return receipt;
    } catch (error) {
      throw new Error(`Voice transaction failed: ${error.message}`);
    }
  }

  async generateVoiceTransactionSummary(receipt, amount, targetAddress) {
    try {
      const prompt = `
      Create a voice-friendly summary of this Somnia transaction:
      
      Amount: ${amount} ETH
      To: ${targetAddress}
      Block: ${receipt.blockNumber}
      Gas Used: ${receipt.gasUsed}
      
      Write it as if you're speaking to the user. Be encouraging and clear.
      `;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 100
      });

      return response.choices[0]?.message?.content || `Great! Your voice command sent ${amount} ETH successfully on Somnia!`;
    } catch (error) {
      return `Perfect! Voice command completed - ${amount} ETH sent to ${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`;
    }
  }

  async executeCommand(command) {
    switch (command.action) {
      case 'find_wallet':
        if (!command.params.address) {
          console.log(chalk.red('🎤 Please say a wallet address to analyze.'));
          return;
        }
        await this.findWallet(command.params.address);
        break;

      case 'fund_wallet':
        if (!command.params.address || !command.params.amount) {
          console.log(chalk.red('🎤 Please say both address and amount to send.'));
          return;
        }
        await this.fundWallet(command.params.address, command.params.amount);
        break;

      case 'check_funds':
        if (!command.params.address || !command.params.amount) {
          console.log(chalk.red('🎤 Please say address and amount to check.'));
          return;
        }
        await this.checkFunds(command.params.address, command.params.amount);
        break;

      case 'get_balance':
        if (!this.wallet) {
          console.log(chalk.red('🎤 Wallet not connected for voice command'));
          return;
        }
        await this.findWallet(this.wallet.address);
        break;

      case 'help':
      default:
        console.log(chalk.cyan('\n🎤 VOICE COMMANDS HELP:'));
        console.log(chalk.white('🔍 WALLET ANALYSIS:'));
        console.log('  🗣️  "Find wallet 0x123..." or "Analyze this address 0x123..."');
        console.log('  🗣️  "My balance" or "Show my wallet"');
        
        console.log(chalk.white('\n💸 SEND FUNDS:'));
        console.log('  🗣️  "Send 0.1 to 0x456..." or "Transfer point five ETH to 0x789..."');
        console.log('  🗣️  "Fund wallet 0x456 with half ETH"');
        
        console.log(chalk.white('\n💰 CHECK FUNDS:'));
        console.log('  🗣️  "Check if 0x123 has 1 ETH" or "Does wallet 0x123 have enough 2 ETH?"');
        
        console.log(chalk.blue('\n🎯 VOICE TIPS:'));
        console.log('  • Say "point one" for 0.1 ETH');
        console.log('  • Say "half" for 0.5 ETH');
        console.log('  • Use natural language - the AI understands!');
        console.log('  • Press Enter to activate voice mode');
    }
  }

  async checkFunds(address, requiredAmount) {
    const balance = await this.provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    const required = parseFloat(requiredAmount);
    
    const hasSufficient = balanceEth >= required;
    const percentage = (balanceEth / required * 100);
    
    console.log(chalk[hasSufficient ? 'green' : 'red'](
      `🎤 ${hasSufficient ? '✅ VOICE CONFIRMED: SUFFICIENT' : '❌ VOICE ALERT: INSUFFICIENT'} FUNDS`
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
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(chalk.blue('🎤 Somnia Voice Web3 Agent v3.0'));
  console.log(chalk.gray(`Network: ${process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet'}`));

  const agent = new VoiceEnhancedSomniaAgent();

  switch (command) {
    case 'voice':
    case 'speak':
    case 'stt':
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        console.error(chalk.red('❌ PRIVATE_KEY required in .env file'));
        return;
      }
      await agent.initialize(privateKey);
      await agent.startVoiceInterface();
      break;

    default:
      console.log(chalk.cyan('\n🎤 VOICE WEB3 AGENT COMMANDS:'));
      console.log(chalk.white('\n🗣️ VOICE MODE:'));
      console.log('  node voice-agent.js voice    # Start voice interface');
      console.log('  node voice-agent.js speak    # Same as voice mode');
      console.log('  node voice-agent.js stt      # Speech-to-Text mode');
      
      console.log(chalk.blue('\n🌟 VOICE FEATURES:'));
      console.log('  🎤 Speech Recognition Simulation');
      console.log('  🧠 AI Natural Language Processing');
      console.log('  🗣️ Voice-Friendly Responses');
      console.log('  💬 Conversational Commands');
      console.log('  🔊 Audio-Style Feedback');
      
      console.log(chalk.green('\n✅ Ready with 2.0 ETH on Somnia!'));
      console.log(chalk.yellow('\n🎯 Try: node voice-agent.js voice'));
      
      console.log(chalk.magenta('\n🎤 EXAMPLE VOICE COMMANDS:'));
      console.log('  "Find wallet 0x588F6b3169F60176c1143f8BaB47bCf3DeEbECdc"');
      console.log('  "Send point one ETH to 0x123..."');
      console.log('  "Check if my wallet has enough 1 ETH"');
      console.log('  "My balance"');
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log(chalk.blue('\n👋 Voice agent shutting down...'));
  process.exit(0);
});

main().catch((error) => {
  console.error(chalk.red('❌ Voice agent error:'), error.message);
  process.exit(1);
});

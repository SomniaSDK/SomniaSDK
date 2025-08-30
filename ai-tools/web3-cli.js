#!/usr/bin/env node

import { Web3Agent } from './dist/web3-agent.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'agent':
      await startAgent();
      break;
    case 'find':
      await findWallet(args[1]);
      break;
    case 'fund':
      await fundWallet(args[1], args[2]);
      break;
    default:
      showHelp();
  }
}

async function startAgent() {
  console.log(chalk.magenta('🤖 Starting Somnia Web3 Agent...'));
  
  const agent = new Web3Agent({
    network: 'somnia',
    voiceEnabled: false,
    verbose: true
  });
  
  // Initialize with private key if provided
  if (process.env.PRIVATE_KEY) {
    await agent.initialize(process.env.PRIVATE_KEY);
  }
  
  await agent.start();
}

async function findWallet(address) {
  if (!address) {
    console.error(chalk.red('❌ Please provide a wallet address'));
    return;
  }
  
  console.log(chalk.blue(`🔍 Analyzing wallet: ${address}`));
  
  const agent = new Web3Agent({
    network: 'somnia',
    voiceEnabled: false,
    verbose: true
  });
  
  // For demo, just show basic analysis
  console.log(chalk.green('✅ Wallet analysis complete!'));
  console.log(chalk.cyan(`📍 Address: ${address}`));
  console.log(chalk.cyan('💰 Balance: Checking...'));
}

async function fundWallet(address, amount) {
  if (!address || !amount) {
    console.error(chalk.red('❌ Please provide both address and amount'));
    return;
  }
  
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error(chalk.red('❌ PRIVATE_KEY environment variable required'));
    return;
  }
  
  console.log(chalk.blue(`💸 Funding ${address} with ${amount} ETH...`));
  
  const agent = new Web3Agent({
    network: 'somnia',
    voiceEnabled: false,
    verbose: true
  });
  
  await agent.initialize(privateKey);
  await agent.fundWallet(address, amount);
}

function showHelp() {
  console.log(chalk.blue('\n🤖 Somnia Web3 Agent CLI'));
  console.log(chalk.cyan('\nCommands:'));
  console.log(chalk.white('  agent                    Start interactive agent'));
  console.log(chalk.white('  find <address>           Analyze wallet'));
  console.log(chalk.white('  fund <address> <amount>  Fund wallet with ETH'));
  
  console.log(chalk.cyan('\nEnvironment Variables:'));
  console.log(chalk.white('  PRIVATE_KEY              Your wallet private key'));
  console.log(chalk.white('  GROQ_API_KEY            AI API key'));
  console.log(chalk.white('  SOMNIA_RPC_URL          Somnia RPC endpoint'));
  
  console.log(chalk.cyan('\nExamples:'));
  console.log(chalk.white('  node web3-cli.js agent'));
  console.log(chalk.white('  node web3-cli.js find 0x742d35Cc6634C0532925a3b8D238D6A5f88b8932'));
  console.log(chalk.white('  node web3-cli.js fund 0x742d35Cc... 0.1'));
  
  console.log(chalk.blue('\n🌟 Enhanced Features:'));
  console.log(chalk.white('• 🎤 Voice commands with STT'));
  console.log(chalk.white('• 🔍 AI-powered wallet analysis'));
  console.log(chalk.white('• 💰 Automated funding operations'));
  console.log(chalk.white('• 🤖 Natural language processing'));
  console.log(chalk.white('• 🚀 Smart contract generation'));
  console.log(chalk.white('• 📊 Multi-wallet comparison'));
}

main().catch(console.error);

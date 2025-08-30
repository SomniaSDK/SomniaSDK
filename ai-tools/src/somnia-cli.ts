#!/usr/bin/env node

import { Command } from 'commander';
import { ContractGenerator } from './contract-gen.js';
import { WalletAnalyzer } from './wallet-analyzer.js';
import { Web3Agent } from './web3-agent.js';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const program = new Command();

program
  .name('somnia-cli')
  .description('AI-powered smart contract generation and Web3 agent tools for Somnia blockchain')
  .version('2.0.0');

// Original contract generation command
program
  .command('generate')
  .description('Generate smart contract from description')
  .argument('<description>', 'Contract description')
  .option('-o, --output <dir>', 'Output directory', process.env.OUTPUT_DIR || './contracts')
  .option('-v, --verbose', 'Verbose output', process.env.VERBOSE === 'true')
  .action(async (description, options) => {
    try {
      console.log(chalk.blue('🤖 Generating smart contract...'));
      
      const generator = new ContractGenerator({
        outputDir: options.output,
        verbose: options.verbose
      });
      
      const result = await generator.generateFromDescription(description);
      console.log(chalk.green('✅ Contract generated successfully!'));
      console.log(chalk.cyan(`📁 Location: ${result.projectPath}`));
      console.log(chalk.cyan(`📄 Contract: ${result.contractFile}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating contract:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Wallet finding and analysis command
program
  .command('find-wallet')
  .description('Find and analyze wallet address on Somnia')
  .argument('<address>', 'Wallet address to analyze')
  .option('-f, --fund <amount>', 'Check for specific fund amount')
  .option('--network <network>', 'Blockchain network', 'somnia')
  .option('--tokens', 'Include detailed token analysis')
  .action(async (address, options) => {
    try {
      if (!ethers.isAddress(address)) {
        console.error(chalk.red('❌ Invalid wallet address format'));
        process.exit(1);
      }

      console.log(chalk.blue(`🔍 Analyzing wallet on Somnia: ${address}`));
      
      const analyzer = new WalletAnalyzer({
        network: options.network,
        verbose: true
      });
      
      const analysis = await analyzer.analyzeWallet(address, {
        includeTokens: options.tokens,
        fundCheck: options.fund ? parseFloat(options.fund) : undefined
      });
      
      // Display results
      console.log(chalk.cyan('\n📊 Wallet Analysis:'));
      console.log(`💰 Balance: ${analysis.balance} ETH`);
      console.log(`📈 Total Transactions: ${analysis.transactionCount}`);
      console.log(`📅 First Activity: ${analysis.firstSeen}`);
      console.log(`🕒 Last Activity: ${analysis.lastSeen}`);
      
      // Fund check if specified
      if (options.fund) {
        const fundAmount = parseFloat(options.fund);
        const hasFund = parseFloat(analysis.balance) >= fundAmount;
        console.log(chalk[hasFund ? 'green' : 'red'](
          `\n💸 Fund Check: ${hasFund ? '✅ Has' : '❌ Lacks'} ${fundAmount} ETH`
        ));
      }

      // Token holdings
      if (options.tokens && analysis.tokens.length > 0) {
        console.log(chalk.yellow('\n🪙 Token Holdings:'));
        analysis.tokens.forEach((token: any, i: number) => {
          console.log(`  ${i + 1}. ${token.symbol}: ${token.balance} (${token.name})`);
        });
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error analyzing wallet:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Interactive Web3 agent command
program
  .command('agent')
  .description('Start interactive Web3 agent with AI and voice commands')
  .option('--network <network>', 'Blockchain network', 'somnia')
  .option('--voice', 'Enable voice commands', false)
  .action(async (options) => {
    try {
      console.log(chalk.magenta('🤖 Starting Somnia Web3 Agent...'));
      
      const agent = new Web3Agent({
        network: options.network,
        voiceEnabled: options.voice,
        verbose: true
      });
      
      await agent.start();
      
    } catch (error) {
      console.error(chalk.red('❌ Error starting agent:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Batch wallet analysis
program
  .command('batch-analyze')
  .description('Analyze multiple wallets from file')
  .argument('<file>', 'File containing wallet addresses (one per line)')
  .option('-f, --fund <amount>', 'Check for specific fund amount')
  .option('--network <network>', 'Blockchain network', 'somnia')
  .option('-o, --output <file>', 'Output results to JSON file')
  .action(async (file, options) => {
    try {
      const fs = await import('fs/promises');
      const addresses = (await fs.readFile(file, 'utf8'))
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && ethers.isAddress(line));

      console.log(chalk.blue(`🔍 Analyzing ${addresses.length} wallets on Somnia...`));
      
      const analyzer = new WalletAnalyzer({
        network: options.network,
        verbose: false
      });
      
      const results = [];
      
      for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];
        console.log(chalk.gray(`Progress: ${i + 1}/${addresses.length} - ${address}`));
        
        try {
          const analysis = await analyzer.analyzeWallet(address);
          results.push({
            ...analysis,
            address,
            fundCheck: options.fund ? parseFloat(analysis.balance) >= parseFloat(options.fund) : undefined
          });
        } catch (error) {
          results.push({
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      console.log(chalk.green(`✅ Analyzed ${results.length} wallets`));
      
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(results, null, 2));
        console.log(chalk.cyan(`📁 Results saved to: ${options.output}`));
      } else {
        console.log('\n📊 Summary:');
        const successful = results.filter(r => !r.error);
        const withFunds = successful.filter((r: any) => parseFloat(r.balance) > 0);
        
        console.log(`✅ Successful: ${successful.length}`);
        console.log(`💰 With funds: ${withFunds.length}`);
        console.log(`❌ Failed: ${results.filter(r => r.error).length}`);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error in batch analysis:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Fund wallet command
program
  .command('fund')
  .description('Fund a wallet with ETH using your private key')
  .argument('<address>', 'Target wallet address')
  .argument('<amount>', 'Amount to send (in ETH)')
  .option('--network <network>', 'Blockchain network', 'somnia')
  .option('--private-key <key>', 'Private key for funding (or use PRIVATE_KEY env var)')
  .action(async (address, amount, options) => {
    try {
      const privateKey = options.privateKey || process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        console.error(chalk.red('❌ Private key required. Use --private-key flag or PRIVATE_KEY env variable'));
        process.exit(1);
      }

      if (!ethers.isAddress(address)) {
        console.error(chalk.red('❌ Invalid wallet address format'));
        process.exit(1);
      }

      console.log(chalk.blue(`💸 Funding wallet ${address} with ${amount} ETH...`));
      
      const agent = new Web3Agent({
        network: options.network,
        voiceEnabled: false,
        verbose: true
      });
      
      await agent.initialize(privateKey);
      await agent.fundWallet(address, amount);
      
    } catch (error) {
      console.error(chalk.red('❌ Funding error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Contract deployment command
program
  .command('deploy')
  .description('Deploy generated contract to Somnia blockchain')
  .argument('<contractPath>', 'Path to contract file')
  .option('--network <network>', 'Blockchain network', 'somnia')
  .option('--private-key <key>', 'Private key for deployment (or use PRIVATE_KEY env var)')
  .option('--gas-limit <limit>', 'Gas limit', '2000000')
  .action(async (contractPath, options) => {
    try {
      const privateKey = options.privateKey || process.env.PRIVATE_KEY;
      
      if (!privateKey) {
        console.error(chalk.red('❌ Private key required for deployment'));
        process.exit(1);
      }

      console.log(chalk.blue(`🚀 Deploying contract to Somnia: ${contractPath}`));
      
      // This would need contract compilation and deployment logic
      console.log(chalk.yellow('⚠️  Contract deployment feature coming soon'));
      console.log(chalk.cyan(`Network: ${options.network}`));
      console.log(chalk.cyan(`Gas Limit: ${options.gasLimit}`));
      
    } catch (error) {
      console.error(chalk.red('❌ Deployment error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

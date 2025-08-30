import { ethers } from 'ethers';
import { Groq } from 'groq-sdk';
import { WalletAnalyzer } from './wallet-analyzer.js';
import { ContractGenerator } from './contract-gen.js';
import readline from 'readline';
import chalk from 'chalk';

interface Web3AgentConfig {
  network: string;
  voiceEnabled: boolean;
  verbose: boolean;
}

interface CommandIntent {
  action: string;
  params: any;
  confidence: number;
}

export class Web3Agent {
  private groq: Groq;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private walletAnalyzer: WalletAnalyzer;
  private contractGenerator: ContractGenerator;
  private rl: readline.Interface;
  private config: Web3AgentConfig;
  private isRunning: boolean = false;

  constructor(config: Web3AgentConfig) {
    this.config = config;
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Initialize provider based on network
    this.provider = this.getProvider(config.network);
    
    this.walletAnalyzer = new WalletAnalyzer({
      network: config.network,
      verbose: config.verbose
    });
    
    this.contractGenerator = new ContractGenerator({
      outputDir: './agent-contracts',
      verbose: config.verbose
    });
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private getProvider(network: string): ethers.JsonRpcProvider {
    const networks: { [key: string]: string } = {
      somnia: process.env.SOMNIA_RPC_URL || 'https://rpc.ankr.com/somnia_testnet',
      ethereum: 'https://eth.llamarpc.com',
      polygon: 'https://polygon.llamarpc.com', 
      bsc: 'https://bsc.llamarpc.com',
      arbitrum: 'https://arbitrum.llamarpc.com',
      sepolia: 'https://ethereum-sepolia.publicnode.com'
    };
    
    return new ethers.JsonRpcProvider(networks[network] || networks.somnia);
  }

  async initialize(privateKey: string): Promise<void> {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(chalk.green(`✅ Wallet initialized: ${this.wallet.address}`));
      
      // Get balance
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(chalk.cyan(`💰 Balance: ${ethers.formatEther(balance)} ETH`));
    } catch (error) {
      throw new Error(`Failed to initialize wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async start(): Promise<void> {
    this.isRunning = true;
    
    console.log(chalk.magenta('🌟 Somnia Web3 Agent Ready!'));
    console.log(chalk.gray(`Network: ${this.config.network}`));
    console.log(chalk.cyan('\n💡 Try commands like:'));
    console.log('  • "analyze 0x1234..." - Deep wallet analysis');
    console.log('  • "check funds 0x1234... 1.5" - Check if wallet has 1.5 ETH');
    console.log('  • "generate ERC721 NFT marketplace" - Create smart contract');
    console.log('  • "compare 0x1234... 0x5678..." - Compare two wallets');
    console.log('  • "fund 0x1234... 0.1" - Send 0.1 ETH to wallet');
    console.log('  • "help" - Show all commands');
    console.log('  • "exit" - Quit agent\n');

    await this.conversationLoop();
  }

  private async conversationLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const input = await this.getInput('🤖 > ');
        
        if (input.toLowerCase().trim() === 'exit') {
          console.log(chalk.green('👋 Goodbye!'));
          break;
        }

        await this.processCommand(input);
        
      } catch (error) {
        console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
      }
    }

    this.rl.close();
  }

  private async getInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(chalk.cyan(prompt), (answer) => {
        resolve(answer.trim());
      });
    });
  }

  private async processCommand(input: string): Promise<void> {
    const intent = await this.parseIntent(input);
    
    if (this.config.verbose) {
      console.log(chalk.gray(`🧠 Intent: ${intent.action} (confidence: ${intent.confidence}%)`));
    }
    
    switch (intent.action) {
      case 'analyze_wallet':
        await this.handleWalletAnalysis(intent.params.address);
        break;
        
      case 'generate_contract':
        await this.handleContractGeneration(intent.params.description);
        break;
        
      case 'check_funds':
        await this.handleFundCheck(intent.params.address, intent.params.amount);
        break;
        
      case 'fund_wallet':
        await this.handleFundWallet(intent.params.address, intent.params.amount);
        break;
        
      case 'compare_wallets':
        await this.handleWalletComparison(intent.params.addresses);
        break;
        
      case 'portfolio_value':
        await this.handlePortfolioValue(intent.params.address);
        break;
        
      case 'transaction_history':
        await this.handleTransactionHistory(intent.params.address, intent.params.limit);
        break;
        
      case 'help':
        this.showHelp();
        break;
        
      default:
        await this.handleNaturalLanguageQuery(input);
    }
  }

  private async parseIntent(input: string): Promise<CommandIntent> {
    const prompt = `
    Analyze this user input and determine the action they want to perform. Return JSON only.
    
    Input: "${input}"
    
    Possible actions:
    - analyze_wallet: Deep analysis of a wallet {address: "0x..."}
    - generate_contract: Create smart contract {description: "contract type"}
    - check_funds: Check if wallet has specific amount {address: "0x...", amount: number}
    - fund_wallet: Send ETH to wallet {address: "0x...", amount: number}
    - compare_wallets: Compare multiple wallets {addresses: ["0x...", "0x..."]}
    - portfolio_value: Get total portfolio value {address: "0x..."}
    - transaction_history: Get recent transactions {address: "0x...", limit: number}
    - help: Show help {}
    
    Extract wallet addresses (0x followed by 40 hex characters), numbers, and contract descriptions.
    Assign confidence score 0-100 based on clarity of intent.
    
    Return JSON: {"action": "action_name", "params": {...}, "confidence": number}
    `;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"action": "help", "params": {}, "confidence": 0}');
      return result;
    } catch {
      return { action: 'help', params: {}, confidence: 0 };
    }
  }

  private async handleWalletAnalysis(address: string): Promise<void> {
    console.log(chalk.blue(`🔍 Deep analyzing wallet: ${address.slice(0, 6)}...${address.slice(-4)}`));
    
    const analysis = await this.walletAnalyzer.analyzeWallet(address);
    
    console.log(chalk.cyan('\n📊 Comprehensive Wallet Report:'));
    console.log(`💰 Balance: ${analysis.balance} ETH`);
    console.log(`📈 Total Transactions: ${analysis.transactionCount}`);
    console.log(`🏷️ Unique Tokens: ${analysis.tokens.length}`);
    console.log(`📅 Account Age: ${analysis.accountAge} days`);
    
    // Risk assessment
    const riskLevel = this.calculateRiskLevel(analysis);
    const colorFn = riskLevel.color === 'green' ? chalk.green : 
                    riskLevel.color === 'yellow' ? chalk.yellow : chalk.red;
    console.log(colorFn(`🛡️ Risk Level: ${riskLevel.level}`));
    
    // AI-powered insights
    const insights = await this.generateWalletInsights(analysis);
    console.log(chalk.magenta('\n🧠 AI Insights:'));
    console.log(insights);
  }

  private async handleContractGeneration(description: string): Promise<void> {
    console.log(chalk.blue(`🤖 Generating contract: "${description}"`));
    
    const result = await this.contractGenerator.generateFromDescription(description);
    
    console.log(chalk.green('✅ Contract generated successfully!'));
    console.log(chalk.cyan(`📁 File: ${result.contractFile}`));
    console.log(chalk.cyan(`📂 Project: ${result.projectPath}`));
    
    // Suggest next actions
    console.log(chalk.yellow('\n💡 Suggested next steps:'));
    console.log('  • Review the generated contract code');
    console.log('  • Test on Somnia testnet before mainnet deployment');
    console.log(`  • Deploy using: somnia-cli deploy ${result.contractFile}`);
  }

  private async handleFundCheck(address: string, amount: number): Promise<void> {
    console.log(chalk.blue(`💸 Checking if wallet has ${amount} ETH...`));
    
    const balance = await this.provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    
    const hasFunds = balanceEth >= amount;
    const percentage = (balanceEth / amount) * 100;
    
    console.log(chalk[hasFunds ? 'green' : 'red'](
      `${hasFunds ? '✅ SUFFICIENT' : '❌ INSUFFICIENT'} FUNDS`
    ));
    console.log(`Current: ${balanceEth.toFixed(4)} ETH`);
    console.log(`Required: ${amount} ETH`);
    console.log(`Coverage: ${percentage.toFixed(1)}%`);
    
    if (hasFunds) {
      console.log(chalk.green(`💎 Surplus: ${(balanceEth - amount).toFixed(4)} ETH`));
    } else {
      console.log(chalk.red(`💰 Shortfall: ${(amount - balanceEth).toFixed(4)} ETH`));
    }
  }

  async fundWallet(targetAddress: string, amount: string): Promise<void> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Please provide private key.');
    }

    console.log(chalk.blue(`💸 Funding wallet ${targetAddress} with ${amount} ETH`));
    
    const tx = await this.wallet.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther(amount)
    });
    
    console.log(chalk.yellow(`⏳ Transaction sent: ${tx.hash}`));
    
    const receipt = await tx.wait();
    
    console.log(chalk.green('✅ Funding successful!'));
    console.log(chalk.cyan(`   Transaction Hash: ${receipt?.hash}`));
    console.log(chalk.cyan(`   Block Number: ${receipt?.blockNumber}`));
    console.log(chalk.cyan(`   Gas Used: ${receipt?.gasUsed}`));
  }

  private async handleFundWallet(address: string, amount: number): Promise<void> {
    await this.fundWallet(address, amount.toString());
  }

  private async handleWalletComparison(addresses: string[]): Promise<void> {
    if (addresses.length < 2) {
      console.log(chalk.red('❌ Need at least 2 wallet addresses to compare'));
      return;
    }

    console.log(chalk.blue(`🔄 Comparing ${addresses.length} wallets...`));
    
    const analyses = [];
    for (const address of addresses) {
      const analysis = await this.walletAnalyzer.analyzeWallet(address);
      analyses.push({ ...analysis, address });
    }
    
    console.log(chalk.cyan('\n📊 Wallet Comparison:'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    analyses.forEach((wallet, i) => {
      console.log(chalk.yellow(`\n${i + 1}. ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`));
      console.log(`   Balance: ${wallet.balance} ETH`);
      console.log(`   Transactions: ${wallet.transactionCount}`);
      console.log(`   Tokens: ${wallet.tokens.length}`);
    });
    
    // Winner analysis
    const richest = analyses.reduce((max, wallet) => 
      parseFloat(wallet.balance) > parseFloat(max.balance) ? wallet : max
    );
    
    console.log(chalk.green(`\n👑 Highest Balance: ${richest.address.slice(0, 6)}...${richest.address.slice(-4)}`));
    console.log(chalk.green(`   ${richest.balance} ETH`));
  }

  private async handlePortfolioValue(address: string): Promise<void> {
    console.log(chalk.blue('💼 Calculating total portfolio value...'));
    
    const analysis = await this.walletAnalyzer.analyzeWallet(address, { includeTokens: true });
    
    // Calculate total value (simplified - would need price APIs for real implementation)
    const ethValue = parseFloat(analysis.balance);
    
    console.log(chalk.cyan('\n💼 Portfolio Summary:'));
    console.log(`💰 ETH: ${analysis.balance} ETH`);
    console.log(`🪙 Tokens: ${analysis.tokens.length} different tokens`);
    console.log(`📊 Total Value: ~${ethValue.toFixed(4)} ETH (ETH only)`);
    
    console.log(chalk.yellow('\n📝 Note: Token pricing requires external API integration'));
  }

  private async handleTransactionHistory(address: string, limit: number = 10): Promise<void> {
    console.log(chalk.blue(`📜 Fetching last ${limit} transactions...`));
    
    // This would require additional API calls to get transaction history
    console.log(chalk.yellow('⚠️  Transaction history requires blockchain API integration'));
    console.log(chalk.gray('Consider integrating with Etherscan, Alchemy, or Moralis APIs'));
  }

  private async handleNaturalLanguageQuery(input: string): Promise<void> {
    console.log(chalk.blue('🤔 Processing natural language query...'));
    
    const response = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a Somnia Web3 agent assistant. Help users with blockchain and crypto queries.
          Available tools: wallet analysis, contract generation, fund checking, wallet funding.
          Be helpful and suggest specific commands they can use.`
        },
        { role: 'user', content: input }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.7,
      max_tokens: 300
    });

    const aiResponse = response.choices[0]?.message?.content || 'I can help with wallet analysis, contract generation, and fund checking. Try "help" for specific commands.';
    
    console.log(chalk.magenta('\n🤖 AI Response:'));
    console.log(aiResponse);
  }

  private calculateRiskLevel(analysis: any): { level: string; color: string } {
    const balance = parseFloat(analysis.balance);
    const txCount = analysis.transactionCount;
    
    if (balance > 10 && txCount > 100) return { level: 'LOW', color: 'green' };
    if (balance > 1 && txCount > 10) return { level: 'MEDIUM', color: 'yellow' };
    return { level: 'HIGH', color: 'red' };
  }

  private async generateWalletInsights(analysis: any): Promise<string> {
    const prompt = `
    Analyze this wallet data and provide 2-3 key insights:
    
    Balance: ${analysis.balance} ETH
    Transactions: ${analysis.transactionCount}
    Tokens: ${analysis.tokens.length}
    Account Age: ${analysis.accountAge} days
    
    Provide brief, actionable insights about this wallet's activity pattern.
    `;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 200
      });

      return response.choices[0]?.message?.content || 'Wallet appears to be actively used.';
    } catch {
      return 'Unable to generate insights at this time.';
    }
  }

  private showHelp(): void {
    console.log(chalk.cyan('\n🆘 Somnia Web3 Agent Commands:'));
    console.log(chalk.white('\n📊 WALLET OPERATIONS:'));
    console.log('  analyze 0x1234... - Deep wallet analysis');
    console.log('  check funds 0x1234... 1.5 - Check if wallet has 1.5+ ETH');
    console.log('  fund 0x1234... 0.1 - Send 0.1 ETH to wallet');
    console.log('  compare 0x1234... 0x5678... - Compare wallets');
    console.log('  portfolio 0x1234... - Get portfolio value');
    
    console.log(chalk.white('\n🤖 CONTRACT OPERATIONS:'));
    console.log('  generate "ERC721 NFT" - Create smart contract');
    console.log('  generate "DeFi lending pool" - Advanced contracts');
    console.log('  generate "governance token" - DAO contracts');
    
    console.log(chalk.white('\n🔧 UTILITY:'));
    console.log('  help - Show this help');
    console.log('  exit - Quit agent');
    
    console.log(chalk.gray('\n💡 Tip: Use natural language! "Does wallet 0x123... have more than 2 ETH?"'));
  }

  public stop(): void {
    this.isRunning = false;
    this.rl.close();
  }
}

export default Web3Agent;

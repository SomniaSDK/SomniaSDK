import { ethers } from 'ethers';
import chalk from 'chalk';

interface WalletAnalyzerConfig {
  network: string;
  verbose: boolean;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

interface WalletAnalysis {
  address: string;
  balance: string;
  balanceWei: string;
  transactionCount: number;
  tokens: TokenInfo[];
  accountAge: number;
  firstSeen: string;
  lastSeen: string;
  isContract: boolean;
  riskScore: number;
}

export class WalletAnalyzer {
  private provider: ethers.JsonRpcProvider;
  private config: WalletAnalyzerConfig;

  constructor(config: WalletAnalyzerConfig) {
    this.config = config;
    this.provider = this.getProvider(config.network);
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

  async analyzeWallet(address: string, options: any = {}): Promise<WalletAnalysis> {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid wallet address');
    }

    if (this.config.verbose) {
      console.log(chalk.gray('🔄 Fetching wallet data...'));
    }

    try {
      // Get basic wallet info
      const [balance, transactionCount, code] = await Promise.all([
        this.provider.getBalance(address),
        this.provider.getTransactionCount(address),
        this.provider.getCode(address)
      ]);

      const balanceEth = ethers.formatEther(balance);
      const isContract = code !== '0x';

      // Get tokens (simplified - would need token detection API for real implementation)
      const tokens = await this.getTokenHoldings(address);

      // Calculate account age (simplified)
      const accountAge = await this.calculateAccountAge(address, transactionCount);

      const analysis: WalletAnalysis = {
        address,
        balance: balanceEth,
        balanceWei: balance.toString(),
        transactionCount,
        tokens,
        accountAge,
        firstSeen: this.estimateFirstSeen(accountAge),
        lastSeen: 'Recent', // Would need API for actual last transaction
        isContract,
        riskScore: this.calculateRiskScore({
          balance: parseFloat(balanceEth),
          transactionCount,
          accountAge,
          isContract
        })
      };

      return analysis;

    } catch (error) {
      throw new Error(`Failed to analyze wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getTokenHoldings(address: string): Promise<TokenInfo[]> {
    // Simplified token detection for Somnia network
    // In production, use services like:
    // - Moralis API
    // - Alchemy Token API  
    // - Somnia-specific APIs
    
    const somniaTokens = [
      { address: '0x1234567890123456789012345678901234567890', symbol: 'SOMNIA', name: 'Somnia Token' },
      { address: '0x2345678901234567890123456789012345678901', symbol: 'SUSDC', name: 'Somnia USD Coin' },
      { address: '0x3456789012345678901234567890123456789012', symbol: 'SETH', name: 'Somnia ETH' }
    ];

    const tokens: TokenInfo[] = [];

    // Check common Somnia tokens
    for (const token of somniaTokens.slice(0, 2)) { // Limit to avoid rate limits
      try {
        const contract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
          this.provider
        );

        const balance = await contract.balanceOf(address);
        const decimals = await contract.decimals();

        if (balance > 0) {
          tokens.push({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            balance: ethers.formatUnits(balance, decimals),
            decimals
          });
        }
      } catch (error) {
        if (this.config.verbose) {
          console.log(chalk.gray(`⚠️ Could not check token ${token.symbol}`));
        }
      }
    }

    return tokens;
  }

  private async calculateAccountAge(address: string, transactionCount: number): Promise<number> {
    // Simplified calculation for Somnia - would need first transaction timestamp for accuracy
    // Using transaction count as a rough proxy for account age
    const avgTxPerDay = 2; // Conservative estimate for Somnia
    return Math.floor(transactionCount / avgTxPerDay) || 1;
  }

  private estimateFirstSeen(accountAge: number): string {
    const date = new Date();
    date.setDate(date.getDate() - accountAge);
    return date.toISOString().split('T')[0];
  }

  private calculateRiskScore(data: {
    balance: number;
    transactionCount: number;
    accountAge: number;
    isContract: boolean;
  }): number {
    let score = 50; // Base score

    // Balance factor
    if (data.balance > 10) score -= 20;
    else if (data.balance < 0.1) score += 15;

    // Activity factor
    if (data.transactionCount > 100) score -= 15;
    else if (data.transactionCount < 5) score += 20;

    // Age factor
    if (data.accountAge > 365) score -= 10;
    else if (data.accountAge < 30) score += 15;

    // Contract factor
    if (data.isContract) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  async checkMultipleWallets(addresses: string[]): Promise<WalletAnalysis[]> {
    const results: WalletAnalysis[] = [];
    
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      
      if (this.config.verbose) {
        console.log(chalk.gray(`Progress: ${i + 1}/${addresses.length} - ${address}`));
      }

      try {
        const analysis = await this.analyzeWallet(address);
        results.push(analysis);
      } catch (error) {
        console.error(chalk.red(`❌ Failed to analyze ${address}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }

      // Rate limiting for Somnia network
      if (i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  async findWealthyWallets(addresses: string[], minBalance: number): Promise<WalletAnalysis[]> {
    const analyses = await this.checkMultipleWallets(addresses);
    
    return analyses.filter(wallet => 
      parseFloat(wallet.balance) >= minBalance
    ).sort((a, b) => 
      parseFloat(b.balance) - parseFloat(a.balance)
    );
  }
}

export default WalletAnalyzer;

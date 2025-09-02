import { JsonRpcProvider, Block, TransactionRequest, TransactionResponse, TransactionReceipt, FeeData } from 'ethers';
import { SomniaNetworkConfig, SomniaNetwork, SOMNIA_NETWORKS, CallOptions, SimulationResult, ErrorTrace } from './types';

/**
 * Enhanced provider for Somnia network with debugging and simulation capabilities
 */
export class SomniaProvider extends JsonRpcProvider {
  private networkConfig: SomniaNetworkConfig;
  private debug: boolean;
  private timeout: number;
  private retries: number;

  constructor(
    network: SomniaNetwork | SomniaNetworkConfig,
    options: {
      apiKey?: string;
      timeout?: number;
      retries?: number;
      debug?: boolean;
    } = {}
  ) {
    // Determine network configuration
    const config = typeof network === 'string' ? SOMNIA_NETWORKS[network] : network;
    
    // Initialize with RPC URL
    super(config.rpcUrl, {
      chainId: config.chainId,
      name: config.name
    });

    this.networkConfig = config;
    this.debug = options.debug || false;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;

    // Configure provider options
    this._getConnection().timeout = this.timeout;
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): SomniaNetworkConfig {
    return this.networkConfig;
  }

  /**
   * Enhanced gas estimation with Somnia-specific optimizations
   */
  async estimateGasOptimized(transaction: TransactionRequest): Promise<bigint> {
    try {
      // Try standard estimation first
      let gasEstimate = await this.estimateGas(transaction);
      
      // Add buffer for Somnia network specifics (10% buffer)
      gasEstimate = (gasEstimate * BigInt(110)) / BigInt(100);
      
      if (this.debug) {
        console.log(`[SomniaProvider] Gas estimate: ${gasEstimate.toString()}`);
      }
      
      return gasEstimate;
    } catch (error) {
      if (this.debug) {
        console.error('[SomniaProvider] Gas estimation failed:', error);
      }
      throw error;
    }
  }

  /**
   * Simulate a transaction without sending it
   */
  async simulateTransaction(transaction: TransactionRequest): Promise<SimulationResult> {
    try {
      // Use eth_call for simulation
      const result = await this.call(transaction);
      
      // Get gas estimate
      const gasUsed = await this.estimateGas(transaction);
      
      return {
        success: true,
        gasUsed,
        gasLimit: gasUsed,
        returnData: result
      };
    } catch (error: any) {
      // Parse error details
      const errorInfo = this.parseError(error);
      
      return {
        success: false,
        gasUsed: BigInt(0),
        gasLimit: BigInt(0),
        error: errorInfo
      };
    }
  }

  /**
   * Trace a failed transaction to get detailed error information
   */
  async traceTransaction(txHash: string): Promise<ErrorTrace | null> {
    try {
      // Get transaction details
      const tx = await this.getTransaction(txHash);
      const receipt = await this.getTransactionReceipt(txHash);
      
      if (!tx || !receipt) {
        return null;
      }

      // If transaction succeeded, no error trace needed
      if (receipt.status === 1) {
        return null;
      }

      // Try to get revert reason
      let revertReason: string | undefined;
      try {
        await this.call({
          to: tx.to,
          data: tx.data,
          from: tx.from,
          value: tx.value,
          gasLimit: tx.gasLimit,
          gasPrice: tx.gasPrice
        });
      } catch (error: any) {
        revertReason = this.extractRevertReason(error);
      }

      return {
        error: 'Transaction reverted',
        reason: revertReason || 'Unknown revert reason',
        gasUsed: receipt.gasUsed,
        revertReason
      };
    } catch (error: any) {
      if (this.debug) {
        console.error('[SomniaProvider] Transaction trace failed:', error);
      }
      
      return {
        error: error.message || 'Failed to trace transaction',
        gasUsed: BigInt(0)
      };
    }
  }

  /**
   * Get detailed fee data for Somnia network
   */
  async getSomniaFeeData(): Promise<FeeData> {
    const feeData = await this.getFeeData();
    
    // Somnia-specific fee adjustments if needed
    if (this.networkConfig.chainId === 50311) { // Testnet
      // Testnet might have different fee structure
      return feeData;
    }
    
    return feeData;
  }

  /**
   * Wait for transaction with enhanced error reporting
   */
  async waitForTransactionEnhanced(
    txHash: string,
    confirmations: number = 1,
    timeout?: number
  ): Promise<TransactionReceipt | null> {
    try {
      const receipt = await this.waitForTransaction(txHash, confirmations, timeout || this.timeout);
      
      if (receipt && receipt.status === 0) {
        // Transaction failed, get error trace
        const trace = await this.traceTransaction(txHash);
        if (trace && this.debug) {
          console.error('[SomniaProvider] Transaction failed:', trace);
        }
      }
      
      return receipt;
    } catch (error) {
      if (this.debug) {
        console.error('[SomniaProvider] Transaction wait failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get current block with caching
   */
  async getCurrentBlock(): Promise<Block | null> {
    return await this.getBlock('latest');
  }

  /**
   * Check if address is a contract
   */
  async isContract(address: string): Promise<boolean> {
    try {
      const code = await this.getCode(address);
      return code !== '0x';
    } catch {
      return false;
    }
  }

  /**
   * Parse error from provider response
   */
  private parseError(error: any): { reason: string; code?: string; data?: string } {
    // Handle different error formats
    if (error.reason) {
      return {
        reason: error.reason,
        code: error.code,
        data: error.data
      };
    }
    
    if (error.message) {
      return {
        reason: error.message,
        code: error.code
      };
    }
    
    return {
      reason: 'Unknown error',
      data: JSON.stringify(error)
    };
  }

  /**
   * Extract revert reason from error
   */
  private extractRevertReason(error: any): string | undefined {
    // Try different methods to extract revert reason
    if (error.reason) {
      return error.reason;
    }
    
    if (error.data && typeof error.data === 'string') {
      // Try to decode error data
      try {
        // Remove 0x prefix and error selector (first 4 bytes)
        const data = error.data.slice(10);
        if (data.length > 0) {
          // Try to decode as string (simplified)
          const decoded = Buffer.from(data, 'hex').toString();
          if (decoded.length > 0) {
            return decoded;
          }
        }
      } catch {
        // Ignore decoding errors
      }
    }
    
    return undefined;
  }

  /**
   * Perform RPC call with retries
   */
  async sendWithRetries(method: string, params: any[]): Promise<any> {
    let lastError: Error;
    
    for (let i = 0; i < this.retries; i++) {
      try {
        return await this.send(method, params);
      } catch (error: any) {
        lastError = error;
        
        if (this.debug) {
          console.warn(`[SomniaProvider] RPC call attempt ${i + 1} failed:`, error.message);
        }
        
        // Wait before retry (exponential backoff)
        if (i < this.retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError!;
  }
}

/**
 * Create a provider for a specific Somnia network
 */
export function createProvider(
  network: SomniaNetwork | SomniaNetworkConfig,
  options?: {
    apiKey?: string;
    timeout?: number;
    retries?: number;
    debug?: boolean;
  }
): SomniaProvider {
  return new SomniaProvider(network, options);
}

/**
 * Get the default provider for Somnia testnet
 */
export function getDefaultProvider(): SomniaProvider {
  return createProvider(SomniaNetwork.TESTNET);
}
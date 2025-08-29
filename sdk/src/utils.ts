import { isAddress, getAddress, formatEther, parseEther, formatUnits, parseUnits } from 'ethers';

/**
 * Address utilities
 */
export class AddressUtils {
  /**
   * Check if string is a valid Ethereum address
   */
  static isValidAddress(address: string): boolean {
    return isAddress(address);
  }

  /**
   * Convert address to checksummed format
   */
  static toChecksumAddress(address: string): string {
    return getAddress(address);
  }

  /**
   * Compare two addresses (case-insensitive)
   */
  static areEqual(address1: string, address2: string): boolean {
    try {
      return getAddress(address1) === getAddress(address2);
    } catch {
      return false;
    }
  }

  /**
   * Validate and normalize address
   */
  static normalize(address: string): string {
    if (!isAddress(address)) {
      throw new Error('Invalid address format');
    }
    return getAddress(address);
  }

  /**
   * Get short address format (0x1234...abcd)
   */
  static toShort(address: string, startChars: number = 6, endChars: number = 4): string {
    if (!isAddress(address)) {
      return address;
    }
    
    const normalized = getAddress(address);
    if (normalized.length <= startChars + endChars + 2) {
      return normalized;
    }
    
    return `${normalized.slice(0, startChars)}...${normalized.slice(-endChars)}`;
  }
}

/**
 * Number formatting utilities
 */
export class NumberUtils {
  /**
   * Format wei to ether string
   */
  static formatEther(wei: bigint): string {
    return formatEther(wei);
  }

  /**
   * Parse ether string to wei
   */
  static parseEther(ether: string): bigint {
    return parseEther(ether);
  }

  /**
   * Format wei to units with specified decimals
   */
  static formatUnits(value: bigint, decimals: number = 18): string {
    return formatUnits(value, decimals);
  }

  /**
   * Parse units string to wei with specified decimals
   */
  static parseUnits(value: string, decimals: number = 18): bigint {
    return parseUnits(value, decimals);
  }

  /**
   * Format number with commas
   */
  static formatWithCommas(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString();
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Format gas price in gwei
   */
  static formatGwei(wei: bigint): string {
    return formatUnits(wei, 9);
  }

  /**
   * Parse gwei to wei
   */
  static parseGwei(gwei: string): bigint {
    return parseUnits(gwei, 9);
  }

  /**
   * Format large numbers with suffixes (K, M, B)
   */
  static formatLarge(value: number): string {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    }
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toString();
  }
}

/**
 * Time utilities
 */
export class TimeUtils {
  /**
   * Format timestamp to readable date
   */
  static formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Get time ago string
   */
  static timeAgo(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) {
      return `${diff} seconds ago`;
    }
    if (diff < 3600) {
      return `${Math.floor(diff / 60)} minutes ago`;
    }
    if (diff < 86400) {
      return `${Math.floor(diff / 3600)} hours ago`;
    }
    return `${Math.floor(diff / 86400)} days ago`;
  }

  /**
   * Format duration in seconds
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Get current timestamp
   */
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }
}

/**
 * Transaction utilities
 */
export class TransactionUtils {
  /**
   * Get transaction explorer URL
   */
  static getExplorerUrl(txHash: string, networkName: string): string {
    const explorers: Record<string, string> = {
      'mainnet': 'https://somnia.blockscout.com',
      'testnet': 'https://somnia-testnet.blockscout.com',
      'local': ''
    };

    const baseUrl = explorers[networkName] || explorers['testnet'];
    return baseUrl ? `${baseUrl}/tx/${txHash}` : '';
  }

  /**
   * Get address explorer URL
   */
  static getAddressExplorerUrl(address: string, networkName: string): string {
    const explorers: Record<string, string> = {
      'mainnet': 'https://somnia.blockscout.com',
      'testnet': 'https://somnia-testnet.blockscout.com',
      'local': ''
    };

    const baseUrl = explorers[networkName] || explorers['testnet'];
    return baseUrl ? `${baseUrl}/address/${address}` : '';
  }

  /**
   * Calculate transaction fee
   */
  static calculateFee(gasUsed: bigint, gasPrice: bigint): bigint {
    return gasUsed * gasPrice;
  }

  /**
   * Estimate transaction cost in USD (placeholder)
   */
  static async estimateCostUSD(
    gasUsed: bigint, 
    gasPrice: bigint, 
    ethPriceUSD: number = 2000
  ): Promise<number> {
    const costETH = Number(formatEther(gasUsed * gasPrice));
    return costETH * ethPriceUSD;
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Parse contract error
   */
  static parseContractError(error: any): {
    type: string;
    message: string;
    details?: any;
  } {
    if (error.reason) {
      return {
        type: 'revert',
        message: error.reason,
        details: error
      };
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return {
        type: 'insufficient_funds',
        message: 'Insufficient funds for transaction',
        details: error
      };
    }

    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        type: 'gas_estimation_failed',
        message: 'Cannot estimate gas - transaction may fail',
        details: error
      };
    }

    return {
      type: 'unknown',
      message: error.message || 'Unknown error occurred',
      details: error
    };
  }

  /**
   * Check if error is user rejection
   */
  static isUserRejection(error: any): boolean {
    return error.code === 'ACTION_REJECTED' || 
           error.code === 4001 ||
           error.message?.includes('User rejected');
  }

  /**
   * Format error for user display
   */
  static formatUserError(error: any): string {
    const parsed = ErrorUtils.parseContractError(error);
    
    switch (parsed.type) {
      case 'revert':
        return `Transaction failed: ${parsed.message}`;
      case 'insufficient_funds':
        return 'Insufficient funds to complete transaction';
      case 'gas_estimation_failed':
        return 'Cannot estimate gas - please check contract parameters';
      default:
        return `Error: ${parsed.message}`;
    }
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate private key
   */
  static isValidPrivateKey(privateKey: string): boolean {
    const cleaned = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    return /^[a-fA-F0-9]{64}$/.test(cleaned);
  }

  /**
   * Validate mnemonic phrase
   */
  static isValidMnemonic(mnemonic: string): boolean {
    const words = mnemonic.trim().split(/\s+/);
    return [12, 15, 18, 21, 24].includes(words.length);
  }

  /**
   * Validate amount string
   */
  static isValidAmount(amount: string): boolean {
    try {
      const parsed = parseFloat(amount);
      return !isNaN(parsed) && parsed >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate gas value
   */
  static isValidGas(gas: string): boolean {
    try {
      const parsed = parseInt(gas);
      return !isNaN(parsed) && parsed > 0 && parsed <= 30000000; // Max block gas limit
    } catch {
      return false;
    }
  }

  /**
   * Validate hex string
   */
  static isValidHex(hex: string): boolean {
    return /^0x[a-fA-F0-9]*$/.test(hex);
  }
}

/**
 * Debugging utilities
 */
export class DebugUtils {
  private static debug: boolean = false;

  /**
   * Enable debug mode
   */
  static enableDebug(): void {
    DebugUtils.debug = true;
  }

  /**
   * Disable debug mode
   */
  static disableDebug(): void {
    DebugUtils.debug = false;
  }

  /**
   * Log debug message
   */
  static log(message: string, data?: any): void {
    if (DebugUtils.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [Somnia SDK] ${message}`, data || '');
    }
  }

  /**
   * Log error
   */
  static error(message: string, error?: any): void {
    if (DebugUtils.debug) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [Somnia SDK ERROR] ${message}`, error || '');
    }
  }

  /**
   * Log warning
   */
  static warn(message: string, data?: any): void {
    if (DebugUtils.debug) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [Somnia SDK WARN] ${message}`, data || '');
    }
  }

  /**
   * Measure execution time
   */
  static async measureTime<T>(
    label: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      DebugUtils.log(`${label} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      DebugUtils.error(`${label} failed after ${(end - start).toFixed(2)}ms`, error);
      throw error;
    }
  }
}

/**
 * Storage utilities (in-memory storage for Node.js compatibility)
 */
export class StorageUtils {
  private static storage: Map<string, string> = new Map();

  /**
   * Save data to storage
   */
  static save(key: string, data: any): void {
    this.storage.set(key, JSON.stringify(data));
  }

  /**
   * Load data from storage
   */
  static load<T>(key: string): T | null {
    const item = this.storage.get(key);
    return item ? JSON.parse(item) : null;
  }

  /**
   * Remove data from storage
   */
  static remove(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Clear all data from storage
   */
  static clear(): void {
    this.storage.clear();
  }

  /**
   * Get all keys in storage
   */
  static keys(): string[] {
    return Array.from(this.storage.keys());
  }

  /**
   * Check if key exists in storage
   */
  static has(key: string): boolean {
    return this.storage.has(key);
  }
}

/**
 * Retry utilities
 */
export class RetryUtils {
  /**
   * Retry function with exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries) {
          break;
        }

        // Wait with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }

    throw lastError!;
  }

  /**
   * Retry with custom condition
   */
  static async withRetryCondition<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error) => boolean,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i === maxRetries || !shouldRetry(lastError)) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
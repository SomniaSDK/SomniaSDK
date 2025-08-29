// Core exports
export * from './types';
export * from './provider';
export * from './wallet';
export * from './contract';
export * from './deploy';
export * from './utils';

// Main SDK class
import { SomniaProvider, createProvider } from './provider';
import { SomniaWallet, WalletFactory } from './wallet';
import { SomniaDeployer, createDeployer } from './deploy';
import { ContractFactory } from './contract';
import { 
  SomniaSDKConfig, 
  SomniaNetwork, 
  SomniaNetworkConfig,
  SOMNIA_NETWORKS 
} from './types';
import { DebugUtils } from './utils';

/**
 * Main Somnia SDK class - the primary entry point for developers
 */
export class SomniaSDK {
  public readonly provider: SomniaProvider;
  public deployer?: SomniaDeployer;
  public wallet?: SomniaWallet;
  private config: SomniaSDKConfig;

  constructor(config: SomniaSDKConfig) {
    this.config = config;

    // Enable debug mode if specified
    if (config.debug) {
      DebugUtils.enableDebug();
    }

    // Create provider
    this.provider = createProvider(config.network, {
      apiKey: config.apiKey,
      timeout: config.timeout,
      retries: config.retries,
      debug: config.debug
    });

    // Create wallet if configuration provided
    if (config.wallet) {
      this.wallet = WalletFactory.fromConfig(config.wallet, this.provider);
      this.deployer = createDeployer(this.provider, this.wallet);
    }

    DebugUtils.log('Somnia SDK initialized', {
      network: typeof config.network === 'string' ? config.network : config.network.name,
      hasWallet: !!this.wallet,
      debug: config.debug
    });
  }

  /**
   * Connect a wallet to the SDK
   */
  connectWallet(wallet: SomniaWallet): void {
    this.wallet = wallet.connect(this.provider);
    this.deployer = createDeployer(this.provider, this.wallet);
    DebugUtils.log('Wallet connected', { address: this.wallet.getAddress() });
  }

  /**
   * Create a new random wallet
   */
  createWallet(): SomniaWallet {
    const wallet = WalletFactory.createRandom(this.provider);
    this.connectWallet(wallet);
    return wallet;
  }

  /**
   * Import wallet from private key
   */
  importWallet(privateKey: string): SomniaWallet {
    const wallet = WalletFactory.fromPrivateKey(privateKey, this.provider);
    this.connectWallet(wallet);
    return wallet;
  }

  /**
   * Import wallet from mnemonic
   */
  importWalletFromMnemonic(mnemonic: string, path?: string): SomniaWallet {
    const wallet = WalletFactory.fromMnemonic(mnemonic, path, this.provider);
    this.connectWallet(wallet);
    return wallet;
  }

  /**
   * Connect to an existing contract
   */
  getContract(address: string, abi: any[]): any {
    return ContractFactory.create(address, abi, this.provider, this.wallet);
  }

  /**
   * Deploy a new contract
   */
  async deployContract(
    bytecode: string,
    abi: any[],
    constructorArgs: any[] = [],
    config: any = {}
  ): Promise<any> {
    if (!this.deployer) {
      throw new Error('No wallet connected - cannot deploy contracts');
    }
    
    return await this.deployer.deployContract(bytecode, abi, constructorArgs, config);
  }

  /**
   * Simulate a contract deployment
   */
  async simulateDeployment(
    bytecode: string,
    abi: any[],
    constructorArgs: any[] = [],
    config: any = {}
  ): Promise<any> {
    if (!this.deployer) {
      throw new Error('No wallet connected - cannot simulate deployment');
    }
    
    return await this.deployer.simulateDeployment(bytecode, abi, constructorArgs, config);
  }

  /**
   * Get current network configuration
   */
  getNetworkConfig(): SomniaNetworkConfig {
    return this.provider.getNetworkConfig();
  }

  /**
   * Get wallet balance
   */
  async getBalance(address?: string): Promise<bigint> {
    const addr = address || this.wallet?.getAddress();
    if (!addr) {
      throw new Error('No address provided and no wallet connected');
    }
    
    return await this.provider.getBalance(addr);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getSomniaFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Wait for transaction
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout?: number
  ): Promise<any> {
    return await this.provider.waitForTransactionEnhanced(txHash, confirmations, timeout);
  }

  /**
   * Trace a transaction for debugging
   */
  async traceTransaction(txHash: string): Promise<any> {
    return await this.provider.traceTransaction(txHash);
  }

  /**
   * Check if address is a contract
   */
  async isContract(address: string): Promise<boolean> {
    return await this.provider.isContract(address);
  }

  /**
   * Switch to a different network
   */
  switchNetwork(network: SomniaNetwork | SomniaNetworkConfig): SomniaSDK {
    const newConfig = {
      ...this.config,
      network
    };
    
    return new SomniaSDK(newConfig);
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    if (enabled) {
      DebugUtils.enableDebug();
    } else {
      DebugUtils.disableDebug();
    }
  }

  /**
   * Get SDK configuration
   */
  getConfig(): SomniaSDKConfig {
    return { ...this.config };
  }
}

/**
 * Create a new Somnia SDK instance
 */
export function createSomniaSDK(config: SomniaSDKConfig): SomniaSDK {
  return new SomniaSDK(config);
}

/**
 * Quick setup for testnet development
 */
export function createTestnetSDK(privateKey?: string): SomniaSDK {
  const config: SomniaSDKConfig = {
    network: SomniaNetwork.TESTNET,
    debug: true
  };

  if (privateKey) {
    config.wallet = { privateKey };
  }

  return new SomniaSDK(config);
}

/**
 * Quick setup for mainnet
 */
export function createMainnetSDK(privateKey?: string): SomniaSDK {
  const config: SomniaSDKConfig = {
    network: SomniaNetwork.MAINNET,
    debug: false
  };

  if (privateKey) {
    config.wallet = { privateKey };
  }

  return new SomniaSDK(config);
}

/**
 * Quick setup for local development
 */
export function createLocalSDK(privateKey?: string): SomniaSDK {
  const config: SomniaSDKConfig = {
    network: SomniaNetwork.LOCAL,
    debug: true
  };

  if (privateKey) {
    config.wallet = { privateKey };
  }

  return new SomniaSDK(config);
}

// Export network configurations for convenience
export { SOMNIA_NETWORKS, SomniaNetwork };

// Default export
export default SomniaSDK;
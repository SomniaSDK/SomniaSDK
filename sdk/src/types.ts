import { BigNumberish, TransactionReceipt, TransactionRequest, TransactionResponse } from 'ethers';

/**
 * Somnia network configuration
 */
export interface SomniaNetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  currency: {
    symbol: string;
    decimals: number;
  };
}

/**
 * Supported Somnia networks
 */
export enum SomniaNetwork {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
  LOCAL = 'local'
}

/**
 * Network configurations for Somnia
 */
export const SOMNIA_NETWORKS: Record<SomniaNetwork, SomniaNetworkConfig> = {
  [SomniaNetwork.TESTNET]: {
    name: 'Somnia Testnet',
    chainId: 50312, // Updated chain ID
    rpcUrl: 'https://dream-rpc.somnia.network',
    blockExplorer: 'https://somnia-testnet.blockscout.com',
    currency: {
      symbol: 'STT',
      decimals: 18
    }
  },
  [SomniaNetwork.MAINNET]: {
    name: 'Somnia Mainnet',
    chainId: 2648,
    rpcUrl: 'https://rpc.somnia.network',
    blockExplorer: 'https://somnia.blockscout.com',
    currency: {
      symbol: 'SOM',
      decimals: 18
    }
  },
  [SomniaNetwork.LOCAL]: {
    name: 'Local Somnia',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    blockExplorer: '',
    currency: {
      symbol: 'ETH',
      decimals: 18
    }
  }
};

/**
 * Contract deployment configuration
 */
export interface DeploymentConfig {
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  value?: BigNumberish;
  nonce?: number;
}

/**
 * Contract deployment result
 */
export interface DeploymentResult {
  contract: SomniaContract;
  address: string;
  transactionHash: string;
  receipt: TransactionReceipt;
  deploymentCost: bigint;
}

/**
 * Transaction simulation result
 */
export interface SimulationResult {
  success: boolean;
  gasUsed: bigint;
  gasLimit: bigint;
  returnData?: string;
  error?: {
    reason: string;
    code?: string;
    data?: string;
  };
  events?: Array<{
    address: string;
    topics: string[];
    data: string;
    eventName?: string;
    args?: any[];
  }>;
  stateDiff?: {
    [address: string]: {
      balance?: {
        before: string;
        after: string;
      };
      storage?: {
        [slot: string]: {
          before: string;
          after: string;
        };
      };
    };
  };
}

/**
 * Error trace information
 */
export interface ErrorTrace {
  error: string;
  reason?: string;
  code?: string;
  stackTrace?: string[];
  gasUsed: bigint;
  revertReason?: string;
  sourceLocation?: {
    file: string;
    line: number;
    column: number;
  };
}

/**
 * Contract interaction options
 */
export interface CallOptions {
  from?: string;
  value?: BigNumberish;
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  blockTag?: string | number;
}

/**
 * Transaction options for contract calls
 */
export interface TransactionOptions extends CallOptions {
  nonce?: number;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
}

/**
 * Wallet configuration
 */
export interface WalletConfig {
  privateKey?: string;
  mnemonic?: string;
  path?: string;
  password?: string;
}

/**
 * Contract ABI type definitions
 */
export interface ContractABI {
  type: string;
  name?: string;
  inputs?: Array<{
    name: string;
    type: string;
    indexed?: boolean;
  }>;
  outputs?: Array<{
    name: string;
    type: string;
  }>;
  stateMutability?: string;
  payable?: boolean;
  constant?: boolean;
}

/**
 * Contract interface for Somnia SDK
 */
export interface SomniaContract {
  address: string;
  abi: ContractABI[];
  interface: any;
  
  // Core contract methods
  getFunction(name: string): any;
  connect(runner: any): SomniaContract;
  
  // Enhanced Somnia-specific methods
  deployTransaction?: TransactionResponse;
  waitForDeployment(): Promise<SomniaContract>;
  
  // Simulation and debugging
  simulate(methodName: string, args: any[], options?: CallOptions): Promise<SimulationResult>;
  traceCall(methodName: string, args: any[], options?: CallOptions): Promise<ErrorTrace | null>;
  
  // Events
  queryFilter(event: string, fromBlock?: number, toBlock?: number): Promise<any[]>;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener?: (...args: any[]) => void): void;
}

/**
 * Somnia SDK configuration
 */
export interface SomniaSDKConfig {
  network: SomniaNetwork | SomniaNetworkConfig;
  wallet?: WalletConfig;
  rpcUrl?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

/**
 * Gas estimation result
 */
export interface GasEstimation {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCost: bigint;
}

/**
 * Contract compilation result
 */
export interface CompilationResult {
  bytecode: string;
  abi: ContractABI[];
  metadata?: any;
  sourceMap?: string;
  deployedBytecode?: string;
}
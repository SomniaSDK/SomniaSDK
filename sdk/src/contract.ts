import { Contract, Interface, TransactionResponse, TransactionReceipt } from 'ethers';
import { SomniaProvider } from './provider';
import { SomniaWallet } from './wallet';
import { 
  ContractABI, 
  SomniaContract, 
  CallOptions, 
  TransactionOptions, 
  SimulationResult, 
  ErrorTrace 
} from './types';

/**
 * Enhanced contract wrapper for Somnia with debugging and simulation capabilities
 */
export class SomniaContractWrapper implements SomniaContract {
  public readonly address: string;
  public readonly abi: ContractABI[];
  public readonly interface: Interface;
  public deployTransaction?: TransactionResponse;

  private contract: Contract;
  private provider: SomniaProvider;
  private signer?: SomniaWallet;

  constructor(
    address: string,
    abi: ContractABI[],
    provider: SomniaProvider,
    signer?: SomniaWallet
  ) {
    this.address = address;
    this.abi = abi;
    this.interface = new Interface(abi);
    this.provider = provider;
    this.signer = signer;

    // Create the underlying ethers contract
    const runner = signer ? signer.getWallet() : provider;
    this.contract = new Contract(address, abi, runner);
  }

  /**
   * Get a specific function from the contract
   */
  getFunction(name: string): any {
    return this.contract.getFunction(name);
  }

  /**
   * Connect the contract to a different runner (wallet or provider)
   */
  connect(runner: SomniaProvider | SomniaWallet): SomniaContract {
    const ethersRunner = runner instanceof SomniaWallet ? runner.getWallet() : runner;
    const newSigner = runner instanceof SomniaWallet ? runner : undefined;
    
    return new SomniaContractWrapper(
      this.address,
      this.abi,
      this.provider,
      newSigner
    );
  }

  /**
   * Wait for the contract deployment to be mined
   */
  async waitForDeployment(): Promise<SomniaContract> {
    if (this.deployTransaction) {
      await this.deployTransaction.wait();
    }
    return this;
  }

  /**
   * Simulate a contract method call without sending a transaction
   */
  async simulate(
    methodName: string, 
    args: any[] = [], 
    options: CallOptions = {}
  ): Promise<SimulationResult> {
    try {
      // Encode the function call
      const data = this.interface.encodeFunctionData(methodName, args);
      
      // Create transaction request
      const transaction = {
        to: this.address,
        data,
        from: options.from,
        value: options.value,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice
      };

      // Simulate using provider
      return await this.provider.simulateTransaction(transaction);
    } catch (error: any) {
      return {
        success: false,
        gasUsed: BigInt(0),
        gasLimit: BigInt(0),
        error: {
          reason: error.message || 'Simulation failed',
          code: error.code,
          data: error.data
        }
      };
    }
  }

  /**
   * Trace a contract method call to get detailed error information
   */
  async traceCall(
    methodName: string, 
    args: any[] = [], 
    options: CallOptions = {}
  ): Promise<ErrorTrace | null> {
    try {
      // First try to simulate the call
      const simulation = await this.simulate(methodName, args, options);
      
      if (simulation.success) {
        return null; // No error to trace
      }

      // If simulation failed, create error trace
      return {
        error: simulation.error?.reason || 'Call failed',
        reason: simulation.error?.reason,
        code: simulation.error?.code,
        gasUsed: simulation.gasUsed,
        revertReason: simulation.error?.reason
      };
    } catch (error: any) {
      return {
        error: error.message || 'Trace failed',
        gasUsed: BigInt(0)
      };
    }
  }

  /**
   * Call a read-only contract method
   */
  async call(methodName: string, args: any[] = [], options: CallOptions = {}): Promise<any> {
    try {
      const func = this.getFunction(methodName);
      const blockTag = options.blockTag || 'latest';
      
      // Use static call for read-only methods
      if (blockTag === 'latest') {
        return await func.staticCall(...args, {
          from: options.from,
          value: options.value,
          gasLimit: options.gasLimit,
          gasPrice: options.gasPrice
        });
      } else {
        // For historical calls, we need to use provider.call
        const data = this.interface.encodeFunctionData(methodName, args);
        const result = await this.provider.call({
          to: this.address,
          data,
          from: options.from,
          value: options.value
        });
        
        return this.interface.decodeFunctionResult(methodName, result);
      }
    } catch (error: any) {
      throw new Error(`Contract call failed: ${error.message}`);
    }
  }

  /**
   * Send a transaction to a contract method
   */
  async send(
    methodName: string, 
    args: any[] = [], 
    options: TransactionOptions = {}
  ): Promise<TransactionResponse> {
    if (!this.signer) {
      throw new Error('Contract is not connected to a signer');
    }

    try {
      const func = this.getFunction(methodName);
      
      // Prepare transaction options
      const txOptions: any = {};
      if (options.value) txOptions.value = options.value;
      if (options.gasLimit) txOptions.gasLimit = options.gasLimit;
      if (options.gasPrice) txOptions.gasPrice = options.gasPrice;
      if (options.maxFeePerGas) txOptions.maxFeePerGas = options.maxFeePerGas;
      if (options.maxPriorityFeePerGas) txOptions.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      if (options.nonce) txOptions.nonce = options.nonce;

      // Send transaction
      return await func(...args, txOptions);
    } catch (error: any) {
      throw new Error(`Contract transaction failed: ${error.message}`);
    }
  }

  /**
   * Estimate gas for a contract method call
   */
  async estimateGas(
    methodName: string, 
    args: any[] = [], 
    options: CallOptions = {}
  ): Promise<bigint> {
    try {
      const data = this.interface.encodeFunctionData(methodName, args);
      
      return await this.provider.estimateGasOptimized({
        to: this.address,
        data,
        from: options.from,
        value: options.value
      });
    } catch (error: any) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Query past events
   */
  async queryFilter(
    event: string, 
    fromBlock?: number, 
    toBlock?: number
  ): Promise<any[]> {
    try {
      const filter = this.contract.filters[event]();
      return await this.contract.queryFilter(filter, fromBlock, toBlock);
    } catch (error: any) {
      throw new Error(`Event query failed: ${error.message}`);
    }
  }

  /**
   * Listen for events
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.contract.on(event, listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener?: (...args: any[]) => void): void {
    if (listener) {
      this.contract.off(event, listener);
    } else {
      this.contract.removeAllListeners(event);
    }
  }

  /**
   * Get all function names in the contract
   */
  getFunctionNames(): string[] {
    const functions: string[] = [];
    this.interface.forEachFunction((func) => {
      functions.push(func.name);
    });
    return functions;
  }

  /**
   * Get all event names in the contract
   */
  getEventNames(): string[] {
    const events: string[] = [];
    this.interface.forEachEvent((event) => {
      events.push(event.name);
    });
    return events;
  }

  /**
   * Get contract info
   */
  getContractInfo(): {
    address: string;
    functions: string[];
    events: string[];
    isDeployed: boolean;
  } {
    return {
      address: this.address,
      functions: this.getFunctionNames(),
      events: this.getEventNames(),
      isDeployed: !!this.deployTransaction
    };
  }

  /**
   * Wait for a transaction and get enhanced receipt
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout?: number
  ): Promise<TransactionReceipt | null> {
    return await this.provider.waitForTransactionEnhanced(txHash, confirmations, timeout);
  }

  /**
   * Decode transaction data
   */
  decodeTransactionData(data: string): {
    functionName: string;
    args: any[];
  } | null {
    try {
      const result = this.interface.parseTransaction({ data });
      return {
        functionName: result?.name || 'unknown',
        args: result?.args ? Array.from(result.args) : []
      };
    } catch {
      return null;
    }
  }

  /**
   * Decode event logs
   */
  decodeEventLogs(logs: any[]): Array<{
    eventName: string;
    args: any[];
    address: string;
    blockNumber: number;
    transactionHash: string;
  }> {
    const decodedLogs: Array<{
      eventName: string;
      args: any[];
      address: string;
      blockNumber: number;
      transactionHash: string;
    }> = [];

    for (const log of logs) {
      try {
        if (log.address.toLowerCase() === this.address.toLowerCase()) {
          const parsed = this.interface.parseLog({
            topics: log.topics,
            data: log.data
          });

          if (parsed) {
            decodedLogs.push({
              eventName: parsed.name,
              args: Array.from(parsed.args),
              address: log.address,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash
            });
          }
        }
      } catch {
        // Skip logs that can't be parsed
      }
    }

    return decodedLogs;
  }
}

/**
 * Factory for creating Somnia contracts
 */
export class ContractFactory {
  /**
   * Create a contract instance
   */
  static create(
    address: string,
    abi: ContractABI[],
    provider: SomniaProvider,
    signer?: SomniaWallet
  ): SomniaContract {
    return new SomniaContractWrapper(address, abi, provider, signer);
  }

  /**
   * Create a contract instance from deployment transaction
   */
  static async fromDeployment(
    deployTx: TransactionResponse,
    abi: ContractABI[],
    provider: SomniaProvider,
    signer?: SomniaWallet
  ): Promise<SomniaContract> {
    const receipt = await deployTx.wait();
    if (!receipt || !receipt.contractAddress) {
      throw new Error('Deployment failed or contract address not found');
    }

    const contract = new SomniaContractWrapper(
      receipt.contractAddress,
      abi,
      provider,
      signer
    );
    
    contract.deployTransaction = deployTx;
    return contract;
  }

  /**
   * Connect to an existing contract
   */
  static connect(
    address: string,
    abi: ContractABI[],
    provider: SomniaProvider,
    signer?: SomniaWallet
  ): SomniaContract {
    return new SomniaContractWrapper(address, abi, provider, signer);
  }
}
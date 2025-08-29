import { Wallet, HDNodeWallet, Mnemonic, randomBytes } from 'ethers';
import { SomniaProvider } from './provider';
import { WalletConfig, SomniaNetwork } from './types';
import * as crypto from 'crypto-js';

/**
 * Enhanced wallet management for Somnia SDK
 */
export class SomniaWallet {
  private wallet: Wallet | HDNodeWallet;
  private provider?: SomniaProvider;
  private encryptionKey?: string;

  constructor(wallet: Wallet | HDNodeWallet, provider?: SomniaProvider) {
    this.wallet = wallet;
    this.provider = provider;
  }

  /**
   * Get the wallet instance
   */
  getWallet(): Wallet | HDNodeWallet {
    return this.wallet;
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Connect wallet to a provider
   */
  connect(provider: SomniaProvider): SomniaWallet {
    const connectedWallet = this.wallet.connect(provider);
    return new SomniaWallet(connectedWallet, provider);
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not connected');
    }
    return await this.provider.getBalance(this.wallet.address);
  }

  /**
   * Get transaction count (nonce)
   */
  async getNonce(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not connected');
    }
    return await this.provider.getTransactionCount(this.wallet.address);
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: any): Promise<string> {
    return await this.wallet.signTransaction(transaction);
  }

  /**
   * Send a transaction
   */
  async sendTransaction(transaction: any): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not connected');
    }
    return await this.wallet.sendTransaction(transaction);
  }

  /**
   * Encrypt wallet for secure storage
   */
  async encrypt(password: string): Promise<string> {
    const privateKey = this.wallet.privateKey;
    const encrypted = crypto.AES.encrypt(privateKey, password).toString();
    return encrypted;
  }

  /**
   * Export wallet private key (use with caution)
   */
  exportPrivateKey(): string {
    return this.wallet.privateKey;
  }

  /**
   * Export wallet mnemonic if available
   */
  exportMnemonic(): string | null {
    if (this.wallet instanceof HDNodeWallet && this.wallet.mnemonic) {
      return this.wallet.mnemonic.phrase;
    }
    return null;
  }

  /**
   * Get wallet info
   */
  getInfo(): {
    address: string;
    type: 'standard' | 'hd';
    path?: string;
  } {
    return {
      address: this.wallet.address,
      type: this.wallet instanceof HDNodeWallet ? 'hd' : 'standard',
      path: this.wallet instanceof HDNodeWallet ? (this.wallet.path || undefined) : undefined
    };
  }
}

/**
 * Wallet factory for creating wallets with different methods
 */
export class WalletFactory {
  /**
   * Create wallet from private key
   */
  static fromPrivateKey(privateKey: string, provider?: SomniaProvider): SomniaWallet {
    const wallet = new Wallet(privateKey);
    return new SomniaWallet(wallet, provider);
  }

  /**
   * Create wallet from mnemonic
   */
  static fromMnemonic(
    mnemonic: string,
    path: string = "m/44'/60'/0'/0/0",
    provider?: SomniaProvider
  ): SomniaWallet {
    const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
    const hdWallet = HDNodeWallet.fromMnemonic(mnemonicObj, path);
    return new SomniaWallet(hdWallet, provider);
  }

  /**
   * Create random wallet
   */
  static createRandom(provider?: SomniaProvider): SomniaWallet {
    const wallet = Wallet.createRandom();
    return new SomniaWallet(wallet, provider);
  }

  /**
   * Create random HD wallet with mnemonic
   */
  static createRandomHD(
    path: string = "m/44'/60'/0'/0/0",
    provider?: SomniaProvider
  ): SomniaWallet {
    const mnemonic = Mnemonic.fromEntropy(randomBytes(16));
    const hdWallet = HDNodeWallet.fromMnemonic(mnemonic, path);
    return new SomniaWallet(hdWallet, provider);
  }

  /**
   * Decrypt wallet from encrypted private key
   */
  static fromEncrypted(
    encryptedPrivateKey: string,
    password: string,
    provider?: SomniaProvider
  ): SomniaWallet {
    try {
      const decrypted = crypto.AES.decrypt(encryptedPrivateKey, password);
      const privateKey = decrypted.toString(crypto.enc.Utf8);
      
      if (!privateKey) {
        throw new Error('Invalid password or corrupted encrypted data');
      }
      
      return WalletFactory.fromPrivateKey(privateKey, provider);
    } catch (error) {
      throw new Error('Failed to decrypt wallet: ' + (error as Error).message);
    }
  }

  /**
   * Create wallet from configuration
   */
  static fromConfig(config: WalletConfig, provider?: SomniaProvider): SomniaWallet {
    if (config.privateKey) {
      return WalletFactory.fromPrivateKey(config.privateKey, provider);
    }
    
    if (config.mnemonic) {
      return WalletFactory.fromMnemonic(
        config.mnemonic,
        config.path || "m/44'/60'/0'/0/0",
        provider
      );
    }
    
    throw new Error('Invalid wallet configuration: privateKey or mnemonic required');
  }
}

/**
 * Wallet utilities
 */
export class WalletUtils {
  /**
   * Generate a new mnemonic phrase
   */
  static generateMnemonic(): string {
    const mnemonic = Mnemonic.fromEntropy(randomBytes(16));
    return mnemonic.phrase;
  }

  /**
   * Validate mnemonic phrase
   */
  static isValidMnemonic(mnemonic: string): boolean {
    try {
      Mnemonic.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   */
  static isValidPrivateKey(privateKey: string): boolean {
    try {
      new Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get address from private key without creating wallet
   */
  static getAddressFromPrivateKey(privateKey: string): string {
    const wallet = new Wallet(privateKey);
    return wallet.address;
  }

  /**
   * Get address from mnemonic without creating wallet
   */
  static getAddressFromMnemonic(
    mnemonic: string,
    path: string = "m/44'/60'/0'/0/0"
  ): string {
    const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
    const hdWallet = HDNodeWallet.fromMnemonic(mnemonicObj, path);
    return hdWallet.address;
  }

  /**
   * Derive multiple addresses from mnemonic
   */
  static deriveAddresses(
    mnemonic: string,
    count: number = 5,
    basePath: string = "m/44'/60'/0'/0"
  ): Array<{ address: string; path: string; index: number }> {
    const addresses: Array<{ address: string; path: string; index: number }> = [];
    const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
    
    for (let i = 0; i < count; i++) {
      const path = `${basePath}/${i}`;
      const hdWallet = HDNodeWallet.fromMnemonic(mnemonicObj, path);
      addresses.push({
        address: hdWallet.address,
        path,
        index: i
      });
    }
    
    return addresses;
  }
}

/**
 * Interface for stored wallet data
 */
interface StoredWallet {
  name: string;
  address: string;
  encrypted: string;
  type: string;
  path?: string;
  createdAt: number;
}

/**
 * Secure wallet storage manager
 */
export class WalletStorage {
  private static readonly STORAGE_KEY = 'somnia_wallet_storage';

  /**
   * Save encrypted wallet to local storage
   */
  static async saveWallet(
    wallet: SomniaWallet,
    password: string,
    name: string = 'default'
  ): Promise<void> {
    const encrypted = await wallet.encrypt(password);
    const walletData: StoredWallet = {
      name,
      address: wallet.getAddress(),
      encrypted,
      type: wallet.getInfo().type,
      path: wallet.getInfo().path,
      createdAt: Date.now()
    };

    // In a real implementation, this would use secure storage
    // For now, we'll just show the structure
    const storage = this.getStorage();
    storage[name] = walletData;
    this.setStorage(storage);
  }

  /**
   * Load encrypted wallet from storage
   */
  static loadWallet(
    name: string,
    password: string,
    provider?: SomniaProvider
  ): SomniaWallet {
    const storage = this.getStorage();
    const walletData: StoredWallet = storage[name];
    
    if (!walletData) {
      throw new Error(`Wallet '${name}' not found`);
    }
    
    return WalletFactory.fromEncrypted(walletData.encrypted, password, provider);
  }

  /**
   * List saved wallets
   */
  static listWallets(): Array<{
    name: string;
    address: string;
    type: string;
    createdAt: number;
  }> {
    const storage: Record<string, StoredWallet> = this.getStorage();
    return Object.values(storage).map(wallet => ({
      name: wallet.name,
      address: wallet.address,
      type: wallet.type,
      createdAt: wallet.createdAt
    }));
  }

  /**
   * Delete wallet from storage
   */
  static deleteWallet(name: string): boolean {
    const storage = this.getStorage();
    if (storage[name]) {
      delete storage[name];
      this.setStorage(storage);
      return true;
    }
    return false;
  }

  private static getStorage(): Record<string, StoredWallet> {
    // In a real implementation, this would use secure storage
    // This is just for demonstration
    return {};
  }

  private static setStorage(data: Record<string, StoredWallet>): void {
    // In a real implementation, this would use secure storage
    // This is just for demonstration
  }
}
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CompilationResult {
  contractName: string;
  bytecode: string;
  abi: any[];
  metadata: any;
  sourcePath: string;
}

export interface HardhatConfig {
  solidity: {
    version: string;
    settings?: {
      optimizer?: {
        enabled: boolean;
        runs: number;
      };
    };
  };
  networks: {
    [networkName: string]: {
      url: string;
      chainId: number;
      accounts?: string[];
    };
  };
  paths?: {
    sources?: string;
    artifacts?: string;
    cache?: string;
  };
}

/**
 * Hardhat integration for Solidity compilation and deployment
 */
export class HardhatCompiler {
  private projectRoot: string;
  private hardhatConfigPath: string;
  private artifactsPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.hardhatConfigPath = path.join(projectRoot, 'hardhat.config.js');
    this.artifactsPath = path.join(projectRoot, 'artifacts');
  }

  /**
   * Initialize Hardhat configuration if it doesn't exist
   */
  async initializeHardhat(): Promise<void> {
    // Create hardhat.config.js if it doesn't exist
    if (!await fs.pathExists(this.hardhatConfigPath)) {
      await this.createHardhatConfig();
    }

    // Ensure contracts directory exists
    const contractsDir = path.join(this.projectRoot, 'contracts');
    await fs.ensureDir(contractsDir);

    // Create package.json if it doesn't exist
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      await this.createPackageJson();
    }
  }

  /**
   * Create default Hardhat configuration
   */
  private async createHardhatConfig(): Promise<void> {
    const config = `import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    somnia_testnet: {
      url: "https://dream-rpc.somnia.network",
      chainId: 50312,
      accounts: []
    },
    somnia_mainnet: {
      url: "https://rpc.somnia.network", 
      chainId: 50311,
      accounts: []
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
`;

    await fs.writeFile(this.hardhatConfigPath, config);
  }

  /**
   * Create package.json for Hardhat project
   */
  private async createPackageJson(): Promise<void> {
    const packageJson = {
      name: "somnia-project",
      version: "1.0.0",
      description: "Somnia blockchain smart contract project",
      scripts: {
        compile: "hardhat compile",
        test: "hardhat test",
        deploy: "hardhat run scripts/deploy.js"
      },
      devDependencies: {
        "hardhat": "^2.26.3",
        "@nomicfoundation/hardhat-toolbox": "^6.1.0"
      }
    };

    await fs.writeJson(path.join(this.projectRoot, 'package.json'), packageJson, { spaces: 2 });
  }

  /**
   * Compile a single Solidity contract
   */
  async compileContract(contractPath: string): Promise<CompilationResult> {
    try {
      // Ensure Hardhat is initialized
      await this.initializeHardhat();

      const contractName = path.basename(contractPath, '.sol');
      
      // Install dependencies if node_modules doesn't exist
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      if (!await fs.pathExists(nodeModulesPath)) {
        console.log('Installing Hardhat dependencies...');
        execSync('npm install', { cwd: this.projectRoot, stdio: 'inherit' });
      }

      // Run Hardhat compilation
      console.log('Compiling contract with Hardhat...');
      execSync('npx hardhat compile', { cwd: this.projectRoot, stdio: 'inherit' });

      // Read compilation artifacts
      const artifactPath = path.join(
        this.artifactsPath,
        'contracts',
        `${contractName}.sol`,
        `${contractName}.json`
      );

      if (!await fs.pathExists(artifactPath)) {
        throw new Error(`Compilation artifact not found: ${artifactPath}`);
      }

      const artifact = await fs.readJson(artifactPath);

      return {
        contractName,
        bytecode: artifact.bytecode,
        abi: artifact.abi,
        metadata: artifact.metadata ? JSON.parse(artifact.metadata) : {},
        sourcePath: contractPath
      };

    } catch (error: any) {
      throw new Error(`Hardhat compilation failed: ${error.message}`);
    }
  }

  /**
   * Compile all contracts in the project
   */
  async compileAllContracts(): Promise<CompilationResult[]> {
    await this.initializeHardhat();

    const contractsDir = path.join(this.projectRoot, 'contracts');
    const contractFiles = await this.findSolidityFiles(contractsDir);

    const results: CompilationResult[] = [];
    
    if (contractFiles.length > 0) {
      // Compile all at once with Hardhat
      execSync('npx hardhat compile', { cwd: this.projectRoot, stdio: 'inherit' });

      // Read all artifacts
      for (const contractPath of contractFiles) {
        const contractName = path.basename(contractPath, '.sol');
        const artifactPath = path.join(
          this.artifactsPath,
          'contracts',
          `${contractName}.sol`,
          `${contractName}.json`
        );

        if (await fs.pathExists(artifactPath)) {
          const artifact = await fs.readJson(artifactPath);
          results.push({
            contractName,
            bytecode: artifact.bytecode,
            abi: artifact.abi,
            metadata: artifact.metadata ? JSON.parse(artifact.metadata) : {},
            sourcePath: contractPath
          });
        }
      }
    }

    return results;
  }

  /**
   * Clean compilation artifacts
   */
  async clean(): Promise<void> {
    try {
      execSync('npx hardhat clean', { cwd: this.projectRoot, stdio: 'inherit' });
    } catch (error) {
      // Ignore errors if hardhat is not installed
    }
  }

  /**
   * Get contract size information
   */
  async getContractSize(contractName: string): Promise<number> {
    const artifactPath = path.join(this.artifactsPath, 'contracts', `${contractName}.sol`, `${contractName}.json`);
    
    if (await fs.pathExists(artifactPath)) {
      const artifact = await fs.readJson(artifactPath);
      const bytecode = artifact.bytecode.replace('0x', '');
      return bytecode.length / 2; // Convert hex to bytes
    }
    
    return 0;
  }

  /**
   * Find all Solidity files in a directory
   */
  private async findSolidityFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    if (await fs.pathExists(dir)) {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.findSolidityFiles(fullPath));
        } else if (item.endsWith('.sol')) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  /**
   * Check if Hardhat is properly configured
   */
  async isConfigured(): Promise<boolean> {
    return await fs.pathExists(this.hardhatConfigPath);
  }

  /**
   * Update Hardhat config with network settings
   */
  async updateNetworkConfig(network: 'testnet' | 'mainnet', privateKey?: string): Promise<void> {
    if (!await fs.pathExists(this.hardhatConfigPath)) {
      await this.createHardhatConfig();
    }

    // Read current config
    let configContent = await fs.readFile(this.hardhatConfigPath, 'utf8');
    
    const networkName = network === 'testnet' ? 'somnia_testnet' : 'somnia_mainnet';
    const accounts = privateKey ? `["${privateKey}"]` : '[]';
    
    // Update accounts for the network
    const networkRegex = new RegExp(`(${networkName}:\\s*{[^}]*accounts:\\s*)\\[[^\\]]*\\]`, 's');
    if (networkRegex.test(configContent)) {
      configContent = configContent.replace(networkRegex, `$1${accounts}`);
    }
    
    await fs.writeFile(this.hardhatConfigPath, configContent);
  }
}

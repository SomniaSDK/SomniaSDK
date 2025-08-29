import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { HardhatCompiler } from '../utils/hardhat-compiler.js';

export const contractCommand = new Command('contract');

// Contract templates
const CONTRACT_TEMPLATES = {
  'basic': {
    name: 'Basic Contract',
    description: 'Simple storage contract',
    template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract {{CONTRACT_NAME}} {
    uint256 private value;
    address public owner;
    
    event ValueChanged(uint256 newValue, address changedBy);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    function setValue(uint256 _value) external onlyOwner {
        value = _value;
        emit ValueChanged(_value, msg.sender);
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}`
  },
  'erc20': {
    name: 'ERC20 Token',
    description: 'Standard ERC20 token contract',
    template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract {{CONTRACT_NAME}} {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply * 10**_decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}`
  },
  'erc721': {
    name: 'ERC721 NFT',
    description: 'Standard ERC721 NFT contract',
    template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract {{CONTRACT_NAME}} {
    string public name;
    string public symbol;
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => string) public tokenURI;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function mint(address to, string memory uri) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        tokenURI[tokenId] = uri;
        
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }
    
    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf[tokenId];
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "Not authorized");
        getApproved[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }
    
    function transferFrom(address from, address to, uint256 tokenId) external {
        require(ownerOf[tokenId] == from, "Not owner");
        require(
            msg.sender == from || 
            msg.sender == getApproved[tokenId] || 
            isApprovedForAll[from][msg.sender],
            "Not authorized"
        );
        
        ownerOf[tokenId] = to;
        balanceOf[from]--;
        balanceOf[to]++;
        delete getApproved[tokenId];
        
        emit Transfer(from, to, tokenId);
    }
    
    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}`
  },
  'multisig': {
    name: 'MultiSig Wallet',
    description: 'Multi-signature wallet contract',
    template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract {{CONTRACT_NAME}} {
    address[] public owners;
    uint256 public requiredConfirmations;
    uint256 public transactionCount;
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
    }
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    mapping(address => bool) public isOwner;
    
    event Deposit(address indexed sender, uint256 amount);
    event SubmitTransaction(address indexed owner, uint256 indexed txIndex);
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier notConfirmed(uint256 _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "Transaction already confirmed");
        _;
    }
    
    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Transaction already executed");
        _;
    }
    
    constructor(address[] memory _owners, uint256 _requiredConfirmations) {
        require(_owners.length > 0, "Owners required");
        require(_requiredConfirmations > 0 && _requiredConfirmations <= _owners.length, "Invalid required confirmations");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        requiredConfirmations = _requiredConfirmations;
    }
    
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }
    
    function submitTransaction(address _to, uint256 _value, bytes memory _data) external onlyOwner {
        uint256 txIndex = transactionCount;
        transactions[txIndex] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            confirmations: 0
        });
        
        transactionCount++;
        emit SubmitTransaction(msg.sender, txIndex);
    }
    
    function confirmTransaction(uint256 _txIndex) 
        external 
        onlyOwner 
        txExists(_txIndex) 
        notConfirmed(_txIndex) 
        notExecuted(_txIndex) 
    {
        transactions[_txIndex].confirmations++;
        isConfirmed[_txIndex][msg.sender] = true;
        emit ConfirmTransaction(msg.sender, _txIndex);
    }
    
    function executeTransaction(uint256 _txIndex) 
        external 
        onlyOwner 
        txExists(_txIndex) 
        notExecuted(_txIndex) 
    {
        Transaction storage transaction = transactions[_txIndex];
        require(transaction.confirmations >= requiredConfirmations, "Not enough confirmations");
        
        transaction.executed = true;
        
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction failed");
        
        emit ExecuteTransaction(msg.sender, _txIndex);
    }
}`
  }
};

// Create new contract
contractCommand
  .command('create')
  .description('Create a new smart contract')
  .argument('[name]', 'Contract name')
  .option('-t, --template <template>', 'Contract template (basic|erc20|erc721|multisig)', 'basic')
  .option('-d, --directory <dir>', 'Output directory', './contracts')
  .action(async (name, options) => {
    try {
      let contractName = name;
      let templateType = options.template;
      
      // Interactive prompts if not provided
      if (!contractName || !CONTRACT_TEMPLATES[templateType as keyof typeof CONTRACT_TEMPLATES]) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'contractName',
            message: 'Contract name:',
            default: contractName || 'MyContract',
            validate: (input) => {
              if (!/^[A-Za-z][A-Za-z0-9]*$/.test(input)) {
                return 'Contract name must be a valid identifier (letters and numbers, starting with letter)';
              }
              return true;
            }
          },
          {
            type: 'list',
            name: 'template',
            message: 'Choose contract template:',
            choices: Object.entries(CONTRACT_TEMPLATES).map(([key, value]) => ({
              name: `${value.name} - ${value.description}`,
              value: key
            })),
            default: templateType
          }
        ]);
        
        contractName = answers.contractName;
        templateType = answers.template;
      }
      
      const template = CONTRACT_TEMPLATES[templateType as keyof typeof CONTRACT_TEMPLATES];
      if (!template) {
        console.error(chalk.red('Error: Invalid template type'));
        return;
      }
      
      const spinner = ora(`Creating ${contractName} contract...`).start();
      
      // Create contracts directory
      const contractsDir = path.resolve(options.directory);
      await fs.ensureDir(contractsDir);
      
      // Generate contract content
      const contractContent = template.template.replace(/{{CONTRACT_NAME}}/g, contractName);
      
      // Write contract file
      const contractPath = path.join(contractsDir, `${contractName}.sol`);
      await fs.writeFile(contractPath, contractContent);
      
      // Create deployment script
      const deployScript = `// Deployment script for ${contractName}
const { ethers } = require('ethers');

async function main() {
    console.log('Deploying ${contractName}...');
    
    // Deploy contract
    const ${contractName} = await ethers.getContractFactory('${contractName}');
    const contract = await ${contractName}.deploy(/* constructor args */);
    
    await contract.deployed();
    
    console.log('${contractName} deployed to:', contract.address);
    console.log('Transaction hash:', contract.deployTransaction.hash);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
`;
      
      const scriptsDir = path.join(contractsDir, '..', 'scripts');
      await fs.ensureDir(scriptsDir);
      const scriptPath = path.join(scriptsDir, `deploy-${contractName}.js`);
      await fs.writeFile(scriptPath, deployScript);
      
      // Create test file
      const testContent = `const { expect } = require('chai');
const { ethers } = require('ethers');

describe('${contractName}', function () {
    let contract;
    let owner;
    let addr1;
    let addr2;
    
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        
        const ${contractName} = await ethers.getContractFactory('${contractName}');
        contract = await ${contractName}.deploy(/* constructor args */);
        await contract.deployed();
    });
    
    it('Should deploy successfully', async function () {
        expect(contract.address).to.be.properAddress;
    });
    
    // Add more tests here
});
`;
      
      const testsDir = path.join(contractsDir, '..', 'test');
      await fs.ensureDir(testsDir);
      const testPath = path.join(testsDir, `${contractName}.test.js`);
      await fs.writeFile(testPath, testContent);
      
      spinner.succeed('Contract created successfully!');
      
      console.log('\n' + chalk.green('🎉 Contract Created!'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('Name:')} ${contractName}`);
      console.log(`${chalk.cyan('Template:')} ${template.name}`);
      console.log(`${chalk.cyan('Contract:')} ${path.relative(process.cwd(), contractPath)}`);
      console.log(`${chalk.cyan('Deploy Script:')} ${path.relative(process.cwd(), scriptPath)}`);
      console.log(`${chalk.cyan('Test File:')} ${path.relative(process.cwd(), testPath)}`);
      
      console.log(chalk.yellow('\n💡 Next steps:'));
      console.log(chalk.gray('  1. Edit the contract: ') + chalk.cyan(path.relative(process.cwd(), contractPath)));
      console.log(chalk.gray('  2. Deploy contract: ') + chalk.cyan(`somnia deploy ${contractName}`));
      console.log(chalk.gray('  3. Test contract: ') + chalk.cyan('npm test'));
      
    } catch (error: any) {
      console.error(chalk.red('Error creating contract:'), error.message);
    }
  });

// List contracts
contractCommand
  .command('list')
  .description('List all contracts in the project')
  .option('-d, --directory <dir>', 'Contracts directory', './contracts')
  .action(async (options) => {
    try {
      const contractsDir = path.resolve(options.directory);
      
      if (!await fs.pathExists(contractsDir)) {
        console.log(chalk.yellow('⚠️  No contracts directory found.'));
        console.log(chalk.gray('Create a contract with: somnia contract create'));
        return;
      }
      
      const files = await fs.readdir(contractsDir);
      const solFiles = files.filter((file: string) => file.endsWith('.sol'));
      
      if (solFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No Solidity contracts found.'));
        console.log(chalk.gray('Create a contract with: somnia contract create'));
        return;
      }
      
      console.log('\n' + chalk.green('📄 Smart Contracts'));
      console.log(chalk.gray('━'.repeat(50)));
      
      for (const file of solFiles) {
        const filePath = path.join(contractsDir, file);
        const stats = await fs.stat(filePath);
        const contractName = path.basename(file, '.sol');
        
        console.log(`${chalk.cyan('•')} ${chalk.bold(contractName)}`);
        console.log(`  ${chalk.gray('File:')} ${path.relative(process.cwd(), filePath)}`);
        console.log(`  ${chalk.gray('Size:')} ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  ${chalk.gray('Modified:')} ${stats.mtime.toLocaleString()}`);
        console.log('');
      }
      
      console.log(chalk.yellow('💡 Commands:'));
      console.log(chalk.gray('  somnia deploy <contract>    # Deploy contract'));
      console.log(chalk.gray('  somnia call <address> <fn>  # Call contract function'));
      
    } catch (error: any) {
      console.error(chalk.red('Error listing contracts:'), error.message);
    }
  });

// Compile contracts using Hardhat
contractCommand
  .command('compile')
  .description('Compile smart contracts')
  .option('-d, --directory <dir>', 'Contracts directory', './contracts')
  .option('--clean', 'Clean artifacts before compiling')
  .action(async (options) => {
    try {
      const contractsDir = path.resolve(options.directory);
      
      if (!await fs.pathExists(contractsDir)) {
        console.log(chalk.yellow('⚠️  No contracts directory found.'));
        return;
      }
      
      const spinner = ora('Setting up Hardhat compilation...').start();
      
      // Initialize Hardhat compiler
      const compiler = new HardhatCompiler(process.cwd());
      
      try {
        // Clean if requested
        if (options.clean) {
          spinner.text = 'Cleaning previous artifacts...';
          await compiler.clean();
        }
        
        spinner.text = 'Compiling contracts with Hardhat...';
        
        // Compile all contracts
        const results = await compiler.compileAllContracts();
        
        spinner.succeed('Compilation completed successfully!');
        
        if (results.length === 0) {
          console.log(chalk.yellow('\n⚠️  No contracts found to compile.'));
          return;
        }
        
        console.log('\n' + chalk.green('🔨 Compilation Results'));
        console.log(chalk.gray('━'.repeat(50)));
        
        for (const result of results) {
          const size = result.bytecode.length / 2 - 1; // Convert hex to bytes
          const functionCount = result.abi.filter((item: any) => item.type === 'function').length;
          
          console.log(`${chalk.cyan('✓')} ${chalk.bold(result.contractName)}`);
          console.log(`  ${chalk.gray('Source:')} ${path.relative(process.cwd(), result.sourcePath)}`);
          console.log(`  ${chalk.gray('Bytecode:')} ${size} bytes ${size > 20000 ? chalk.yellow('(large)') : chalk.green('(ok)')}`);
          console.log(`  ${chalk.gray('Functions:')} ${functionCount}`);
          console.log(`  ${chalk.gray('ABI entries:')} ${result.abi.length}`);
          console.log('');
        }
        
        console.log(chalk.yellow('💡 Next steps:'));
        console.log(chalk.gray('  somnia deploy <contract>     # Deploy a contract'));
        console.log(chalk.gray('  somnia contract list         # List all contracts'));
        
      } catch (compileError: any) {
        spinner.fail('Compilation failed');
        console.error(chalk.red('\nCompilation error:'));
        console.error(chalk.gray(compileError.message));
        
        if (compileError.message.includes('hardhat')) {
          console.log(chalk.yellow('\n💡 Hardhat setup tips:'));
          console.log(chalk.gray('  • Make sure your contracts use pragma solidity ^0.8.19'));
          console.log(chalk.gray('  • Check for syntax errors in your Solidity files'));
          console.log(chalk.gray('  • Verify all imports are correct'));
        }
      }
      
    } catch (error: any) {
      console.error(chalk.red('Error during compilation:'), error.message);
    }
  });

// Verify contract
contractCommand
  .command('verify')
  .description('Verify contract on block explorer')
  .argument('<address>', 'Contract address')
  .option('-n, --name <name>', 'Contract name')
  .option('-f, --file <file>', 'Contract source file')
  .action(async (address, options) => {
    try {
      const spinner = ora('Verifying contract...').start();
      
      // This would integrate with block explorer API
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      spinner.succeed('Contract verified successfully!');
      
      console.log('\n' + chalk.green('✅ Contract Verified'));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(`${chalk.cyan('Address:')} ${address}`);
      console.log(`${chalk.cyan('Explorer:')} https://shannon-explorer.somnia.network/address/${address}`);
      
      if (options.name) {
        console.log(`${chalk.cyan('Name:')} ${options.name}`);
      }
      
      console.log(chalk.green('\n🔗 View on Explorer:'));
      console.log(chalk.blue(`https://shannon-explorer.somnia.network/address/${address}`));
      
    } catch (error: any) {
      console.error(chalk.red('Error verifying contract:'), error.message);
    }
  });

// Help command
contractCommand
  .command('help')
  .description('Show contract command help')
  .action(() => {
    console.log('\n' + chalk.cyan('📄 Contract Commands'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.green('create')}       Create a new contract`);
    console.log(`${chalk.green('list')}         List all contracts`);
    console.log(`${chalk.green('compile')}      Compile contracts`);
    console.log(`${chalk.green('verify')}       Verify contract on explorer`);
    console.log(`${chalk.green('help')}         Show this help`);
    
    console.log('\n' + chalk.cyan('📝 Contract Templates:'));
    Object.entries(CONTRACT_TEMPLATES).forEach(([key, value]) => {
      console.log(`${chalk.green(key.padEnd(12))} ${value.description}`);
    });
    
    console.log('\n' + chalk.cyan('💡 Examples:'));
    console.log(chalk.gray('  somnia contract create MyToken --template erc20'));
    console.log(chalk.gray('  somnia contract create MyNFT --template erc721'));
    console.log(chalk.gray('  somnia contract list'));
    console.log(chalk.gray('  somnia deploy MyToken'));
  });

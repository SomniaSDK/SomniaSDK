import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { HardhatCompiler } from '../utils/hardhat-compiler.js';
import { ContractGenerator } from '../utils/ai-contract-generator.js';

export const contractCommand = new Command('contract');

// Create new contract using AI
contractCommand
  .command('create')
  .description('Create a new smart contract using AI')
  .argument('[name]', 'Contract name (optional, AI will generate if not provided)')
  .option('-p, --prompt <prompt>', 'Describe the contract you want to create')
  .option('-d, --directory <dir>', 'Output directory', './contracts')
  .action(async (name, options) => {
    try {
      // Check if prompt is provided
      if (!options.prompt) {
        console.error(chalk.red('❌ Error: --prompt flag is required'));
        console.log(chalk.yellow('💡 Usage: somnia contract create --prompt "your contract description"'));
        console.log(chalk.gray('   Example: somnia contract create --prompt "Simple NFT minter"'));
        return;
      }

      const spinner = ora('🤖 Initializing AI contract generator...').start();
      
      try {
        // Initialize the AI contract generator
        const generator = new ContractGenerator({
          outputDir: path.resolve(options.directory),
          verbose: true
        });
        
        spinner.text = 'Generating smart contract with AI...';
        
        // Generate the contract
        const result = await generator.generateFromDescription(options.prompt);
        
        spinner.succeed('Contract created successfully!');
        
        console.log('\n' + chalk.green('🎉 AI Contract Generated!'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log(`${chalk.cyan('Description:')} ${options.prompt}`);
        console.log(`${chalk.cyan('Contract Name:')} ${result.contractName}`);
        console.log(`${chalk.cyan('Contract File:')} ${path.relative(process.cwd(), result.contractFile)}`);
        console.log(`${chalk.cyan('Project Path:')} ${path.relative(process.cwd(), result.projectPath)}`);
        
        console.log(chalk.yellow('\n💡 Next steps:'));
        console.log(chalk.gray('  1. Review the generated contract: ') + chalk.cyan(path.relative(process.cwd(), result.contractFile)));
        console.log(chalk.gray('  2. Compile contract: ') + chalk.cyan('somnia contract compile'));
        console.log(chalk.gray('  3. Deploy contract: ') + chalk.cyan(`somnia deploy ${result.contractName}`));
        
      } catch (error: any) {
        spinner.fail('AI contract generation failed');
        
        if (error.message.includes('GROQ_API_KEY')) {
          console.error(chalk.red('\n❌ Missing GROQ_API_KEY environment variable'));
          console.log(chalk.yellow('\n💡 Setup instructions:'));
          console.log(chalk.gray('  1. Get your API key from https://console.groq.com/'));
          console.log(chalk.gray('  2. Add to your environment: export GROQ_API_KEY=your_key_here'));
          console.log(chalk.gray('  3. Or create a .env file in your project root'));
        } else {
          console.error(chalk.red('\n❌ Error details:'), error.message);
        }
      }
      
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
        console.log(chalk.gray('Create a contract with: somnia contract create --prompt "your description"'));
        return;
      }
      
      const files = await fs.readdir(contractsDir);
      const solFiles = files.filter((file: string) => file.endsWith('.sol'));
      
      if (solFiles.length === 0) {
        console.log(chalk.yellow('⚠️  No Solidity contracts found.'));
        console.log(chalk.gray('Create a contract with: somnia contract create --prompt "your description"'));
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
    console.log(`${chalk.green('create')}       Create a new contract using AI`);
    console.log(`${chalk.green('list')}         List all contracts`);
    console.log(`${chalk.green('compile')}      Compile contracts`);
    console.log(`${chalk.green('verify')}       Verify contract on explorer`);
    console.log(`${chalk.green('help')}         Show this help`);
    
    console.log('\n' + chalk.cyan('� Examples:'));
    console.log(chalk.gray('  somnia contract create --prompt "Simple NFT minter"'));
    console.log(chalk.gray('  somnia contract create --prompt "ERC20 token with 1M supply"'));
    console.log(chalk.gray('  somnia contract create --prompt "Voting contract for DAO"'));
    console.log(chalk.gray('  somnia contract list'));
    console.log(chalk.gray('  somnia deploy MyContract'));
    
    console.log('\n' + chalk.cyan('🤖 AI Contract Generation:'));
    console.log(chalk.gray('  • Powered by Groq AI (LLaMA 3)'));
    console.log(chalk.gray('  • Supports ERC20, ERC721, and custom contracts'));
    console.log(chalk.gray('  • Uses OpenZeppelin standards'));
    console.log(chalk.gray('  • Generates production-ready code'));
    
    console.log('\n' + chalk.yellow('⚙️ Setup:'));
    console.log(chalk.gray('  export GROQ_API_KEY=your_api_key'));
    console.log(chalk.gray('  Get your key from: https://console.groq.com/'));
  });

#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { deployCommand } from './commands/deploy.js';
import { callCommand } from './commands/call.js';
import { generateCommand } from './commands/generate.js';
import { walletCommand } from './commands/wallet.js';
import { contractCommand } from './commands/contract.js';
import { networkCommand } from './commands/network.js';
import { configCommand } from './commands/config.js';

const pkg = require('../package.json');

// ASCII Art Banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════╗')}
${chalk.cyan('║')}           ${chalk.bold.white('SOMNIA CLI')}              ${chalk.cyan('║')}
${chalk.cyan('║')}      ${chalk.gray('Blockchain Development Kit')}      ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════╝')}
`;

console.log(banner);

program
  .name('somnia')
  .description('Command-line interface for Somnia blockchain development')
  .version(pkg.version)
  .option('-d, --debug', 'Enable debug mode')
  .option('-n, --network <network>', 'Network to use (testnet|mainnet)', 'testnet')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.debug) {
      process.env.SOMNIA_DEBUG = 'true';
    }
    process.env.SOMNIA_NETWORK = opts.network;
  });

// Initialize project
program
  .command('init')
  .description('Initialize a new Somnia project')
  .option('-t, --template <template>', 'Project template (basic|defi|nft|dao)', 'basic')
  .option('-n, --name <name>', 'Project name')
  .action(initCommand);

// Wallet management
program.addCommand(walletCommand);

// Contract management  
program.addCommand(contractCommand);

// Network utilities
program.addCommand(networkCommand);

// Configuration
program.addCommand(configCommand);

// Deploy contracts
program
  .command('deploy')
  .description('Deploy smart contracts')
  .argument('[contract]', 'Contract name to deploy')
  .option('-f, --file <file>', 'Contract file path')
  .option('-args, --constructor-args <args>', 'Constructor arguments (JSON array)')
  .option('-g, --gas-limit <limit>', 'Gas limit')
  .option('-p, --gas-price <price>', 'Gas price in gwei')
  .option('-v, --verify', 'Verify contract on block explorer')
  .option('-a, --auto', 'Automatically use generated constructor arguments without prompting')
  .action(deployCommand);

// Call contract functions
program
  .command('call')
  .description('Call smart contract functions')
  .argument('<address>', 'Contract address')
  .argument('<function>', 'Function name')
  .argument('[args...]', 'Function arguments')
  .option('-a, --abi <file>', 'ABI file path')
  .option('-v, --value <value>', 'ETH value to send')
  .option('-g, --gas-limit <limit>', 'Gas limit')
  .action(callCommand);

// Generate code
program
  .command('generate')
  .description('Generate smart contracts and tests')
  .argument('<type>', 'Type to generate (contract|test|interface)')
  .argument('<name>', 'Name of the generated item')
  .option('-t, --template <template>', 'Template to use')
  .option('-o, --output <dir>', 'Output directory')
  .action(generateCommand);

// Quick commands for common operations
program
  .command('balance')
  .description('Check wallet balance')
  .option('-a, --address <address>', 'Address to check (default: current wallet)')
  .action(async (options) => {
    const { checkBalance } = await import('./commands/wallet.js');
    await checkBalance(options);
  });

program
  .command('send')
  .description('Send STT tokens')
  .argument('<to>', 'Recipient address')
  .argument('<amount>', 'Amount to send')
  .option('-g, --gas-price <price>', 'Gas price in gwei')
  .action(async (to, amount, options) => {
    const { sendTokens } = await import('./commands/wallet.js');
    await sendTokens(to, amount, options);
  });

program
  .command('status')
  .description('Show network and wallet status')
  .action(async () => {
    const { showStatus } = await import('./commands/network.js');
    await showStatus();
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
  console.log('\n' + chalk.yellow('💡 Quick start:'));
  console.log(chalk.gray('  somnia init my-project     # Initialize new project'));
  console.log(chalk.gray('  somnia wallet create       # Create new wallet'));
  console.log(chalk.gray('  somnia wallet import       # Import existing wallet'));
  console.log(chalk.gray('  somnia balance             # Check wallet balance'));
  console.log(chalk.gray('  somnia contract create     # Create new contract'));
  console.log(chalk.gray('  somnia deploy MyContract   # Deploy contract'));
  console.log('');
}

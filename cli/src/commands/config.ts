import { Command } from 'commander';

export const configCommand = new Command('config');

configCommand
  .command('help')
  .description('Show config help')
  .action(() => {
    console.log('Config command - Coming soon!');
  });

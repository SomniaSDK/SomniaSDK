#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';

// Complete tool definitions for all Somnia CLI commands is addded below people can use this tools to interact with the Somnia blockchain
const TOOLS: Tool[] = [
  // Balance and Wallet Information 
  {
    name: 'somnia_balance',
    description: 'Check STT token balance for current wallet or any address',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Wallet address to check balance for (optional if checking current wallet)'
        },
        network: {
          type: 'string',
          enum: ['testnet', 'mainnet'],
          description: 'Network to check balance on',
          default: 'testnet'
        }
      }
    }
  },
  {
    name: 'somnia_wallet_info',
    description: 'Show detailed wallet information for current wallet',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // Wallet Management
  {
    name: 'somnia_wallet_create',
    description: 'Create a new HD wallet with mnemonic phrase',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['hd'],
          description: 'Wallet type to create',
          default: 'hd'
        },
        network: {
          type: 'string',
          enum: ['testnet', 'mainnet'],
          description: 'Network for the wallet',
          default: 'testnet'
        }
      }
    }
  },
  {
    name: 'somnia_wallet_import',
    description: 'Import existing wallet using private key or mnemonic phrase',
    inputSchema: {
      type: 'object',
      properties: {
        privateKey: {
          type: 'string',
          description: 'Private key to import (starts with 0x)'
        },
        mnemonic: {
          type: 'string',
          description: 'Mnemonic phrase to import (12 or 24 words)'
        }
      }
    }
  },
  {
    name: 'somnia_wallet_fund',
    description: 'Get testnet tokens from faucet for wallet',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Wallet address to fund (optional if funding current wallet)'
        }
      }
    }
  },

  // AI Contract Generation
  {
    name: 'somnia_contract_create',
    description: 'Generate smart contracts using AI based on natural language prompts',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Natural language description of the contract to generate'
        },
        name: {
          type: 'string',
          description: 'Name for the generated contract file (optional)'
        }
      },
      required: ['prompt']
    }
  },

  // Contract Deployment
  {
    name: 'somnia_deploy',
    description: 'Deploy smart contracts to Somnia network',
    inputSchema: {
      type: 'object',
      properties: {
        contractName: {
          type: 'string',
          description: 'Name of the contract to deploy'
        },
        contractPath: {
          type: 'string',
          description: 'Path to the contract file (.sol)'
        },
        constructorArgs: {
          type: 'string',
          description: 'Constructor arguments as JSON array string'
        },
        gasPrice: {
          type: 'string',
          description: 'Gas price in gwei'
        },
        gasLimit: {
          type: 'string',
          description: 'Gas limit for deployment'
        },
        auto: {
          type: 'boolean',
          description: 'Use auto-generated constructor arguments',
          default: false
        }
      }
    }
  },

  // Contract Interaction
  {
    name: 'somnia_call',
    description: 'Call functions on deployed smart contracts',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: {
          type: 'string',
          description: 'Address of the deployed contract'
        },
        functionName: {
          type: 'string',
          description: 'Name of the function to call'
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Function arguments as array of strings'
        },
        value: {
          type: 'string',
          description: 'ETH value to send with call (in ETH)'
        },
        gasLimit: {
          type: 'string',
          description: 'Gas limit for the transaction'
        }
      },
      required: ['contractAddress', 'functionName']
    }
  },

  // Network Commands
  {
    name: 'somnia_status',
    description: 'Check Somnia network status and wallet information',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['testnet', 'mainnet'],
          description: 'Network to check status for',
          default: 'testnet'
        }
      }
    }
  },
  {
    name: 'somnia_network_test',
    description: 'Test network connection speed and latency',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'somnia_network_switch',
    description: 'Switch between testnet and mainnet',
    inputSchema: {
      type: 'object',
      properties: {
        network: {
          type: 'string',
          enum: ['testnet', 'mainnet'],
          description: 'Network to switch to'
        }
      },
      required: ['network']
    }
  }
];

// Utility function to run Somnia CLI commands
async function runSomniaCommand(args: string[]): Promise<{ stdout: string; stderr: string; success: boolean }> {
  return new Promise((resolve) => {
    const process = spawn('somnia', args, {
      stdio: 'pipe',
      shell: true
    });

    let stdout = '';
    let stderr = '';

    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        success: code === 0
      });
    });

    process.on('error', (error) => {
      resolve({
        stdout,
        stderr: error.message,
        success: false
      });
    });
  });
}

// Format CLI output for better readability
function formatOutput(output: string): string {
  // Remove ANSI color codes and clean up formatting
  return output
    .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI codes
    .replace(/[╔═╗║╚╝━]/g, '') // Remove box drawing characters
    .trim();
}

// Main server setup
const server = new Server(
  {
    name: 'somnia-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'somnia_balance': {
        const { address, network = 'testnet' } = args as { address?: string; network?: string };
        const commandArgs = ['balance'];
        
        if (address) {
          commandArgs.push(address);
        }
        if (network !== 'testnet') {
          commandArgs.push('--network', network);
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Balance check result:\n${formatOutput(result.stdout)}`
                : `Error checking balance: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_wallet_info': {
        const result = await runSomniaCommand(['wallet', 'info']);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Wallet information:\n${formatOutput(result.stdout)}`
                : `Error getting wallet info: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_wallet_create': {
        const { type = 'hd', network = 'testnet' } = args as { type?: string; network?: string };
        const commandArgs = ['wallet', 'create'];
        
        if (type !== 'hd') {
          commandArgs.push('--type', type);
        }
        if (network !== 'testnet') {
          commandArgs.push('--network', network);
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Wallet created successfully:\n${formatOutput(result.stdout)}`
                : `Error creating wallet: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_wallet_import': {
        const { privateKey, mnemonic } = args as { privateKey?: string; mnemonic?: string };
        const commandArgs = ['wallet', 'import'];
        
        if (privateKey) {
          commandArgs.push('--private-key', privateKey);
        } else if (mnemonic) {
          commandArgs.push('--mnemonic', mnemonic);
        } else {
          throw new Error('Either privateKey or mnemonic is required');
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Wallet imported successfully:\n${formatOutput(result.stdout)}`
                : `Error importing wallet: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_wallet_fund': {
        const { address } = args as { address?: string };
        const commandArgs = ['wallet', 'fund'];
        
        if (address) {
          commandArgs.push(address);
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Wallet funding result:\n${formatOutput(result.stdout)}`
                : `Error funding wallet: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_contract_create': {
        const { prompt, name } = args as { prompt: string; name?: string };
        const commandArgs = ['contract', 'create', '--prompt', prompt];
        
        if (name) {
          commandArgs.push('--name', name);
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Contract generated successfully:\n${formatOutput(result.stdout)}`
                : `Error generating contract: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_deploy': {
        const { contractName, contractPath, constructorArgs, gasPrice, gasLimit, auto } = args as {
          contractName?: string;
          contractPath?: string;
          constructorArgs?: string;
          gasPrice?: string;
          gasLimit?: string;
          auto?: boolean;
        };

        const commandArgs = ['deploy'];
        
        if (contractPath) {
          commandArgs.push('--file', contractPath);
        } else if (contractName) {
          commandArgs.push(contractName);
        } else {
          throw new Error('Either contractName or contractPath is required');
        }

        if (constructorArgs) {
          commandArgs.push('--constructor-args', constructorArgs);
        }

        if (gasPrice) {
          commandArgs.push('--gas-price', gasPrice);
        }

        if (gasLimit) {
          commandArgs.push('--gas-limit', gasLimit);
        }

        if (auto) {
          commandArgs.push('--auto');
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Contract deployed successfully:\n${formatOutput(result.stdout)}`
                : `Error deploying contract: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_call': {
        const { contractAddress, functionName, args: callArgs, value, gasLimit } = args as {
          contractAddress: string;
          functionName: string;
          args?: string[];
          value?: string;
          gasLimit?: string;
        };

        const commandArgs = ['call', contractAddress, functionName];
        
        if (callArgs && callArgs.length > 0) {
          commandArgs.push(...callArgs);
        }

        if (value) {
          commandArgs.push('--value', value);
        }

        if (gasLimit) {
          commandArgs.push('--gas-limit', gasLimit);
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Contract call result:\n${formatOutput(result.stdout)}`
                : `Error calling contract: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_status': {
        const { network = 'testnet' } = args as { network?: string };
        const commandArgs = ['status'];
        
        if (network !== 'testnet') {
          commandArgs.push('--network', network);
        }

        const result = await runSomniaCommand(commandArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Network status:\n${formatOutput(result.stdout)}`
                : `Error checking status: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_network_test': {
        const result = await runSomniaCommand(['network', 'test']);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Network test result:\n${formatOutput(result.stdout)}`
                : `Error testing network: ${result.stderr}`
            }
          ]
        };
      }

      case 'somnia_network_switch': {
        const { network } = args as { network: string };
        const result = await runSomniaCommand(['network', 'switch', network]);
        
        return {
          content: [
            {
              type: 'text',
              text: result.success 
                ? `Network switched successfully:\n${formatOutput(result.stdout)}`
                : `Error switching network: ${result.stderr}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Somnia MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
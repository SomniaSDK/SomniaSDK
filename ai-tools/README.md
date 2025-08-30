# Somnia AI Tools

AI-powered smart contract generation and Web3 agent for Somnia blockchain using Groq API.

## Tools

### 1. Smart Contract Generator
AI-powered smart contract generation using Groq API.

### 2. Somnia Web3 Agent v2.0
Interactive Web3 agent for Somnia blockchain operations, wallet analysis, and token management.

## Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your API keys to `.env`:**
   ```
   GROQ_API_KEY=your_groq_api_key_here
   SOMNIA_PRIVATE_KEY=your_wallet_private_key_here
   SOMNIA_RPC_URL=https://rpc.ankr.com/somnia_testnet
   OUTPUT_DIR=./contracts
   VERBOSE=true
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

### Smart Contract Generator

#### CLI Commands
```bash
# Generate specific contracts
node somnia-cli.js generate "ERC721"
node somnia-cli.js generate "ERC20 token"
node somnia-cli.js generate "voting contract"

# Interactive mode
node somnia-cli.js interactive
```

#### TypeScript API
```typescript
import { ContractGenerator } from './src/contract-gen';

const generator = new ContractGenerator({
  // API key will be loaded from .env automatically
  outputDir: './my-contracts',
  verbose: true
});

const result = await generator.generateFromDescription('ERC721 NFT contract');
```

### Somnia Web3 Agent

#### Interactive Mode
```bash
node somnia-web3.js interactive
```

#### Network Information
- **Network**: Somnia Testnet
- **RPC URL**: https://rpc.ankr.com/somnia_testnet
- **Chain ID**: 50312
- **Native Token**: SST (Somnia tokens)

#### Available Commands
```
🔍 WALLET ANALYSIS:
  • find <address> - Analyze wallet and show details
  • balance - Show your current balance

💰 TOKEN OPERATIONS:
  • fund <address> <amount> - Send SST tokens
  • check <address> <amount> - Check if wallet has enough funds

🪂 AIRDROP TOOLS (uses your SST):
  • airdrop <address> <amount> - Perform airdrop from your wallet
  • eligibility <address> - Check airdrop eligibility
  • batch <addr1,addr2> <amount> - Batch airdrop to multiple addresses

🔍 EXPLORER TOOLS:
  • explorer <address_or_txhash> - Show Somnia explorer links

ℹ️ HELP:
  • help - Show available commands
  • exit - Quit the agent
```

#### Example Usage
```bash
# Start the agent
node somnia-web3.js interactive

# Analyze a wallet
Agent> find 0x588F6b3169F60176c1143f8BaB47bCf3DeEbECdc

# Check your balance
Agent> balance

# Send tokens
Agent> fund 0x123...abc 0.5

# Perform airdrop
Agent> airdrop 0x456...def 0.1
```

## Features

### Smart Contract Generator
- 🤖 **AI-Powered**: Uses Groq API (LLaMA 3) for intelligent contract generation
- 🔄 **Fallback Templates**: High-quality backup templates when AI fails
- 📁 **Clean Structure**: Creates organized project folders
- 🔒 **Secure**: API keys stored in environment variables
- ⚡ **Fast**: Direct file generation, no build complexity

### Somnia Web3 Agent
- 🌐 **Somnia Network**: Direct connection to Somnia testnet (Chain ID: 50312)
- 🔍 **Wallet Analysis**: Comprehensive wallet inspection and transaction history
- 💰 **Token Management**: Send SST tokens and check balances
- 🪂 **Airdrop System**: Single and batch airdrop functionality from your wallet
- 🔗 **Explorer Integration**: Direct links to Somnia blockchain explorers
- 📊 **Real-time Data**: Live balance and transaction monitoring
- 🎯 **Interactive CLI**: User-friendly command interface

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GROQ_API_KEY` | Your Groq API key for AI generation | - | Yes (for contract generation) |
| `SOMNIA_PRIVATE_KEY` | Your wallet private key for Web3 operations | - | Yes (for Web3 agent) |
| `SOMNIA_RPC_URL` | Somnia network RPC endpoint | `https://rpc.ankr.com/somnia_testnet` | No |
| `OUTPUT_DIR` | Directory for generated contracts | `./contracts` | No |
| `VERBOSE` | Enable detailed logging | `false` | No |

## Security

- ✅ API keys are stored in `.env` (git-ignored)
- ✅ Private keys are stored securely in environment variables
- ✅ Environment variables are validated
- ✅ `.gitignore` protects sensitive files
- ⚠️ **Never commit private keys to version control**

## Network Information

### Somnia Testnet
- **Chain ID**: 50312
- **RPC URL**: https://rpc.ankr.com/somnia_testnet
- **Native Token**: SST (Somnia tokens)
- **Explorer**: https://testnet-explorer.somnia.network

### Explorers
- Main: https://explorer.somnia.network
- Blockscout: https://somnia.blockscout.com
- Testnet: https://testnet-explorer.somnia.network

## Generated Structure

```
contracts/
├── ERC721Contract/
│   └── ERC721Contract.sol
├── ERC20Contract/
│   └── ERC20Contract.sol
└── MyContract/
    └── MyContract.sol
```

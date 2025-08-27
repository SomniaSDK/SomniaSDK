# Somnia AI Tools

AI-powered smart contract generation using Groq API.

## Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Add your Groq API key to `.env`:**
   ```
   GROQ_API_KEY=your_groq_api_key_here
   OUTPUT_DIR=./contracts
   VERBOSE=true
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

### CLI Command
```bash
node somnia-cli.js generate "ERC721"
node somnia-cli.js generate "ERC20 token"
node somnia-cli.js generate "voting contract"
```

### TypeScript API
```typescript
import { ContractGenerator } from './src/contract-gen';

const generator = new ContractGenerator({
  // API key will be loaded from .env automatically
  outputDir: './my-contracts',
  verbose: true
});

const result = await generator.generateFromDescription('ERC721 NFT contract');
```

## Features

- 🤖 **AI-Powered**: Uses Groq API (LLaMA 3) for intelligent contract generation
- 🔄 **Fallback Templates**: High-quality backup templates when AI fails
- 📁 **Clean Structure**: Creates organized project folders
- 🔒 **Secure**: API keys stored in environment variables
- ⚡ **Fast**: Direct file generation, no build complexity

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Your Groq API key (required) | - |
| `OUTPUT_DIR` | Directory for generated contracts | `./contracts` |
| `VERBOSE` | Enable detailed logging | `false` |

## Security

- ✅ API keys are stored in `.env` (git-ignored)
- ✅ Environment variables are validated
- ✅ `.gitignore` protects sensitive files

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

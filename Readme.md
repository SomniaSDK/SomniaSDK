# Somnia DevKit – AI-Powered SDK & CLI for Seamless Somnia Development

Somnia DevKit is a unified developer toolkit designed to make building on the Somnia network frictionless. It combines an intuitive command-line interface (CLI), a TypeScript SDK, and AI-assisted contract generation to eliminate onboarding barriers and accelerate adoption of Somnia infrastructure.

With one install and one command, developers can scaffold, deploy, and interact with contracts on Somnia without configuration overhead.

## 🔹 Architecture Overview

The Somnia DevKit consists of three main components:

### 1. CLI (Node.js + Commander.js)
- **Global CLI tool**: `somnia-cli`
- **Commands**:
  - `init`: Scaffold new project
  - `generate`: AI-assisted contract boilerplate generation
  - `deploy`: Deploy contracts to Somnia testnet/mainnet
  - `call/send`: Interact with contracts via CLI
  - `logs`: View transaction logs & contract events
- Developer-friendly UX with colorized output & templates

### 2. SDK (TypeScript)
- Lightweight SDK inspired by ethers.js for Somnia
- **Core features**:
  - Contract deployment utilities
  - Contract call & transaction wrappers
  - Wallet & key management
  - Provider for Somnia RPC endpoints (testnet + mainnet)
  - Auto-ABI → strongly typed SDK generation for deployed contracts
- Published to npm for direct consumption

### 3. AI Assistant Layer
- Natural language → smart contract boilerplate
- **Example**: `somnia generate "ERC20 token with burn + mint"` → Produces ERC20.sol in contracts/ folder
- AI suggestions for tests + contract docs
- Debugging assistant: explains failing test cases and proposes fixes

## 🔹 Security & Developer Experience Features

### Developer Safety
- Built-in contract verification before deployment
- AI-generated contracts include OpenZeppelin standards
- Default test scaffolding for each generated contract

### Key Management
- Secure local wallet storage (AES encryption)
- .env based configuration for RPC + keys

### Debugging & Logging
- Verbose mode for transaction traces
- AI-assisted error explanations

## 🔹 Project Structure
```
somnia-devkit/
├── cli/                    # CLI tool
│   ├── src/
│   │   ├── commands/       # CLI commands
│   │   │   ├── init.ts
│   │   │   ├── generate.ts
│   │   │   ├── deploy.ts
│   │   │   └── call.ts
│   │   └── utils/          # Helper functions
│   └── package.json
├── sdk/                    # TypeScript SDK
│   ├── src/
│   │   ├── provider.ts     # RPC provider
│   │   ├── wallet.ts       # Wallet manager
│   │   ├── deploy.ts       # Deployment utils
│   │   └── contract.ts     # Contract wrapper
│   └── package.json
├── ai-tools/               # AI integration layer
│   ├── src/
│   │   ├── contract-gen.ts # Contract generator
│   │   ├── test-gen.ts     # Test generator
│   │   └── debug-assist.ts # Error assistant
│   └── package.json
└── README.md
```

## 🔹 Complete User Flow

### 1. Project Initialization
**Developer → CLI → Project Scaffolding**
1. Run `somnia init my-dapp`
2. Boilerplate project structure created
3. Default contract + test suite generated

### 2. AI Contract Generation
**Developer → CLI → AI → Contract File**
1. Run `somnia generate "ERC721 NFT with royalties"`
2. AI outputs secure boilerplate contract
3. Contract stored in `/contracts/`

### 3. Deployment Flow
**Developer → CLI → SDK → Somnia RPC**
1. Run `somnia deploy contracts/NFT.sol --network testnet`
2. SDK compiles + deploys contract
3. Contract address + tx hash returned

### 4. Interaction Flow
**Developer → CLI → SDK → Somnia RPC**
1. Run `somnia call NFT.totalSupply`
2. CLI queries deployed contract
3. Output displayed in terminal

## 🔹 Technology Stack

### CLI
- Node.js 20+
- TypeScript
- Commander.js (CLI framework)
- Chalk / Inquirer (interactive UX)

### SDK
- TypeScript
- ethers.js-inspired API (adapted for Somnia RPC)
- ts-morph (for ABI → TS SDK generation)

### AI Layer
- OpenAI / Ollama (text-to-contract/test generation)
- LangChain.js for prompt orchestration
- OpenZeppelin templates for contract security

## 🚀 Quick Start

### Installation
```bash
npm install -g somnia-cli
```

### Initialize a new project
```bash
somnia init my-somnia-dapp
cd my-somnia-dapp
```

### Generate an AI contract
```bash
somnia generate "ERC20 token with burn and mint functions"
```

### Deploy to Somnia testnet
```bash
somnia deploy contracts/MyToken.sol --network testnet
```

### Interact with deployed contract
```bash
somnia call MyToken.totalSupply
somnia send MyToken.mint 0x123... 1000
```

## 🔹 Why Somnia DevKit Wins

- **Infra-heavy** → judges love ecosystem accelerators
- **AI-powered** → trend-aligned with current development needs
- **Demo-friendly** → can show init → generate → deploy in <5 minutes
- **Somnia-first** → solves current ecosystem gap vs competitors

## 📚 Documentation

- [CLI Documentation](./cli/README.md)
- [SDK Documentation](./sdk/README.md)
- [AI Tools Documentation](./ai-tools/README.md)

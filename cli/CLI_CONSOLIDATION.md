# Somnia CLI - Consolidated Project

This directory contains the complete Somnia CLI with all functionality consolidated from the previous separate `cli` directory.

## Structure

```
demo-project/  (to be renamed to 'cli')
├── src/               # TypeScript source code
│   ├── commands/      # CLI command implementations
│   │   ├── wallet.ts  # Wallet management (create, import, fund with Google faucet)
│   │   ├── deploy.ts  # Smart contract deployment with Hardhat
│   │   ├── call.ts    # Contract interaction
│   │   ├── generate.ts # Code generation
│   │   ├── init.ts    # Project initialization
│   │   ├── network.ts # Network utilities
│   │   ├── config.ts  # Configuration management
│   │   └── contract.ts # Contract management
│   ├── utils/         # Utility functions
│   │   └── hardhat-compiler.ts # Hardhat integration
│   └── index.ts       # Main CLI entry point
├── dist/              # Compiled JavaScript output
├── contracts/         # Smart contract examples
├── scripts/           # Deployment scripts
├── test/              # Test files
├── artifacts/         # Compiled contract artifacts
├── package.json       # Combined dependencies for CLI + Hardhat
├── tsconfig.json      # TypeScript configuration
└── hardhat.config.js  # Hardhat configuration
```

## Features Included

### ✅ Complete CLI Functionality
- **Wallet Management**: Create, import, manage wallets
- **Google Cloud Faucet**: Direct integration with `https://cloud.google.com/application/web3/faucet/somnia/shannon`
- **Smart Contract Deployment**: Full Hardhat integration
- **Contract Interaction**: Call functions, send transactions
- **Network Utilities**: Balance checking, status monitoring
- **Code Generation**: Contract and test templates

### ✅ Enhanced Faucet Options
```bash
somnia wallet fund --google  # Direct Google Cloud faucet access
somnia wallet fund --auto    # Try multiple faucet strategies
somnia wallet fund           # Manual instructions
```

### ✅ All Previous CLI Commands
```bash
somnia init                   # Initialize project
somnia wallet create          # Create wallet
somnia deploy MyContract      # Deploy contracts
somnia balance               # Check balance
somnia send <to> <amount>    # Send tokens
```

## Installation & Usage

1. Dependencies are already installed
2. CLI is built and ready: `npm run build`
3. Globally linked as `somnia` command
4. Can be renamed to `cli` directory as planned

## Migration Complete

All functionality from the separate CLI project has been successfully consolidated:
- ✅ TypeScript source code moved
- ✅ Dependencies merged
- ✅ Configuration files copied
- ✅ Build system working
- ✅ Global CLI command functional
- ✅ Google faucet integration preserved
- ✅ Hardhat integration maintained
- ✅ All commands tested and working

Ready for directory rename to `cli`!

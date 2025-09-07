# 🎯 Somnia CLI - Complete Guide

## 🚀 Quick Start Commands

Your **Somnia CLI** is now ready! Here are the key commands you requested:

### 📋 **Check Your Wallet**
```bash
somnia balance                    # Check current wallet balance
somnia wallet info               # Show detailed wallet information
```

### 💳 **Wallet Management**
```bash
somnia wallet create             # Create new HD wallet
somnia wallet import             # Import existing wallet
somnia wallet fund               # Get testnet tokens
```

### 🤖 **Create Contracts with AI**
```bash
somnia contract create --prompt "Simple NFT minter"           # AI generates NFT contract
somnia contract create --prompt "ERC20 token with 1M supply"  # AI generates ERC20 token
somnia contract create --prompt "Voting contract for DAO"     # AI generates voting contract
somnia contract create --prompt "MultiSig wallet"             # AI generates multisig contract
```

### 🚀 **Deploy Contracts**
```bash
somnia deploy MyToken                              # Deploy contract
somnia deploy MyToken --gas-price 20              # Deploy with custom gas
somnia deploy --file ./contracts/MyToken.sol      # Deploy specific file
```

### 📞 **Call Contract Functions**
```bash
somnia call 0x742d... getValue                          # Call view function
somnia call 0x742d... setValue 123                      # Call state function
somnia call 0x742d... transfer 0x123... 100             # Transfer tokens
somnia call 0x742d... increment                         #Increment by 1
#These commands changes for every contract as we are calling functions
```

### 🌐 **Network Commands**
```bash
somnia status                    # Network & wallet status
somnia network test              # Test connection speed
somnia network switch mainnet    # Switch to mainnet
```

## 🎯 **Real Wallet Integration Examples**

### 1. **Import Your Existing Wallet**
```bash
# Import with private key
somnia wallet import --private-key "0x123..."

# Import with mnemonic phrase
somnia wallet import --mnemonic "word1 word2 word3..."
```

### 2. **Create and Fund New Wallet**
```bash
# Create HD wallet
somnia wallet create --type hd

# Get testnet tokens
somnia wallet fund

# Check balance
somnia balance
```

### 3. **Generate and Deploy Your First Contract**
```bash
# Generate ERC20 token contract with AI
somnia contract create --prompt "ERC20 token named MyToken with 1 million supply"

# Deploy it
somnia deploy TokenContract

# Call functions
somnia call <deployed-address> name        # Get token name
somnia call <deployed-address> totalSupply # Get total supply
```

### 4. **Advanced Contract Interactions**
```bash
# Deploy with constructor arguments
somnia deploy MyContract --constructor-args '["TokenName", "TKN", 18, 1000000]'

# Call with specific gas settings
somnia call <address> transfer <to> <amount> --gas-limit 100000

# Send ETH with function call
somnia call <address> deposit --value 1.5
```

## 🔧 **Development Workflow**

### Complete DApp Development Flow:
```bash
# 1. Setup
somnia wallet create              # Create wallet
somnia wallet fund               # Get testnet tokens

# 2. AI Contract Generation
somnia contract create --prompt "DeFi token with staking rewards"
# AI generates contracts/DeFiContract.sol

# 3. Deploy & Test
somnia deploy DeFiContract
somnia call <address> name       # Test deployment

# 4. Interact
somnia call <address> stake 1000
somnia call <address> claimRewards
```

## 🌟 **Key Features**

✅ **Real Wallet Integration** - Import your existing wallets
✅ **Live Network Connection** - Direct Somnia testnet/mainnet access
✅ **AI Contract Generation** - Powered by Groq AI (LLaMA 3) for smart contracts
✅ **Gas Optimization** - Automatic gas estimation and optimization
✅ **Transaction Simulation** - Test before spending gas
✅ **Error Handling** - Clear error messages and debugging
✅ **Explorer Integration** - Direct links to block explorer
✅ **OpenZeppelin Standards** - AI generates secure, production-ready contracts

## 🎉 **Success! Your AI-Powered CLI is Ready**

The **Somnia CLI** is now fully functional with:
- ✅ Live testnet connectivity (Block: 162,480,000+)
- ✅ Real wallet import/creation
- ✅ Contract deployment & interaction
- ✅ Complete error handling
- ✅ User-friendly commands

**Start with:** `somnia wallet create` and then `somnia contract create MyFirstContract`!

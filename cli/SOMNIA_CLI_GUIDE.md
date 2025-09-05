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

### 📄 **Create Contracts**
```bash
somnia contract create MyToken --template erc20    # Create ERC20 token
somnia contract create MyNFT --template erc721     # Create NFT contract
somnia contract create Storage --template basic    # Create basic contract
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

### 3. **Deploy Your First Contract**
```bash
# Create ERC20 token contract
somnia contract create MyToken --template erc20

# Deploy it
somnia deploy MyToken

# Call functions
somnia call <deployed-address> name        # Get token name
somnia call <deployed-address> totalSupply # Get total supply
```

### 4. **Advanced Contract Interactions**
```bash
# Deploy with constructor arguments
somnia deploy MyToken --constructor-args '["TokenName", "TKN", 18, 1000000]'

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

# 2. Contract Development
somnia contract create DeFiToken --template erc20
# Edit contracts/DeFiToken.sol

# 3. Deploy & Test
somnia deploy DeFiToken
somnia call <address> name       # Test deployment

# 4. Interact
somnia call <address> mint <address> 1000
somnia call <address> transfer <to> 100
```

## 🌟 **Key Features**

✅ **Real Wallet Integration** - Import your existing wallets
✅ **Live Network Connection** - Direct Somnia testnet/mainnet access
✅ **Contract Templates** - ERC20, ERC721, MultiSig, Basic storage
✅ **Gas Optimization** - Automatic gas estimation and optimization
✅ **Transaction Simulation** - Test before spending gas
✅ **Error Handling** - Clear error messages and debugging
✅ **Explorer Integration** - Direct links to block explorer

## 🎉 **Success! Your CLI is Ready**

The **Somnia CLI** is now fully functional with:
- ✅ Live testnet connectivity (Block: 162,480,000+)
- ✅ Real wallet import/creation
- ✅ Contract deployment & interaction
- ✅ Complete error handling
- ✅ User-friendly commands

**Start with:** `somnia wallet create` and then `somnia contract create MyFirstContract`!

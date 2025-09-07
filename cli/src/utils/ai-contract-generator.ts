import { Groq } from 'groq-sdk';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';

export interface ContractGeneratorConfig {
  outputDir: string;
  verbose?: boolean;
  groqApiKey?: string;
}

export interface GenerationResult {
  projectPath: string;
  contractFile: string;
  contractName: string;
}

export class ContractGenerator {
  private groq: Groq;
  private config: ContractGeneratorConfig;

  constructor(config: ContractGeneratorConfig) {
    this.config = config;
    
    // Initialize Groq client
    const apiKey = config.groqApiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required in environment variables or config');
    }
    
    this.groq = new Groq({ apiKey });
  }

  async generateFromDescription(description: string): Promise<GenerationResult> {
    const spinner = ora('🤖 Generating smart contract with AI...').start();
    
    try {
      // Create project name based on description
      const contractName = this.generateContractName(description);
      
      if (this.config.verbose) {
        spinner.text = `📝 Using contract name: ${contractName}`;
      }
      
      // Ensure output directory exists
      await fs.ensureDir(this.config.outputDir);
      
      if (this.config.verbose) {
        spinner.text = `📁 Using output directory: ${this.config.outputDir}`;
      }
      
      // Generate contract using AI
      let contractCode: string;
      try {
        spinner.text = '🔄 Calling Groq AI...';
        contractCode = await this.generateContractCode(description, contractName);
      } catch (error) {
        spinner.warn('⚠️ AI generation failed, using fallback template');
        contractCode = this.getFallbackContract(contractName, description);
      }
      
      // Clean and validate the contract code
      contractCode = this.cleanContractCode(contractCode);
      
      // Write contract file directly in the contracts folder
      const contractFile = path.join(this.config.outputDir, `${contractName}.sol`);
      await fs.writeFile(contractFile, contractCode);
      
      spinner.succeed('✅ Contract generated successfully!');
      
      return {
        projectPath: this.config.outputDir,
        contractFile,
        contractName
      };
      
    } catch (error: any) {
      spinner.fail('❌ Contract generation failed');
      throw new Error(`Contract generation failed: ${error.message}`);
    }
  }

  private generateContractName(description: string): string {
    // Check for standard contract types
    if (description.toLowerCase().includes('erc721') || 
        description.toLowerCase().includes('nft')) {
      return 'NFTContract';
    } else if (description.toLowerCase().includes('erc20') || 
               description.toLowerCase().includes('token')) {
      return 'TokenContract';
    } else if (description.toLowerCase().includes('voting') || 
               description.toLowerCase().includes('dao')) {
      return 'VotingContract';
    } else if (description.toLowerCase().includes('multisig')) {
      return 'MultiSigContract';
    }
    
    // For custom names, convert to PascalCase and remove special characters
    let contractName = description
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
      
    // If empty or just spaces, use default name
    if (!contractName) {
      contractName = 'MyContract';
    }
    
    // Add "Contract" suffix if it doesn't already contain it
    if (!contractName.includes('Contract')) {
      contractName += 'Contract';
    }
    
    return contractName;
  }

  private async generateContractCode(description: string, contractName: string): Promise<string> {
    const prompt = `Write a Solidity smart contract for: "${description}"

REQUIREMENTS:
- Contract name: ${contractName}
- Solidity version: ^0.8.19
- Use OpenZeppelin npm imports: @openzeppelin/contracts/...
- Follow ERC standards exactly
- Include SPDX license
- Production-ready code only
- Include proper events, modifiers, and error handling
- Add comprehensive comments

RETURN ONLY THE SOLIDITY CODE - NO EXPLANATIONS OR MARKDOWN:`;

    const response = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      max_tokens: 1500
    });
    
    const contractCode = response.choices[0]?.message?.content;
    if (!contractCode) {
      throw new Error('No response from AI');
    }
    
    return contractCode;
  }

  private cleanContractCode(code: string): string {
    // Remove markdown code blocks
    let cleanCode = code.replace(/```solidity\n?/g, '').replace(/```\n?/g, '');
    
    // Remove explanatory text
    cleanCode = cleanCode.replace(/Here is.*?:/g, '');
    cleanCode = cleanCode.replace(/^[^\n]*Here is[^\n]*\n/gm, '');
    
    // Ensure SPDX license
    if (!cleanCode.includes('SPDX-License-Identifier')) {
      cleanCode = '// SPDX-License-Identifier: MIT\n' + cleanCode;
    }
    
    return cleanCode.trim();
  }

  private getFallbackContract(contractName: string, description: string): string {
    // Determine fallback template based on description
    if (description.toLowerCase().includes('erc721') || 
        description.toLowerCase().includes('nft')) {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${contractName} is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("${contractName}", "NFT") Ownable(msg.sender) {}

    function mint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
}`;
    } else if (description.toLowerCase().includes('erc20') || 
               description.toLowerCase().includes('token')) {
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${contractName} is ERC20, Ownable {
    constructor() ERC20("${contractName}", "TKN") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`;
    } else {
      // Basic contract template
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ${contractName} is Ownable {
    uint256 private value;
    
    event ValueChanged(uint256 newValue, address changedBy);
    
    constructor() Ownable(msg.sender) {}
    
    function setValue(uint256 _value) external onlyOwner {
        value = _value;
        emit ValueChanged(_value, msg.sender);
    }
    
    function getValue() external view returns (uint256) {
        return value;
    }
}`;
    }
  }
}

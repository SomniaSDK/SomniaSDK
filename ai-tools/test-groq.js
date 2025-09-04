#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ Error: GROQ_API_KEY not found in .env file');
  console.log('Please create a .env file with your Groq API key:');
  console.log('GROQ_API_KEY=your_api_key_here');
  process.exit(1);
}

async function generateContract(description) {
  console.log(`🤖 Generating contract for: "${description}"`);
  
  // Create project name
  const projectName = description.includes('ERC721') ? 'ERC721Contract' : 
                     description.includes('ERC20') ? 'ERC20Contract' : 
                     'MyContract';
  
  // Create contracts folder if it doesn't exist
  const contractsDir = './contracts';
  await fs.ensureDir(contractsDir);
  
  // Create project folder
  const projectPath = path.join(contractsDir, projectName);
  await fs.ensureDir(projectPath);
  
  console.log(`📁 Created folder: ${projectPath}`);
  
  try {
    // Call Groq API
    console.log('🔄 Calling Groq AI...');
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [{
        role: 'user',
        content: `Write a Solidity smart contract for: "${description}"

REQUIREMENTS:
- Contract name: ${projectName}
- Solidity version: ^0.8.19
- Use OpenZeppelin npm imports: @openzeppelin/contracts/...
- Follow ERC standards exactly
- Include SPDX license
- Production-ready code only

RETURN ONLY THE SOLIDITY CODE - NO EXPLANATIONS OR MARKDOWN:`
      }],
      temperature: 0.1,
      max_tokens: 1500
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    let contractCode = response.data.choices[0].message.content.trim();
    
    // Clean the code more aggressively
    contractCode = contractCode.replace(/```solidity\n?/g, '').replace(/```\n?/g, '');
    contractCode = contractCode.replace(/Here is.*?:/g, '');
    contractCode = contractCode.replace(/^[^\n]*Here is[^\n]*\n/gm, '');
    
    if (!contractCode.includes('SPDX-License-Identifier')) {
      contractCode = '// SPDX-License-Identifier: MIT\n' + contractCode;
    }
    
    // Save contract
    const contractFile = path.join(projectPath, `${projectName}.sol`);
    await fs.writeFile(contractFile, contractCode);
    
    console.log(`✅ Contract generated successfully!`);
    console.log(`📄 File: ${contractFile}`);
    
  } catch (error) {
    console.error('❌ Groq API failed, using fallback template');
    
    // Fallback template
    const fallbackCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${projectName} is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("${projectName}", "NFT") Ownable(msg.sender) {}

    function mint(address to) public onlyOwner {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        _safeMint(to, tokenId);
    }
}`;
    
    const contractFile = path.join(projectPath, `${projectName}.sol`);
    await fs.writeFile(contractFile, fallbackCode);
    
    console.log(`✅ Fallback contract generated!`);
    console.log(`📄 File: ${contractFile}`);
  }
}

// CLI logic
const args = process.argv.slice(2);
const command = args[0];
const description = args[1];

if (command === 'generate' && description) {
  generateContract(description).catch(console.error);
} else {
  console.log('Usage: node somnia-cli.js generate "ERC721"');
}
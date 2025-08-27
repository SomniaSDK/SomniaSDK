import pkg from './dist/contract-gen.js';
const { ContractGenerator } = pkg;

async function testGroqGeneration() {
  console.log('🚀 Testing Groq AI Contract Generation...\n');
  
  const generator = new ContractGenerator({
    outputDir: './contracts',
    verbose: true,
    groqApiKey: 'GROQ_API_KEY'
  });
  
  // Test ERC721 generation
  console.log('🎯 Testing: somnia generate "ERC721"');
  try {
    const result = await generator.generateFromDescription('ERC721');
    console.log('✅ Success!\n');
    console.log(`📁 Folder: ${result.projectPath}`);
    console.log(`📄 Contract: ${result.contractFile}\n`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

testGroqGeneration();

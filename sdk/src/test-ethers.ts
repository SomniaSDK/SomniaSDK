import { ethers } from 'ethers';

// Test ethers import
console.log('Ethers version:', ethers.version);

export function testEthers() {
  const provider = new ethers.JsonRpcProvider('https://rpc.somnia.network');
  console.log('Provider created successfully');
  return provider;
}

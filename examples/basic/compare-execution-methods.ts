/**
 * Compare how working viem script vs Protocol Kit formats execTransaction call
 */

import { encodeFunctionData } from 'viem';

// Safe execTransaction ABI
const execTransactionAbi = {
  name: 'execTransaction',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'signatures', type: 'bytes' },
  ],
  outputs: [{ name: 'success', type: 'bool' }],
  stateMutability: 'nonpayable',
} as const;

console.log('\n📊 Comparing Transaction Formats\n');

// Example transaction data
const txData = {
  to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  value: 1000000n,
  data: '0x',
  operation: 0,
  safeTxGas: 0n,
  baseGas: 0n,
  gasPrice: 0n,
  gasToken: '0x0000000000000000000000000000000000000000',
  refundReceiver: '0x0000000000000000000000000000000000000000',
  signatures: '0x' + 'a'.repeat(130), // Mock signature
};

// Method 1: How viem encodes it
console.log('1️⃣ Working Viem Method:');
const viemEncoded = encodeFunctionData({
  abi: [execTransactionAbi],
  functionName: 'execTransaction',
  args: [
    txData.to,
    txData.value,
    txData.data,
    txData.operation,
    txData.safeTxGas,
    txData.baseGas,
    txData.gasPrice,
    txData.gasToken,
    txData.refundReceiver,
    txData.signatures,
  ],
});

console.log('   Encoded data:', viemEncoded);
console.log('   Length:', viemEncoded.length);
console.log('   Function selector:', viemEncoded.slice(0, 10));
console.log('   First address:', viemEncoded.slice(10, 74));
console.log('');

// Method 2: How Protocol Kit might encode it
console.log('2️⃣ Protocol Kit Method:');
console.log('   Protocol Kit uses ethers.js which encodes similarly');
console.log('   The key is ensuring our parser handles the encoded data correctly');
console.log('');

// Method 3: What our transport sees
console.log('3️⃣ What Our Transport Receives:');
console.log('   Input: ', viemEncoded);
console.log('   Selector: ', viemEncoded.slice(0, 10));
console.log('');

// Parse the data like our transport does
const selector = viemEncoded.slice(2, 10); // Remove 0x and get 4 bytes
console.log('4️⃣ Registry Lookup:');
console.log('   Selector: ', selector);
console.log('   Expected: 6a761202');
console.log('   Match: ', selector === '6a761202' ? '✅' : '❌');
console.log('');

// Check parameter encoding
console.log('5️⃣ Parameter Breakdown:');
const rawParams = viemEncoded.slice(10); // Skip 0x + selector
console.log('   Total param bytes:', rawParams.length / 2);
console.log('   Expected: 10 params × 32 bytes = 320 bytes minimum');
console.log('   (Plus dynamic data for bytes parameters)');
console.log('');

// Identify dynamic parameters
console.log('6️⃣ Dynamic Parameters (bytes):');
console.log('   Param 3 (data): offset pointer at position 64-128');
console.log('   Param 10 (signatures): offset pointer at position 288-320');
console.log('   Both need special handling in parser!');
console.log('');

console.log('💡 Key Insight:');
console.log('   Our parser needs to handle MULTIPLE bytes parameters correctly.');
console.log('   Current parser may only handle ONE bytes parameter.');
console.log('');

console.log('✅ Next Step:');
console.log('   Check src/tronWeb/abi/parser.ts parseCallData()');
console.log('   Verify it handles multiple dynamic bytes parameters');

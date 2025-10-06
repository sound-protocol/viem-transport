/**
 * Demonstrate complex type detection for eth_sendTransaction
 *
 * This shows how the transport routes different function types:
 * - Simple types (transfer, approve) → Parsed params mode
 * - Complex types (execTransaction) → rawParameter mode
 */

import { encodeFunctionData } from 'viem';

// Import parser to test detection logic
import { parseCallData } from '../../src/tronWeb/abi/parser';

console.log('\n🔍 Complex Type Detection Demo\n');
console.log('==========================================\n');

// Test 1: Simple function (ERC-20 transfer)
console.log('1️⃣ Simple Function: ERC-20 transfer(address,uint256)');
console.log('   Parameter types: address, uint256');

const transferAbi = {
  name: 'transfer',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ],
  outputs: [{ name: 'success', type: 'bool' }],
  stateMutability: 'nonpayable',
} as const;

const transferData = encodeFunctionData({
  abi: [transferAbi],
  functionName: 'transfer',
  args: ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 1000000n]
});

const transferParsed = parseCallData(transferData.slice(2)); // Remove 0x

if (transferParsed) {
  const hasComplexTypes = transferParsed.functionInfo.params.some(p =>
    p === 'bytes' || p.includes('[]') || p.startsWith('bytes[')
  );

  console.log('   ✅ Function in registry: YES');
  console.log(`   ✅ Has complex types: ${hasComplexTypes ? 'YES' : 'NO'}`);
  console.log(`   ✅ Routing: ${hasComplexTypes ? 'rawParameter mode' : 'Parsed params mode'}`);
  console.log('   ✅ Result: Uses parsed params with address conversion ✨\n');
}

// Test 2: Complex function (Safe execTransaction)
console.log('2️⃣ Complex Function: Safe execTransaction(...)');
console.log('   Parameter types: address, uint256, bytes, uint8, uint256, uint256, uint256, address, address, bytes');
console.log('                     ^^^^^^^         ^^^^^                                                        ^^^^^');
console.log('                     simple          COMPLEX                                                      COMPLEX');

const execTransactionAbi = {
  name: 'execTransaction',
  type: 'function',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'data', type: 'bytes' },  // ← Complex
    { name: 'operation', type: 'uint8' },
    { name: 'safeTxGas', type: 'uint256' },
    { name: 'baseGas', type: 'uint256' },
    { name: 'gasPrice', type: 'uint256' },
    { name: 'gasToken', type: 'address' },
    { name: 'refundReceiver', type: 'address' },
    { name: 'signatures', type: 'bytes' }, // ← Complex
  ],
  outputs: [{ name: 'success', type: 'bool' }],
  stateMutability: 'nonpayable',
} as const;

const execData = encodeFunctionData({
  abi: [execTransactionAbi],
  functionName: 'execTransaction',
  args: [
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    1000000n,
    '0x',
    0,
    0n,
    0n,
    0n,
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    '0x' + 'a'.repeat(130)
  ]
});

const execParsed = parseCallData(execData.slice(2)); // Remove 0x

if (execParsed) {
  const hasComplexTypes = execParsed.functionInfo.params.some(p =>
    p === 'bytes' || p.includes('[]') || p.startsWith('bytes[')
  );

  console.log('   ✅ Function in registry: YES');
  console.log(`   ✅ Has complex types: ${hasComplexTypes ? 'YES' : 'NO'}`);
  console.log(`   ✅ Routing: ${hasComplexTypes ? 'rawParameter mode' : 'Parsed params mode'}`);
  console.log('   ✅ Result: Uses rawParameter, TronWeb decodes internally 🛡️\n');
}

// Test 3: Array function (hypothetical)
console.log('3️⃣ Array Function: batchTransfer(address[],uint256[])');
console.log('   Parameter types: address[], uint256[]');
console.log('                    ^^^^^^^^^ ^^^^^^^^^^');
console.log('                    COMPLEX   COMPLEX');

// Simulate what would happen if we had this in registry
const mockArrayParsed = {
  functionInfo: {
    signature: 'batchTransfer(address[],uint256[])',
    params: ['address[]', 'uint256[]']
  },
  params: []
};

const hasComplexTypes = mockArrayParsed.functionInfo.params.some(p =>
  p === 'bytes' || p.includes('[]') || p.startsWith('bytes[')
);

console.log('   ✅ Function in registry: (hypothetical)');
console.log(`   ✅ Has complex types: ${hasComplexTypes ? 'YES' : 'NO'}`);
console.log(`   ✅ Routing: ${hasComplexTypes ? 'rawParameter mode' : 'Parsed params mode'}`);
console.log('   ✅ Result: Would use rawParameter for safety 🛡️\n');

// Summary
console.log('📊 Routing Summary');
console.log('==========================================');
console.log('');
console.log('Simple Types → Parsed Params Mode:');
console.log('  ✅ address, uint256, uint8, bool, bytes32');
console.log('  ✅ Benefits: Address conversion, better errors');
console.log('  ✅ Examples: transfer, approve, mint');
console.log('');
console.log('Complex Types → rawParameter Mode:');
console.log('  ✅ bytes, arrays (address[], uint256[], etc.)');
console.log('  ✅ Benefits: Reliable ABI decoding by TronWeb');
console.log('  ✅ Examples: execTransaction, batchTransfer');
console.log('');
console.log('Unknown Functions → rawParameter Mode:');
console.log('  ✅ Not in function registry');
console.log('  ✅ Benefits: Still works, no parsing needed');
console.log('  ✅ Trade-off: No address conversion');
console.log('');
console.log('✨ Best of both worlds: Optimization + Safety!');

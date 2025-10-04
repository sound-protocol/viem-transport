/**
 * Debug what the parser outputs for execTransaction
 */

import { TronWeb } from 'tronweb';
import { parseCallData, convertParamsToTron } from '../../src/tronWeb/abi/parser';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

// Real execTransaction call data
const callData = '6a761202000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa00000000000000000000000000000000000000000000000000000000000000';

console.log('\n🔍 Debugging Parser Output\n');

// Step 1: Parse the call data
console.log('1️⃣ Parsing call data...');
const parsed = parseCallData(callData);

if (!parsed) {
  console.log('❌ Failed to parse call data');
  process.exit(1);
}

console.log('✅ Parsed successfully');
console.log('Function:', parsed.functionInfo.signature);
console.log('Number of params:', parsed.params.length);
console.log('\nParsed params:');
parsed.params.forEach((p, i) => {
  console.log(`  ${i}: type=${p.type}, value=${typeof p.value === 'string' ? p.value.slice(0, 50) + '...' : p.value}`);
});

// Step 2: Convert to Tron format
console.log('\n2️⃣ Converting to Tron format...');
const tronParams = convertParamsToTron(parsed.params, tw);

console.log('Tron params:');
tronParams.forEach((p, i) => {
  console.log(`  ${i}:`, JSON.stringify(p).slice(0, 100));
});

// Step 3: Check if they're still objects or plain values
console.log('\n3️⃣ Checking param format:');
console.log('First param is object:', typeof tronParams[0] === 'object');
console.log('First param structure:', tronParams[0]);

console.log('\n💡 Conclusion:');
if (typeof tronParams[0] === 'object' && tronParams[0].type && tronParams[0].value) {
  console.log('❌ Parameters are still {type, value} objects');
  console.log('   TronWeb may expect plain values instead');
  console.log('\n🔧 Fix needed: Extract .value from each param');
} else {
  console.log('✅ Parameters are plain values');
  console.log('   Format looks correct for TronWeb');
}

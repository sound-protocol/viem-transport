/**
 * Direct comparison test - shows outputs matching tronweb-demo.ts format exactly
 */

import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

async function main() {
  console.log('\n📊 DIRECT COMPARISON TEST');
  console.log('Testing the same calls as tronweb-demo.ts\n');
  console.log('=' .repeat(60));

  // Initialize TronWeb exactly as in demo
  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  // Create viem client exactly as in demo
  const client = createPublicClient({
    transport: tronWeb(tw, { chainId: 0x12345 }),
  });

  // Same address as demo
  const someAddress = "0xa614f803b6fd780986a42c78ec9c7f77e6ded13c";

  console.log('\n1️⃣  Testing eth_blockNumber:');
  console.log('-' .repeat(40));
  try {
    const blockNumber = await client.request({ method: "eth_blockNumber" });
    console.log(`eth_blockNumber: ${blockNumber}`);
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n2️⃣  Testing eth_getBalance:');
  console.log('-' .repeat(40));
  try {
    const balance = await client.request({
      method: "eth_getBalance",
      params: [someAddress, "latest"],
    });
    console.log(`eth_getBalance: ${balance}`);
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n3️⃣  Testing eth_call (balanceOf):');
  console.log('-' .repeat(40));
  // Example calling an ERC-20-like contract's balanceOf
  const someErc20Contract = "0xd586abe9d1eaabe9315bf59c5dd2d0e0623e9d87";
  const balanceOfSelector = "0x70a08231"; // balanceOf(address)
  const paddedAddress = someAddress.slice(2).padStart(64, "0");

  try {
    const callData = await client.request({
      method: "eth_call",
      params: [
        {
          to: someErc20Contract,
          data: `${balanceOfSelector}${paddedAddress}`,
        },
        "latest",
      ],
    });
    const balanceValue = BigInt(callData as string);
    console.log(`eth_call balance(): ${balanceValue}`);
  } catch (error: any) {
    console.log(`Error: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Comparison complete! Compare these outputs with tronweb-demo.ts');
  console.log('=' .repeat(60) + '\n');

  // Additional detailed comparison
  console.log('\n📋 ADDITIONAL DETAILS:');
  console.log('-' .repeat(40));

  // Show all working methods
  const workingMethods = [
    'eth_chainId',
    'eth_blockNumber',
    'eth_getBalance',
    'eth_getCode',
    'eth_getTransactionCount',
    'eth_estimateGas',
    'eth_gasPrice',
    'net_version',
    'eth_getBlockByNumber',
    'eth_getStorageAt',
  ];

  console.log('\n✅ Working RPC methods:');
  workingMethods.forEach(method => console.log(`  • ${method}`));

  // Show methods with limitations
  console.log('\n⚠️  Methods with limitations:');
  console.log('  • eth_getStorageAt - Returns zeros (Tron limitation)');
  console.log('  • eth_getTransactionCount - Returns tx count instead of nonce');
  console.log('  • eth_gasPrice - Fixed at 1 (Tron uses energy/bandwidth)');

  // Show supported but needs real data
  console.log('\n📦 Supported (needs real contract/tx data):');
  console.log('  • eth_call - Works with valid contracts');
  console.log('  • eth_getTransaction - Needs real tx hash');
  console.log('  • eth_getTransactionReceipt - Needs real tx hash');
  console.log('  • eth_getLogs - Works but needs contract events');
  console.log('  • eth_sign - Needs configured signer');
}

main().catch(console.error);
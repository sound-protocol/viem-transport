import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

async function test() {
  console.log('\n🔍 Simple Integration Test - Matching tronweb-demo.ts\n');
  console.log('=' .repeat(50));

  // Initialize TronWeb
  const tw = new TronWeb({
    fullHost: 'https://api.trongrid.io',
  });

  // Create transport
  const transport = tronWeb(tw, {
    chainId: '0x2b6653dc', // Tron Mainnet
  });

  // Create viem client
  const publicClient = createPublicClient({
    transport: transport,
  });

  // Use the same test address as tronweb-demo.ts
  const testAddress = '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c';
  const contractAddress = '0xd586abe9d1eaabe9315bf59c5dd2d0e0623e9d87'; // Example contract

  console.log(`Test Address: ${testAddress}`);
  console.log('=' .repeat(50));
  console.log('');

  // Test 1: eth_blockNumber
  try {
    const blockNumber = await publicClient.request({
      method: 'eth_blockNumber'
    });
    console.log(`✅ eth_blockNumber: ${blockNumber}`);
    console.log(`   Decimal: ${parseInt(blockNumber as string, 16)}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_blockNumber failed: ${error.message}`);
    console.log('');
  }

  // Test 2: eth_getBalance
  try {
    const balance = await publicClient.request({
      method: 'eth_getBalance',
      params: [testAddress, 'latest'],
    });
    console.log(`✅ eth_getBalance: ${balance}`);
    console.log(`   TRX: ${parseInt(balance as string, 16) / 1e6}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_getBalance failed: ${error.message}`);
    console.log('');
  }

  // Test 3: eth_call (like in tronweb-demo.ts)
  try {
    // Call balanceOf method
    const balanceOfSelector = '0x70a08231'; // balanceOf(address)
    const paddedAddress = testAddress.slice(2).padStart(64, '0');

    const result = await publicClient.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: `${balanceOfSelector}${paddedAddress}`,
      }, 'latest'],
    });

    console.log(`✅ eth_call balance(): ${result}`);
    if (result !== '0x' && result !== '0x0') {
      const balanceValue = BigInt(result as string);
      console.log(`   Decimal: ${balanceValue}`);
    }
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_call failed: ${error.message}`);
    console.log('');
  }

  // Additional useful tests
  console.log('=' .repeat(50));
  console.log('Additional Method Tests:');
  console.log('=' .repeat(50));
  console.log('');

  // Test 4: eth_chainId
  try {
    const chainId = await publicClient.request({ method: 'eth_chainId' });
    console.log(`✅ eth_chainId: ${chainId}`);
    console.log(`   Decimal: ${parseInt(chainId as string, 16)}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_chainId failed: ${error.message}`);
    console.log('');
  }

  // Test 5: eth_getCode
  try {
    const code = await publicClient.request({
      method: 'eth_getCode',
      params: [testAddress, 'latest'],
    });
    const isContract = code !== '0x' && code !== '0x0';
    console.log(`✅ eth_getCode: ${isContract ? 'Contract found' : 'Not a contract'}`);
    if (isContract) {
      console.log(`   Bytecode length: ${(code as string).length - 2} bytes`);
    }
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_getCode failed: ${error.message}`);
    console.log('');
  }

  // Test 6: eth_getTransactionCount
  try {
    const txCount = await publicClient.request({
      method: 'eth_getTransactionCount',
      params: [testAddress, 'latest'],
    });
    console.log(`✅ eth_getTransactionCount: ${txCount}`);
    console.log(`   Decimal: ${parseInt(txCount as string, 16)}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_getTransactionCount failed: ${error.message}`);
    console.log('');
  }

  // Test 7: eth_estimateGas
  try {
    const gasEstimate = await publicClient.request({
      method: 'eth_estimateGas',
      params: [{
        from: testAddress,
        to: '0x0000000000000000000000000000000000000001',
        value: '0x1',
      }],
    });
    console.log(`✅ eth_estimateGas: ${gasEstimate}`);
    console.log(`   Decimal: ${parseInt(gasEstimate as string, 16)}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_estimateGas failed: ${error.message}`);
    console.log('');
  }

  // Test 8: eth_getBlockByNumber
  try {
    const block = await publicClient.request({
      method: 'eth_getBlockByNumber',
      params: ['latest', false],
    });
    console.log(`✅ eth_getBlockByNumber:`);
    console.log(`   Number: ${block.number}`);
    console.log(`   Hash: ${block.hash}`);
    console.log(`   Timestamp: ${block.timestamp} (${new Date(parseInt(block.timestamp as string, 16) * 1000).toISOString()})`);
    console.log(`   Transactions: ${block.transactions.length}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_getBlockByNumber failed: ${error.message}`);
    console.log('');
  }

  // Test 9: eth_gasPrice
  try {
    const gasPrice = await publicClient.request({ method: 'eth_gasPrice' });
    console.log(`✅ eth_gasPrice: ${gasPrice}`);
    console.log(`   Note: Fixed at 1 wei (Tron uses energy/bandwidth)`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ eth_gasPrice failed: ${error.message}`);
    console.log('');
  }

  // Test 10: net_version
  try {
    const netVersion = await publicClient.request({ method: 'net_version' });
    console.log(`✅ net_version: ${netVersion}`);
    console.log('');
  } catch (error: any) {
    console.log(`❌ net_version failed: ${error.message}`);
    console.log('');
  }

  console.log('=' .repeat(50));
  console.log('✨ Test complete! All implemented methods tested.');
  console.log('=' .repeat(50));
}

// Run the test
test().catch(console.error);
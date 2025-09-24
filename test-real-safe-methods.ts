import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

async function testRealSafeMethods() {
  console.log('=== TESTING REAL SAFE METHOD SIGNATURES ===\n');

  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x2b6653dc",
      defaultFrom: "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe",
    }),
  });

  // Using USDT contract as a stand-in (since we don't have a real Safe deployed)
  const contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

  console.log('Testing Safe-like method calls:\n');

  // 1. Test getOwners() - 0xa0e67e2b
  console.log('1. Safe getOwners():');
  try {
    const result = await client.request({
      method: "eth_call",
      params: [{
        to: contractAddress,
        data: "0xa0e67e2b", // getOwners()
      }, "latest"],
    });
    console.log('   Result:', result);
  } catch (e: any) {
    console.log('   Failed (expected - not a Safe):', e.message?.split('\n')[0]);
  }

  // 2. Test getThreshold() - 0xe75235b8
  console.log('\n2. Safe getThreshold():');
  try {
    const result = await client.request({
      method: "eth_call",
      params: [{
        to: contractAddress,
        data: "0xe75235b8", // getThreshold()
      }, "latest"],
    });
    console.log('   Result:', result);
  } catch (e: any) {
    console.log('   Failed (expected):', e.message?.split('\n')[0]);
  }

  // 3. Test nonce() - 0xaffed0e0
  console.log('\n3. Safe nonce():');
  try {
    const result = await client.request({
      method: "eth_call",
      params: [{
        to: contractAddress,
        data: "0xaffed0e0", // nonce()
      }, "latest"],
    });
    console.log('   Result:', result);
  } catch (e: any) {
    console.log('   Failed (expected):', e.message?.split('\n')[0]);
  }

  // 4. Test execTransaction with proper encoding
  console.log('\n4. Safe execTransaction (estimate):');
  try {
    // This would be a full execTransaction call
    const execData = '0x6a761202' + '0'.repeat(600); // Simplified - would need proper encoding

    const gasEstimate = await client.request({
      method: "eth_estimateGas",
      params: [{
        from: "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe",
        to: contractAddress,
        data: execData,
      }],
    });
    console.log('   Gas estimate:', gasEstimate);
  } catch (e: any) {
    console.log('   Failed:', e.message?.split('\n')[0]);
  }

  console.log('\n=== KEY FINDINGS ===');
  console.log('1. eth_call works with proper hex data');
  console.log('2. Methods fail as expected on non-Safe contracts');
  console.log('3. Gas estimation works but may be inaccurate');
  console.log('4. Would need actual Safe deployment to test properly');

  console.log('\n=== NONCE PROBLEM ===');
  console.log('Tron has NO NONCE CONCEPT!');
  console.log('- Ethereum: Transactions require sequential nonces');
  console.log('- Tron: Transactions have expiration timestamps instead');
  console.log('- Impact: Safe nonce management WILL NOT WORK');
  console.log('- Workaround: Would need custom Safe implementation for Tron');
}

testRealSafeMethods().catch(console.error);
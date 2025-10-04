/**
 * Test TronGrid API directly for contract info
 */

import 'dotenv/config';

async function testTronGridAPI() {
  const contractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT on Nile

  console.log('\n🌐 Testing TronGrid API\n');

  // Method 1: /wallet/getcontract
  console.log('1. GET /wallet/getcontract:');
  try {
    const response = await fetch('https://nile.trongrid.io/wallet/getcontract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: contractAddress, visible: true }),
    });
    const data = await response.json();
    console.log('   Response keys:', Object.keys(data));
    console.log('   Has bytecode:', !!data.bytecode);
    console.log('   Has code_hash:', !!data.code_hash);
    console.log('   Has abi:', !!data.abi);
    console.log('   Data:', JSON.stringify(data, null, 2).slice(0, 500));
  } catch (err) {
    console.log('   Error:', err);
  }

  // Method 2: /walletsolidity/getcontract
  console.log('\n2. GET /walletsolidity/getcontract:');
  try {
    const response = await fetch('https://nile.trongrid.io/walletsolidity/getcontract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: contractAddress, visible: true }),
    });
    const data = await response.json();
    console.log('   Response keys:', Object.keys(data));
    console.log('   Has bytecode:', !!data.bytecode);
    console.log('   Has code_hash:', !!data.code_hash);
    console.log('   Has abi:', !!data.abi);
  } catch (err) {
    console.log('   Error:', err);
  }

  // Method 3: /wallet/getcontractinfo
  console.log('\n3. GET /wallet/getcontractinfo:');
  try {
    const response = await fetch('https://nile.trongrid.io/wallet/getcontractinfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: contractAddress, visible: true }),
    });
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('   Error:', err);
  }
}

testTronGridAPI()
  .then(() => console.log('\n✅ Done\n'))
  .catch(err => console.error('\n❌ Error:', err));

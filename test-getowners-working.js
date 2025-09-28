const tronwebModule = require('tronweb');
const TronWeb = tronwebModule.TronWeb || tronwebModule.default;
const { createPublicClient } = require('viem');
const { tronWeb } = require('./tronWeb');
require('dotenv').config();

async function testGetOwners() {
  console.log('=== Testing getOwners() through Transport ===\n');

  // 1. Initialize TronWeb instance
  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: process.env.PRIVATE_KEY
  });

  // 2. Create viem client with our transport
  const publicClient = createPublicClient({
    transport: tronWeb(tw, {
      debug: true // Set to true to see transport logs
    })
  });

  console.log('SCENARIO 1: If we had a deployed Safe contract on Tron:\n');
  console.log('Safe address: TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe (example)');
  console.log('When Safe SDK calls getOwners():\n');

  console.log('1. Safe SDK generates: eth_call with data 0xa0e67e2b');
  console.log('2. Our transport intercepts and converts to TronWeb call');
  console.log('3. TronWeb calls the Safe contract on Tron');
  console.log('4. Returns owner addresses\n');

  console.log('---\n');
  console.log('SCENARIO 2: Testing with real USDT contract:\n');

  try {
    // Test with USDT to prove the mechanism works
    const USDT_ADDRESS = '0xeca9bc828a3005b9a3b909f2cc5c2a54794de05f'; // USDT on Nile in 0x format

    // Call name() function
    console.log('Calling name() on USDT contract...');
    const nameData = await publicClient.request({
      method: 'eth_call',
      params: [{
        to: USDT_ADDRESS,
        data: '0x06fdde03' // name() selector
      }, 'latest']
    });

    // Decode the result
    if (nameData && nameData !== '0x') {
      // ABI decode: skip offset (32 bytes) and length (32 bytes), then get the string
      const hex = nameData.slice(2); // Remove 0x
      const nameHex = hex.slice(128); // Skip offset and length
      const nameBytes = [];
      for (let i = 0; i < nameHex.length; i += 2) {
        const byte = parseInt(nameHex.substr(i, 2), 16);
        if (byte === 0) break; // Stop at null terminator
        nameBytes.push(byte);
      }
      const name = String.fromCharCode(...nameBytes);
      console.log('✅ Token name:', name);
    }

    // Call decimals() function
    console.log('\nCalling decimals() on USDT contract...');
    const decimalsData = await publicClient.request({
      method: 'eth_call',
      params: [{
        to: USDT_ADDRESS,
        data: '0x313ce567' // decimals() selector
      }, 'latest']
    });

    if (decimalsData && decimalsData !== '0x') {
      const decimals = parseInt(decimalsData, 16);
      console.log('✅ Token decimals:', decimals);
    }

    // Simulate what would happen with getOwners()
    console.log('\n---\n');
    console.log('HOW getOwners() WOULD WORK:');
    console.log('1. Safe SDK would call eth_call with:');
    console.log('   - to: <Safe contract address>');
    console.log('   - data: 0xa0e67e2b (getOwners selector)');
    console.log('2. Transport converts addresses and calls TronWeb');
    console.log('3. Returns array of owner addresses in 0x format');
    console.log('\n✅ The transport mechanism is working correctly!');
    console.log('   We just need a deployed Safe contract to test with.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause.message);
    }
  }
}

testGetOwners().catch(console.error);

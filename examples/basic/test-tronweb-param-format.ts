/**
 * Test what format TronWeb expects for triggerSmartContract params
 */

import { TronWeb } from 'tronweb';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

async function testParamFormats() {
  console.log('\n🧪 Testing TronWeb Parameter Formats\n');

  const safeAddress = 'TYourSafeAddressHere'; // Replace
  const mockParams = [
    'TV6yGC9dHvnfYYF6MSosi9vrXTAEM1pVy3', // to
    1000000, // value
    '0x', // data
    0, // operation
    0, // safeTxGas
    0, // baseGas
    0, // gasPrice
    'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // gasToken
    'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // refundReceiver
    '0x' + 'a'.repeat(130), // signatures
  ];

  // Test 1: With type wrappers (what we're doing now)
  console.log('1️⃣ Test with type wrappers:');
  const paramsWithTypes = mockParams.map((value, i) => ({
    type: i === 0 || i === 7 || i === 8 ? 'address' : i === 2 || i === 9 ? 'bytes' : 'uint256',
    value,
  }));

  console.log('   Format:', JSON.stringify(paramsWithTypes.slice(0, 2), null, 2));

  try {
    const trigger = await tw.transactionBuilder.triggerSmartContract(
      safeAddress,
      'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',
      {},
      paramsWithTypes,
      tw.defaultAddress.base58,
    );
    console.log('   Result: ✅ Success (or error below)');
    console.log('   Has transaction:', !!trigger?.transaction);
  } catch (err: any) {
    console.log('   Result: ❌ Error');
    console.log('   Error:', err.message);
  }

  // Test 2: Without type wrappers (just values)
  console.log('\n2️⃣ Test without type wrappers (just values):');
  console.log('   Format:', mockParams.slice(0, 2));

  try {
    const trigger = await tw.transactionBuilder.triggerSmartContract(
      safeAddress,
      'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',
      {},
      mockParams,
      tw.defaultAddress.base58,
    );
    console.log('   Result: ✅ Success');
    console.log('   Has transaction:', !!trigger?.transaction);
  } catch (err: any) {
    console.log('   Result: ❌ Error');
    console.log('   Error:', err.message);
  }

  console.log('\n💡 Conclusion:');
  console.log('   The format that works is what we should use in convertParamsToTron');
}

testParamFormats()
  .then(() => console.log('\n✅ Done\n'))
  .catch(err => console.error('\n❌ Error:', err));

/**
 * Test TronScan API for contract info
 */

async function testTronScanAPI() {
  const contractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // USDT on Nile

  console.log('\n🔎 Testing TronScan API (Nile testnet)\n');

  // TronScan Nile API
  const url = `https://nileapi.tronscan.org/api/contract?contract=${contractAddress}`;

  console.log(`URL: ${url}\n`);

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.data && data.data[0]) {
      const contract = data.data[0];
      console.log('\n✅ Contract found!');
      console.log('   Name:', contract.name);
      console.log('   Tag:', contract.tag1);
      console.log('   Verified:', contract.vip);
    }
  } catch (err) {
    console.log('❌ Error:', err);
  }

  // Alternative: Check account endpoint
  console.log('\n\n📋 Checking account endpoint:');
  try {
    const url2 = `https://nileapi.tronscan.org/api/account?address=${contractAddress}`;
    const response = await fetch(url2);
    const data = await response.json();

    console.log('Account type:', data.accountType);
    console.log('Is contract:', data.is_contract);
  } catch (err) {
    console.log('Error:', err);
  }
}

testTronScanAPI()
  .then(() => console.log('\n✅ Done\n'))
  .catch(err => console.error('\n❌ Error:', err));

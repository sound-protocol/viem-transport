/**
 * Inspect what TronWeb's getContract() actually returns
 */

import { TronWeb } from 'tronweb';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

async function inspectContract() {
  // USDT on Nile
  const usdtAddr = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

  console.log('\n🔍 Inspecting getContract() response for USDT:\n');

  const contract = await tw.trx.getContract(usdtAddr);

  console.log('Full contract object:');
  console.log(JSON.stringify(contract, null, 2));

  console.log('\n\nContract keys:');
  console.log(Object.keys(contract || {}));

  console.log('\n\nChecking specific fields:');
  console.log('  code_hash:', contract?.code_hash);
  console.log('  codeHash:', contract?.codeHash);
  console.log('  abi:', contract?.abi ? 'exists' : 'missing');
  console.log('  bytecode:', contract?.bytecode);
  console.log('  contract_address:', contract?.contract_address);
  console.log('  name:', contract?.name);
}

inspectContract()
  .then(() => console.log('\n✅ Done\n'))
  .catch(err => console.error('\n❌ Error:', err));

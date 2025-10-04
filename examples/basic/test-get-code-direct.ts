/**
 * Test eth_getCode DIRECTLY without Viem client
 */

import { TronWeb } from 'tronweb';
import { eth_getCode } from '../../src/tronWeb/methods/contracts';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

async function testDirect() {
  console.log('\n🔬 Direct eth_getCode Test\n');

  const addresses = [
    { name: 'USDT', addr: '0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C' },
    { name: 'Safe', addr: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  ];

  for (const { name, addr } of addresses) {
    console.log(`\n📦 ${name}: ${addr}`);

    try {
      const result = await eth_getCode(
        [addr],
        { tw, config: {}, getChainIdHex: () => '0xce5' }
      );

      console.log(`  Result: ${result}`);
      console.log(`  Type: ${typeof result}`);
      console.log(`  Length: ${String(result).length}`);
      console.log(`  Is empty: ${result === '0x'}`);
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Also test TronWeb directly
    console.log(`\n  TronWeb direct test:`);
    const tronAddr = tw.address.fromHex(addr);
    console.log(`  Tron address: ${tronAddr}`);

    try {
      const contract = await tw.trx.getContract(tronAddr);
      console.log(`  getContract result:`, {
        exists: !!contract,
        hasBytecode: !!contract?.bytecode,
        bytecodeType: typeof contract?.bytecode,
        bytecodeLength: contract?.bytecode?.length || 0,
      });

      const smartContract = await tw.trx.getSmartContract(tronAddr);
      console.log(`  getSmartContract result:`, {
        exists: !!smartContract,
        hasBytecode: !!smartContract?.bytecode,
        name: smartContract?.name,
      });
    } catch (err) {
      console.log(`  TronWeb error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

testDirect()
  .then(() => console.log('\n✅ Done\n'))
  .catch(err => console.error('\n❌ Error:', err));

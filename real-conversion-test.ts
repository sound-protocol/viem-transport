/**
 * REAL TEST - No mocks, actual TronWeb conversion
 */
import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

async function testRealConversion() {
  console.log('\n🔬 REAL CONVERSION TEST - NO MOCKS!\n');
  console.log('=' .repeat(60));

  // REAL TronWeb instance
  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  // REAL transport with REAL TronWeb
  const client = createPublicClient({
    transport: tronWeb(tw, { chainId: "0x2b6653dc" }),
  });

  // Real address to test
  const realAddress = "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe";
  const realHex41 = tw.address.toHex(realAddress);
  const realHex0x = '0x' + realHex41.slice(2);

  console.log('Testing REAL address conversion:\n');
  console.log(`Base58: ${realAddress}`);
  console.log(`Real Hex41: ${realHex41}`);
  console.log(`Real 0x: ${realHex0x}\n`);

  // Test all formats with REAL network calls
  const results: Record<string, any> = {};

  for (const [format, addr] of Object.entries({
    Base58: realAddress,
    Hex41: realHex41,
    Hex0x: realHex0x
  })) {
    try {
      const balance = await client.request({
        method: "eth_getBalance",
        params: [addr, "latest"],
      });
      const trx = parseInt(balance as string, 16) / 1e6;
      results[format] = { success: true, balance: trx };
      console.log(`✅ ${format}: ${trx.toFixed(2)} TRX`);
    } catch (error: any) {
      results[format] = { success: false, error: error.message };
      console.log(`❌ ${format}: FAILED - ${error.message}`);
    }
  }

  // Verify all formats return same balance
  const balances = Object.values(results)
    .filter(r => r.success)
    .map(r => r.balance);

  const allSame = balances.every(b => b === balances[0]);

  console.log('\n' + '=' .repeat(60));
  if (allSame && balances.length === 3) {
    console.log('✅ REAL CONVERSION WORKS! All formats return same balance.');
  } else {
    console.log('❌ CONVERSION BROKEN! Different balances or failures.');
  }
  console.log('=' .repeat(60) + '\n');

  return results;
}

testRealConversion().catch(console.error);
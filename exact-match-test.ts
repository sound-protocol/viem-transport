/**
 * EXACT match test - uses the same address as tronweb-demo.ts
 */

import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

async function main() {
  console.log('\n🎯 EXACT MATCH TEST - Same address as tronweb-demo.ts\n');
  console.log('=' .repeat(60));

  // Initialize TronWeb exactly as in demo
  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  // Create client with exact same config as demo
  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x0",  // Same as demo
      callOptions: { feeLimit: 15_000_000 },  // Same as demo
      sendOptions: { feeLimit: 20_000_000 },  // Same as demo
    }),
    batch: { multicall: false },  // Same as demo
  });

  // USE THE EXACT SAME ADDRESS AS DEMO
  const tronAddressBase58 = "TZFbTfFZJkqdDge8CkvZSyT7KgiJafYVTL"; // From demo

  // Our transport should handle Base58 directly!
  // But the demo converts it, so let's do the same for exact match
  const someAddress = `0x${TronWeb.address
    .toHex(tronAddressBase58)
    .replace(/^0x/i, "")
    .slice(-40)}` as const;

  console.log(`Original Base58: ${tronAddressBase58}`);
  console.log(`Converted to 0x: ${someAddress}`);
  console.log('=' .repeat(60));
  console.log('');

  // Test 1: eth_blockNumber
  const blockNumber = await client.request({ method: "eth_blockNumber" });
  console.log("eth_blockNumber:", blockNumber);

  // Test 2: eth_getBalance (exact same call as demo)
  try {
    const balance = await client.request({
      method: "eth_getBalance",
      params: [someAddress, "latest"],
    });
    console.log("eth_getBalance:", balance);

    // Show decimal conversion
    const balanceDecimal = parseInt(balance as string, 16);
    const balanceTRX = balanceDecimal / 1e6;
    console.log(`  → Decimal: ${balanceDecimal} SUN`);
    console.log(`  → TRX: ${balanceTRX}`);
  } catch (err) {
    console.warn("Balance call failed:", err);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('Now testing with Base58 directly (our transport handles it):');
  console.log('=' .repeat(60) + '\n');

  // Test that our transport handles Base58 directly
  try {
    const balance2 = await client.request({
      method: "eth_getBalance",
      params: [tronAddressBase58, "latest"],  // Pass Base58 directly!
    });
    console.log("eth_getBalance (Base58 input):", balance2);

    const balanceDecimal2 = parseInt(balance2 as string, 16);
    const balanceTRX2 = balanceDecimal2 / 1e6;
    console.log(`  → Decimal: ${balanceDecimal2} SUN`);
    console.log(`  → TRX: ${balanceTRX2}`);
  } catch (err: any) {
    console.warn("Base58 balance call failed:", err.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('Testing with known Tron addresses:');
  console.log('=' .repeat(60) + '\n');

  // Test with well-known Tron addresses
  const knownAddresses = {
    "Binance Hot Wallet": "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe",
    "Tether Treasury": "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs",
    "Justin Sun": "TRX6Q82wMqWNbCCiLqejbKe4fxpCWB4qr3",
  };

  for (const [name, address] of Object.entries(knownAddresses)) {
    try {
      const balance = await client.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      const balanceDecimal = parseInt(balance as string, 16);
      const balanceTRX = balanceDecimal / 1e6;
      console.log(`${name} (${address}):`);
      console.log(`  Balance: ${balance} (${balanceTRX.toLocaleString()} TRX)\n`);
    } catch (err: any) {
      console.log(`${name}: Failed - ${err.message}\n`);
    }
  }

  console.log('=' .repeat(60));
  console.log('✅ Test complete!');
  console.log('=' .repeat(60) + '\n');
}

main().catch(console.error);
import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

async function testEthCall() {
  console.log('=== TESTING eth_call DIRECTLY ===\n');

  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x2b6653dc",
      defaultFrom: "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe",
      callOptions: { feeLimit: 15_000_000 },
    }),
  });

  const safeOwner = "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe"; // Binance wallet
  const usdtContract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // USDT contract

  console.log('Test 1: Using CORRECT hex address in data');
  const hex41 = tw.address.toHex(safeOwner);
  const correctData = '0x70a08231' + hex41.slice(2).padStart(64, '0').toLowerCase();

  try {
    const result1 = await client.request({
      method: "eth_call",
      params: [{
        to: usdtContract,
        data: correctData,
      }, "latest"],
    });
    console.log('✅ Result:', result1);
    const balance = BigInt(result1 as string) / 1000000n;
    console.log('   Balance:', balance, 'USDT\n');
  } catch (e: any) {
    console.log('❌ Failed:', e.message, '\n');
  }

  console.log('Test 2: What the test file is sending (WRONG)');
  const wrongData = "0x70a08231" + safeOwner.replace(/^T/, '41').slice(2).padStart(64, '0');
  console.log('Wrong data:', wrongData);

  try {
    const result2 = await client.request({
      method: "eth_call",
      params: [{
        to: usdtContract,
        data: wrongData,
      }, "latest"],
    });
    console.log('✅ Result:', result2);
  } catch (e: any) {
    console.log('❌ Failed (expected):', e.message);
  }

  console.log('\n=== ANALYSIS ===');
  console.log('The error "INVALID hex String" happens because:');
  console.log('1. The test is creating INVALID hex data with non-hex characters');
  console.log('2. When data contains "JDENsfBJs...", it\'s not valid hex');
  console.log('3. TronWeb rejects this as "INVALID hex String"');
  console.log('\nThe safe-ready-test.ts has a BUG in line 154!');
}

testEthCall().catch(console.error);
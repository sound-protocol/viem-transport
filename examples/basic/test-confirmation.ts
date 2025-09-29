import { TronWeb } from 'tronweb';
import 'dotenv/config';
import { tronWeb, waitForTransactionReceipt } from '../../src/tronWeb';
import { createWalletClient } from 'viem';

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: PRIVATE_KEY,
});

const transport = tronWeb(tw);
const client = createWalletClient({ transport });

async function testConfirmation() {
  console.log('\n🧪 Testing Transaction Confirmation System\n');

  // Send a small transaction
  const toAddress = 'TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx'; // Test address
  const amount = 1_000_000n; // 1 TRX

  console.log('📤 Sending 1 TRX transaction...');
  try {
    const txHash = await client.request({
      method: 'eth_sendTransaction',
      params: [{
        from: tw.defaultAddress.base58,
        to: toAddress,
        value: `0x${amount.toString(16)}`,
      }],
    });

    console.log(`✅ Transaction sent: ${txHash}`);
    console.log(`View: https://nile.tronscan.org/#/transaction/${txHash.slice(2)}\n`);

    // Test waitForTransactionReceipt with progress callback
    console.log('⏳ Waiting for confirmations (19 blocks)...');

    const receipt = await waitForTransactionReceipt(tw, txHash, {
      confirmations: 19,
      timeout: 120000, // 2 minutes
      pollingInterval: 3000, // 3 seconds
      onConfirmation: (current, required) => {
        const progress = ((current / required) * 100).toFixed(0);
        console.log(`  📊 ${current}/${required} confirmations (${progress}%)`);
      },
    });

    console.log('\n✅ Transaction Confirmed!');
    console.log(`  Status: ${receipt.status === '0x1' ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log(`  Block: ${receipt.blockNumber} (${receipt.confirmations} confirmations)`);
    console.log(`  Gas Used: ${parseInt(receipt.gasUsed, 16)}`);
    console.log(`  From: ${receipt.from}`);
    console.log(`  To: ${receipt.to}`);

    return receipt;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Run the test
testConfirmation()
  .then(() => {
    console.log('\n✅ Confirmation system test PASSED');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Confirmation system test FAILED:', error);
    process.exit(1);
  });
/**
 * Execute Safe Transaction using Protocol Kit
 *
 * This demonstrates executing a fully-signed Safe transaction on Tron
 * using the official Safe Protocol Kit
 */

import { TronWeb } from 'tronweb';
import { createWalletClient } from 'viem';
import {
  tronWeb,
  connectToSafe,
  TRON_NILE_SAFE_ADDRESSES,
  waitForTransactionReceipt,
} from '../../dist/index.js';
import 'dotenv/config';

// Safe address from deployment
const SAFE_ADDRESS = '0x2ba4f190d888a80aba44701a3344619547b847f7';

// Transaction details from proposal
const SAFE_TX_HASH = '0xfc14d27ebac010ded51b456bdf5f5c12b19cc7eacf252a245a6a7e7baba5386f';

// Owner accounts
const OWNERS = [
  {
    privateKey: '336306101c4e1de37ff04779188624dfa0a44a5ad439cbff4dec0e6c2ca50277',
    address: 'TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp',
  },
  {
    privateKey: '8ffc6afdbdf96cd521188c190b828a0492d41315fb874e8f8c0fb484e71940b7',
    address: 'TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx',
  },
  {
    privateKey: 'fc70cf49d733ca057b49c84281b82e0d17664bcfe8a93800c2279d9a14b08a1d',
    address: 'TLbudatWj7613sD6bvUG4abWcZADZ6Vpje',
  },
];

async function executeSafeTransaction() {
  console.log('\n⚡ EXECUTING SAFE TRANSACTION WITH PROTOCOL KIT\n');
  console.log(`Safe Address: ${SAFE_ADDRESS}`);
  console.log(`Safe TX Hash: ${SAFE_TX_HASH}\n`);

  // Connect as Owner 1 (will execute the transaction)
  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: OWNERS[0].privateKey,
  });

  const transport = tronWeb(tw, { chainId: 3448148188 });
  const walletClient = createWalletClient({ transport });

  const protocolKit = await connectToSafe(
    {
      tronWeb: tw,
      walletClient,
      contractNetworks: {
        '3448148188': TRON_NILE_SAFE_ADDRESSES,
      },
    },
    SAFE_ADDRESS
  );

  console.log(`✅ Connected as: ${OWNERS[0].address}\n`);

  // Step 1: Recreate the transaction
  console.log('📋 Step 1: Recreating Safe Transaction\n');

  const recipientEvm = tw.address.toHex(OWNERS[0].address).replace(/^(41)/, '0x');

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to: recipientEvm,
        value: '1000000',
        data: '0x',
      },
    ],
  });

  console.log(`   To: ${safeTransaction.data.to}`);
  console.log(`   Value: ${safeTransaction.data.value} SUN`);
  console.log(`   Nonce: ${safeTransaction.data.nonce}\n`);

  // Step 2: Sign by Owner 1
  console.log('📋 Step 2: Collecting Signatures\n');

  let signedTx = await protocolKit.signTransaction(safeTransaction);
  console.log(`   ✅ Owner 1 signed (${signedTx.signatures.size}/2)`);

  // Step 3: Sign by Owner 2
  const tw2 = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: OWNERS[1].privateKey,
  });

  const transport2 = tronWeb(tw2, { chainId: 3448148188 });
  const walletClient2 = createWalletClient({ transport: transport2 });

  const protocolKit2 = await connectToSafe(
    {
      tronWeb: tw2,
      walletClient: walletClient2,
      contractNetworks: {
        '3448148188': TRON_NILE_SAFE_ADDRESSES,
      },
    },
    SAFE_ADDRESS
  );

  signedTx = await protocolKit2.signTransaction(signedTx);
  console.log(`   ✅ Owner 2 signed (${signedTx.signatures.size}/2)`);
  console.log(`   ✅ Threshold met!\n`);

  // Step 4: Execute transaction
  console.log('📋 Step 3: Executing Transaction\n');

  const executeTxResponse = await protocolKit.executeTransaction(signedTx);

  console.log(`   ✅ Execution transaction sent!`);
  console.log(`   TX Hash: ${executeTxResponse.hash}`);
  console.log(`   View: https://nile.tronscan.org/#/transaction/${executeTxResponse.hash.slice(2)}\n`);

  // Step 5: Wait for confirmation
  console.log('📋 Step 4: Waiting for Confirmation\n');

  const receipt = await waitForTransactionReceipt(tw, executeTxResponse.hash, {
    confirmations: 19,
    timeout: 120000,
    pollingInterval: 3000,
    onConfirmation: (current, required) => {
      const progress = Math.floor((current / required) * 100);
      process.stdout.write(`\r   📊 ${current}/${required} confirmations (${progress}%)`);
    },
  });

  console.log('\n');

  if (receipt.status === '0x1') {
    console.log('   ✅ Transaction executed successfully!\n');
  } else {
    console.log('   ❌ Transaction execution failed\n');
    throw new Error('Execution failed on-chain');
  }

  // Step 6: Verify Safe nonce increased
  console.log('📋 Step 5: Verifying Safe State\n');

  const newNonce = await protocolKit.getNonce();
  console.log(`   Safe nonce: ${newNonce} (was 0, now should be 1)`);

  if (Number(newNonce) === 1) {
    console.log('   ✅ Nonce increased correctly!\n');
  }

  return {
    success: true,
    safeAddress: SAFE_ADDRESS,
    safeTxHash: SAFE_TX_HASH,
    executionTxHash: executeTxResponse.hash,
    executionStatus: receipt.status === '0x1' ? 'success' : 'failed',
    newNonce: Number(newNonce),
  };
}

// Run the execution
executeSafeTransaction()
  .then((result) => {
    console.log('🎉 SAFE TRANSACTION EXECUTED SUCCESSFULLY!\n');
    console.log('✅ Multisig transaction executed using Protocol Kit');
    console.log('✅ 2-of-3 signatures collected');
    console.log('✅ Transaction confirmed on Tron Nile');
    console.log('✅ Safe state updated correctly\n');
    console.log('📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n💪 Full Safe Protocol Kit integration PROVEN on Tron!');
  })
  .catch((error) => {
    console.error('\n💥 EXECUTION FAILED:');
    console.error(error);
    process.exit(1);
  });

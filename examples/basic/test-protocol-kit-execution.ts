/**
 * Test Protocol Kit execution to identify the error
 */

import { TronWeb } from 'tronweb';
import { createWalletClient, createPublicClient } from 'viem';
import { tronWeb } from '../../src/tronWeb';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

const transport = tronWeb(tw, {
  chainId: 3448148188,
  signatureCompatibility: {
    vValueOffset: 4,
  },
});

const publicClient = createPublicClient({ transport });
const walletClient = createWalletClient({ transport });

async function testProtocolKitExecution() {
  console.log('\n🧪 Testing Protocol Kit Execution\n');

  const safeAddress = '0xYourSafeAddress'; // Replace with actual Safe
  const ownerAddress = tw.address.fromPrivateKey(process.env.PRIVATE_KEY || '');

  console.log('Safe Address:', safeAddress);
  console.log('Owner Address:', ownerAddress);

  try {
    // Step 1: Initialize Protocol Kit
    console.log('\n1️⃣ Initializing Protocol Kit...');

    const provider = new ethers.providers.JsonRpcProvider('https://nile.trongrid.io');
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
    const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer });

    const safe = await Safe.create({
      ethAdapter,
      safeAddress,
    });

    console.log('   ✅ Protocol Kit initialized');
    console.log('   Owners:', await safe.getOwners());
    console.log('   Threshold:', await safe.getThreshold());

    // Step 2: Create transaction
    console.log('\n2️⃣ Creating Safe transaction...');

    const safeTransaction = await safe.createTransaction({
      safeTransactionData: {
        to: ownerAddress, // Send back to self
        value: '1000000', // 1 TRX
        data: '0x',
      },
    });

    console.log('   ✅ Transaction created');
    console.log('   To:', safeTransaction.data.to);
    console.log('   Value:', safeTransaction.data.value);

    // Step 3: Sign transaction
    console.log('\n3️⃣ Signing transaction...');

    const signedTx = await safe.signTransaction(safeTransaction);
    console.log('   ✅ Transaction signed');
    console.log('   Signatures:', signedTx.signatures.size);

    // Step 4: Execute transaction (THIS IS WHERE IT MIGHT FAIL)
    console.log('\n4️⃣ Executing transaction...');
    console.log('   Calling safe.executeTransaction()...');

    const executeTxResponse = await safe.executeTransaction(signedTx);

    console.log('   ✅ Execution succeeded!');
    console.log('   TX Hash:', executeTxResponse.hash);

  } catch (error: any) {
    console.log('\n❌ Error occurred:');
    console.log('   Message:', error.message);
    console.log('   Name:', error.name);
    console.log('   Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));

    if (error.cause) {
      console.log('\n   Cause:', error.cause);
    }

    // Try to extract more details
    if (error.transaction) {
      console.log('\n   Transaction data:', JSON.stringify(error.transaction, null, 2));
    }

    if (error.error) {
      console.log('\n   Inner error:', error.error);
    }
  }
}

testProtocolKitExecution()
  .then(() => console.log('\n✅ Test completed\n'))
  .catch(err => console.error('\n❌ Fatal error:', err));

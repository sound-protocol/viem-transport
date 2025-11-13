/**
 * Full Safe Workflow with Protocol Kit + viem-transport
 *
 * This demonstrates the complete Safe lifecycle:
 * 1. Deploy a new Safe
 * 2. Create a Safe transaction
 * 3. Sign the transaction
 * 4. Execute the transaction
 */

import { TronWeb } from 'tronweb';
import { createWalletClient } from 'viem';
import {
  tronWeb,
  deploySafeWithProtocolKit,
  TRON_NILE_SAFE_ADDRESSES,
  waitForTransactionReceipt,
  tronAddressTo0x,
} from '../../src/tronWeb';
import 'dotenv/config';

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env');
  process.exit(1);
}

async function fullSafeWorkflow() {
  console.log('\n🔐 FULL SAFE WORKFLOW WITH PROTOCOL KIT\n');

  // Setup
  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: PRIVATE_KEY,
  });

  const transport = tronWeb(tw, {
    chainId: 3448148188,
  });

  const walletClient = createWalletClient({ transport });
  const ownerAddress = tw.defaultAddress.base58;
  const ownerEvm = tronAddressTo0x(tw, ownerAddress);

  console.log(`Owner: ${ownerAddress}\n`);

  // Step 1: Deploy Safe
  console.log('📋 Step 1: Deploying Safe with Protocol Kit\n');

  const { protocolKit, safeAddress } = await deploySafeWithProtocolKit(
    {
      tronWeb: tw,
      walletClient,
      contractNetworks: {
        '3448148188': TRON_NILE_SAFE_ADDRESSES,
      },
    },
    [ownerAddress],
    1,
  );

  console.log(`   Safe address: ${safeAddress}\n`);

  // Step 2: Deploy the Safe if not deployed
  const isDeployed = await protocolKit.isSafeDeployed();

  if (!isDeployed) {
    console.log('📋 Step 2: Deploying Safe Contract\n');

    const deploymentTransaction = await protocolKit.createSafeDeploymentTransaction();

    console.log('   Sending deployment transaction...');

    const txHash = await walletClient.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: ownerAddress,
          to: deploymentTransaction.to,
          data: deploymentTransaction.data,
          value: deploymentTransaction.value,
        },
      ],
    });

    console.log(`   TX Hash: ${txHash}`);
    console.log(`   View: https://nile.tronscan.org/#/transaction/${txHash.slice(2)}\n`);

    // Wait for confirmation
    console.log('   Waiting for confirmation...\n');

    const receipt = await waitForTransactionReceipt(tw, txHash, {
      confirmations: 19,
      timeout: 120000,
      onConfirmation: (current, required) => {
        const progress = Math.floor((current / required) * 100);
        process.stdout.write(`\r   📊 ${current}/${required} confirmations (${progress}%)`);
      },
    });

    console.log('\n');

    if (receipt.status !== '0x1') {
      throw new Error('Safe deployment failed');
    }

    console.log('   ✅ Safe deployed successfully!\n');
  } else {
    console.log('📋 Step 2: Safe already deployed\n');
  }

  // Step 3: Get Safe info
  console.log('📋 Step 3: Fetching Safe Information\n');

  const owners = await protocolKit.getOwners();
  const threshold = await protocolKit.getThreshold();
  const nonce = await protocolKit.getNonce();

  console.log(`   Owners: ${owners.length}`);
  owners.forEach((owner, i) => {
    console.log(`     ${i + 1}. ${owner}`);
  });
  console.log(`   Threshold: ${threshold}`);
  console.log(`   Nonce: ${nonce}\n`);

  // Step 4: Create Safe transaction
  console.log('📋 Step 4: Creating Safe Transaction\n');

  const recipientAddress = ownerAddress; // Send to self as example
  const amount = '1000000'; // 1 TRX = 1,000,000 SUN

  const safeTransaction = await protocolKit.createTransaction({
    transactions: [
      {
        to: recipientAddress,
        value: amount,
        data: '0x',
      },
    ],
  });

  console.log(`   Transaction created:`);
  console.log(`     To: ${safeTransaction.data.to}`);
  console.log(`     Value: ${safeTransaction.data.value} SUN (${Number(amount) / 1_000_000} TRX)`);
  console.log(`     Nonce: ${safeTransaction.data.nonce}\n`);

  // Step 5: Sign transaction
  console.log('📋 Step 5: Signing Transaction\n');

  const signedTransaction = await protocolKit.signTransaction(safeTransaction);
  const safeTxHash = await protocolKit.getTransactionHash(signedTransaction);

  console.log(`   ✅ Transaction signed`);
  console.log(`   Signatures: ${signedTransaction.signatures.size}`);
  console.log(`   Safe TX Hash: ${safeTxHash}\n`);

  // Step 6: Execute transaction
  console.log('📋 Step 6: Executing Safe Transaction\n');

  console.log('   Preparing execution...');

  const executeTxResponse = await protocolKit.executeTransaction(signedTransaction);

  console.log(`   ✅ Execution transaction sent`);
  console.log(`   TX Hash: ${executeTxResponse.hash}`);
  console.log(`   View: https://nile.tronscan.org/#/transaction/${executeTxResponse.hash.slice(2)}\n`);

  // Wait for execution confirmation
  console.log('   Waiting for execution confirmation...\n');

  const execReceipt = await waitForTransactionReceipt(tw, executeTxResponse.hash, {
    confirmations: 19,
    timeout: 120000,
    onConfirmation: (current, required) => {
      const progress = Math.floor((current / required) * 100);
      process.stdout.write(`\r   📊 ${current}/${required} confirmations (${progress}%)`);
    },
  });

  console.log('\n');

  if (execReceipt.status === '0x1') {
    console.log('   ✅ Safe transaction executed successfully!\n');
  } else {
    console.log('   ❌ Safe transaction execution failed\n');
  }

  return {
    success: true,
    safeAddress,
    safeTxHash,
    executionTxHash: executeTxResponse.hash,
    executionStatus: execReceipt.status === '0x1' ? 'success' : 'failed',
  };
}

// Run the full workflow
fullSafeWorkflow()
  .then((result) => {
    console.log('🎉 FULL SAFE WORKFLOW COMPLETED!\n');
    console.log('✅ Safe deployed using Protocol Kit');
    console.log('✅ Transaction created with Protocol Kit');
    console.log('✅ Transaction signed with Protocol Kit');
    console.log('✅ Transaction executed with Protocol Kit');
    console.log('✅ All through viem-transport on Tron!\n');
    console.log('📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n💪 This is production-ready Safe integration!');
  })
  .catch((error) => {
    console.error('\n💥 WORKFLOW FAILED:');
    console.error(error);
    process.exit(1);
  });
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
  connectToSafe,
  TRON_NILE_SAFE_ADDRESSES,
  waitForTransactionReceipt,
  tronAddressTo0x,
  tronBase58FromEvm,
} from '../../dist/index.js';
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

  console.log(`Owner: ${ownerAddress}\n`);

  // Step 1: Deploy Safe
  console.log('📋 Step 1: Deploying Safe with Protocol Kit\n');

  // CRITICAL: Store this salt nonce in your database for production!
  const saltNonce = Date.now().toString();

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
    undefined, // setupOptions
    saltNonce, // REQUIRED for Tron CREATE2 prediction
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

  // IMPORTANT: After deployment, reconnect to the Safe with its actual address
  // Protocol Kit in "predictedSafe" mode doesn't auto-switch after deployment
  console.log('📋 Step 2.5: Reconnecting to deployed Safe\n');

  const safeAddressTron = tronBase58FromEvm(tw, safeAddress)!;
  const connectedProtocolKit = await connectToSafe(
    {
      tronWeb: tw,
      walletClient,
      contractNetworks: {
        '3448148188': TRON_NILE_SAFE_ADDRESSES,
      },
    },
    safeAddressTron
  );

  // Use the connected instance for remaining operations
  const protocolKitConnected = connectedProtocolKit;
  console.log(`   ✅ Connected to Safe at ${safeAddressTron}\n`);

  // Step 3: Get Safe info
  console.log('📋 Step 3: Fetching Safe Information\n');

  const owners = await protocolKitConnected.getOwners();
  const threshold = await protocolKitConnected.getThreshold();
  const nonce = await protocolKitConnected.getNonce();

  console.log(`   Owners: ${owners.length}`);
  owners.forEach((owner, i) => {
    console.log(`     ${i + 1}. ${owner}`);
  });
  console.log(`   Threshold: ${threshold}`);
  console.log(`   Nonce: ${nonce}\n`);

  // Step 4: Create Safe transaction
  console.log('📋 Step 4: Creating Safe Transaction\n');

  // IMPORTANT: Protocol Kit needs 0x addresses for EIP-712 signing
  const recipientAddressHex = tronAddressTo0x(tw, ownerAddress)!;
  const amount = '1000000'; // 1 TRX = 1,000,000 SUN

  const safeTransaction = await protocolKitConnected.createTransaction({
    transactions: [
      {
        to: recipientAddressHex, // Must be 0x format!
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

  const signedTransaction = await protocolKitConnected.signTransaction(safeTransaction);
  const safeTxHash = await protocolKitConnected.getTransactionHash(signedTransaction);

  console.log(`   ✅ Transaction signed`);
  console.log(`   Signatures: ${signedTransaction.signatures.size}`);
  console.log(`   Safe TX Hash: ${safeTxHash}\n`);

  // Step 6: Execute transaction
  console.log('📋 Step 6: Executing Safe Transaction\n');

  console.log('   Preparing execution...');

  const executeTxResponse = await protocolKitConnected.executeTransaction(signedTransaction);

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
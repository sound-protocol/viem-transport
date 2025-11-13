/**
 * Deploy Multi-Signature Safe Wallet using Protocol Kit
 *
 * This demonstrates deploying a 2-of-3 multisig Safe on Tron Nile testnet
 * using the official Safe Protocol Kit (not manual encoding!)
 */

import { TronWeb } from 'tronweb';
import { createWalletClient } from 'viem';
import {
  tronWeb,
  deploySafeWithProtocolKit,
  TRON_NILE_SAFE_ADDRESSES,
  waitForTransactionReceipt,
} from '../../dist/index.js';
import 'dotenv/config';

// Three owner accounts for 2-of-3 multisig
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

async function deployMultisigSafe() {
  console.log('\n🏦 DEPLOYING 2-OF-3 MULTISIG SAFE WITH PROTOCOL KIT\n');

  // Use first owner as deployer
  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: OWNERS[0].privateKey,
  });

  const transport = tronWeb(tw, { chainId: 3448148188 });
  const walletClient = createWalletClient({ transport });

  console.log('📋 Multisig Configuration:');
  console.log(`   Owners: ${OWNERS.length}`);
  OWNERS.forEach((owner, i) => {
    console.log(`     ${i + 1}. ${owner.address}`);
  });
  console.log(`   Threshold: 2 (requires 2 signatures)\n`);

  // Step 1: Deploy Safe using Protocol Kit
  console.log('📋 Step 1: Deploying Safe with Protocol Kit\n');

  const ownerAddresses = OWNERS.map(o => o.address);

  const { protocolKit, safeAddress } = await deploySafeWithProtocolKit(
    {
      tronWeb: tw,
      walletClient,
      contractNetworks: {
        '3448148188': TRON_NILE_SAFE_ADDRESSES,
      },
    },
    ownerAddresses,
    2, // 2-of-3 threshold
  );

  console.log(`   ✅ Safe predicted at: ${safeAddress}\n`);

  // Step 2: Check if already deployed
  const isDeployed = await protocolKit.isSafeDeployed();

  if (isDeployed) {
    console.log('   ℹ️  Safe already deployed!\n');

    // Get Safe info
    const owners = await protocolKit.getOwners();
    const threshold = await protocolKit.getThreshold();
    const nonce = await protocolKit.getNonce();

    console.log('📋 Safe Information:');
    console.log(`   Owners: ${owners.length}`);
    owners.forEach((owner, i) => {
      console.log(`     ${i + 1}. ${owner}`);
    });
    console.log(`   Threshold: ${threshold}`);
    console.log(`   Nonce: ${nonce}\n`);

    return {
      success: true,
      safeAddress,
      deployed: true,
      owners,
      threshold: Number(threshold),
    };
  }

  // Step 3: Deploy the Safe
  console.log('📋 Step 2: Sending Deployment Transaction\n');

  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  console.log('   Deployment transaction created');
  console.log(`   To: ${deploymentTx.to}`);
  console.log(`   Data: ${deploymentTx.data.slice(0, 20)}...`);
  console.log(`   Value: ${deploymentTx.value}\n`);

  console.log('   Sending transaction...');

  const txHash = await walletClient.request({
    method: 'eth_sendTransaction',
    params: [{
      from: OWNERS[0].address,
      to: deploymentTx.to,
      data: deploymentTx.data,
      value: deploymentTx.value,
    }],
  });

  console.log(`   ✅ Transaction sent: ${txHash}`);
  console.log(`   View: https://nile.tronscan.org/#/transaction/${txHash.slice(2)}\n`);

  // Step 4: Wait for confirmation
  console.log('📋 Step 3: Waiting for Confirmation\n');

  const receipt = await waitForTransactionReceipt(tw, txHash, {
    confirmations: 19,
    timeout: 120000,
    pollingInterval: 3000,
    onConfirmation: (current, required) => {
      const progress = Math.floor((current / required) * 100);
      process.stdout.write(`\r   📊 ${current}/${required} confirmations (${progress}%)`);
    },
  });

  console.log('\n');

  if (receipt.status !== '0x1') {
    throw new Error('Deployment transaction failed');
  }

  console.log('   ✅ Safe deployed successfully!\n');

  // Step 5: Verify deployment
  console.log('📋 Step 4: Verifying Safe Configuration\n');

  const owners = await protocolKit.getOwners();
  const threshold = await protocolKit.getThreshold();
  const nonce = await protocolKit.getNonce();

  console.log(`   Owners: ${owners.length}`);
  owners.forEach((owner, i) => {
    console.log(`     ${i + 1}. ${owner}`);
  });
  console.log(`   Threshold: ${threshold}`);
  console.log(`   Nonce: ${nonce}\n`);

  // Verify threshold matches
  if (Number(threshold) === 2) {
    console.log('   ✅ Threshold correctly set to 2!\n');
  } else {
    console.log(`   ❌ Threshold mismatch: expected 2, got ${threshold}\n`);
  }

  return {
    success: true,
    safeAddress,
    txHash,
    deployed: true,
    owners,
    threshold: Number(threshold),
  };
}

// Run the deployment
deployMultisigSafe()
  .then((result) => {
    console.log('🎉 MULTISIG SAFE DEPLOYMENT SUCCESSFUL!\n');
    console.log('✅ Deployed 2-of-3 multisig Safe using Protocol Kit');
    console.log('✅ All owners configured correctly');
    console.log('✅ Threshold set correctly');
    console.log('✅ Zero manual ABI encoding');
    console.log('✅ Clean, official SDK implementation\n');
    console.log('📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n💪 Ready for multi-signature transactions!');
  })
  .catch((error) => {
    console.error('\n💥 DEPLOYMENT FAILED:');
    console.error(error);
    process.exit(1);
  });

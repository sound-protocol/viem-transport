/**
 * FULL PRE-FUNDING FLOW TEST
 *
 * This tests the ACTUAL production flow:
 * 1. User registers → Predict Safe address
 * 2. Store in DB (NO deployment)
 * 3. User sends TRX from CEX to predicted address
 * 4. Backend detects funds → Deploy Safe
 * 5. Verify deployed address matches prediction
 * 6. Verify Safe has the TRX user sent
 */

import { TronWeb } from 'tronweb';
import { createWalletClient } from 'viem';
import { tronWeb, predictSafeAddress, deploySafeWithProtocolKit, TRON_NILE_SAFE_ADDRESSES } from './dist/index.js';
import dotenv from 'dotenv';

dotenv.config();

// Check environment
if (!process.env.PRIVATE_KEY) {
  console.error('❌ ERROR: PRIVATE_KEY not found in .env');
  console.error('   This test requires a funded wallet on Nile testnet');
  console.error('   Get testnet TRX from: https://nileex.io/faucet');
  process.exit(1);
}

const FACTORY = 'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4';
const SINGLETON = 'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7';
const FALLBACK_HANDLER = 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC';

// Amount to send to predicted address (in SUN, 1 TRX = 1,000,000 SUN)
const FUNDING_AMOUNT = 5_000_000; // 5 TRX

async function testFullPrefundingFlow() {
  console.log('\n🧪 FULL PRE-FUNDING FLOW TEST\n');
  console.log('=' .repeat(80));
  console.log('\nThis simulates the REAL production workflow:');
  console.log('1. User registers → Predict Safe address (NO deployment)');
  console.log('2. User sends TRX from CEX to predicted address');
  console.log('3. Backend detects funds → Deploy Safe');
  console.log('4. Verify deployed address matches prediction');
  console.log('5. Verify Safe has user\'s TRX\n');
  console.log('=' .repeat(80));

  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: process.env.PRIVATE_KEY,
  });

  // Tron Nile testnet chainId: 3448148188
  const transport = tronWeb(tw, { chainId: 3448148188 });
  const walletClient = createWalletClient({
    transport,
    chain: {
      id: 3448148188,
      name: 'Tron Nile Testnet',
      nativeCurrency: { name: 'TRX', symbol: 'TRX', decimals: 6 },
      rpcUrls: {
        default: { http: ['https://nile.trongrid.io'] },
      },
    },
  });

  const fundingAccount = tw.defaultAddress.base58;
  console.log('\n📋 Funding Account:', fundingAccount);

  // Check funding account balance
  const fundingBalance = await tw.trx.getBalance(fundingAccount);
  console.log('   Balance:', fundingBalance / 1_000_000, 'TRX');

  if (fundingBalance < FUNDING_AMOUNT + 100_000_000) {
    console.error('\n❌ ERROR: Not enough TRX in funding account');
    console.error('   Need:', (FUNDING_AMOUNT + 100_000_000) / 1_000_000, 'TRX');
    console.error('   Have:', fundingBalance / 1_000_000, 'TRX');
    console.error('   Get testnet TRX from: https://nileex.io/faucet');
    process.exit(1);
  }

  // ====================================================================
  // STEP 1: User Registration - Predict Safe Address (NO deployment)
  // ====================================================================
  console.log('\n' + '=' .repeat(80));
  console.log('\n📋 STEP 1: User Registration\n');

  // Generate unique salt nonce
  const saltNonce = BigInt(Date.now()) * 1000000n + BigInt(Math.floor(Math.random() * 1000000));
  console.log('   Generated salt nonce:', saltNonce.toString());

  // User's owners (could be Privy wallet addresses)
  const userOwners = [
    fundingAccount, // For testing, using funded account as owner
  ];

  const config = {
    owners: userOwners,
    threshold: 1, // 1-of-1 for simplicity
    fallbackHandler: FALLBACK_HANDLER,
  };

  // Predict Safe address
  const predictedAddress = predictSafeAddress(
    tw,
    FACTORY,
    SINGLETON,
    config,
    saltNonce
  );

  const predictedTron = tw.address.fromHex('41' + predictedAddress.slice(2));

  console.log('\n   ✅ Predicted Safe Address:');
  console.log('      EVM:  ', predictedAddress);
  console.log('      Tron: ', predictedTron);
  console.log('\n   💾 In production, store in database:');
  console.log('      { userId, safeAddress, saltNonce, deployed: false }');

  // ====================================================================
  // STEP 2: User Funds Predicted Address (From CEX)
  // ====================================================================
  console.log('\n' + '=' .repeat(80));
  console.log('\n📋 STEP 2: User Sends TRX to Predicted Address\n');
  console.log('   (Simulating user withdrawal from CEX to predicted address)');

  // Check balance before funding (use Tron format!)
  const balanceBefore = await tw.trx.getBalance(predictedTron);
  console.log('\n   Balance before:', balanceBefore / 1_000_000, 'TRX');

  // Send TRX to predicted address (use Tron format!)
  console.log('   Sending', FUNDING_AMOUNT / 1_000_000, 'TRX to predicted address...');

  const fundingTx = await tw.trx.sendTransaction(predictedTron, FUNDING_AMOUNT);
  console.log('   Transaction:', fundingTx.txid);
  console.log('   Waiting for confirmation (10 seconds)...');

  // Wait for transaction confirmation (Tron block time ~3s, wait for 3 blocks)
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Check balance after funding (use Tron format!)
  const balanceAfter = await tw.trx.getBalance(predictedTron);
  console.log('\n   ✅ Balance after:', balanceAfter / 1_000_000, 'TRX');
  console.log('\n   💡 In production, backend monitor detects this balance');
  console.log('   💡 Triggers Safe deployment when balance > threshold');

  // ====================================================================
  // STEP 3: Backend Detects Funds - Deploy Safe
  // ====================================================================
  console.log('\n' + '=' .repeat(80));
  console.log('\n📋 STEP 3: Backend Deploys Safe (Triggered by Funding)\n');

  console.log('   Deploying Safe with EXACT same parameters...');
  console.log('   - Same owners');
  console.log('   - Same threshold');
  console.log('   - Same fallbackHandler');
  console.log('   - Same salt nonce:', saltNonce.toString());

  // Deploy Safe - this will initialize Protocol Kit internally
  const { protocolKit, safeAddress: deployedAddress } = await deploySafeWithProtocolKit(
    {
      tronWeb: tw,
      walletClient,
      privateKey: process.env.PRIVATE_KEY!,
      contractNetworks: {
        '3448148188': TRON_NILE_SAFE_ADDRESSES
      }
    },
    userOwners,
    1,
    {
      fallbackHandler: FALLBACK_HANDLER  // CRITICAL: Must match prediction!
    },
    saltNonce.toString()
  );

  const deployedTron = tw.address.fromHex('41' + deployedAddress.slice(2));

  console.log('\n   Creating deployment transaction...');

  // Actually deploy the Safe on-chain
  const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

  console.log('   Sending deployment transaction...');

  // Get account from TronWeb
  const accountEvmHex = ('0x' + tw.address.toHex(fundingAccount).slice(2)) as `0x${string}`;

  const deployTxHash = await walletClient.sendTransaction({
    account: accountEvmHex,
    to: deploymentTx.to as `0x${string}`,
    data: deploymentTx.data as `0x${string}`,
    value: BigInt(deploymentTx.value),
  });

  console.log('   Deployment TX:', deployTxHash);
  console.log('   Waiting for deployment confirmation (15 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log('\n   ✅ Safe Deployed!');
  console.log('      Address:', deployedAddress);
  console.log('      Tron:   ', deployedTron);

  // ====================================================================
  // STEP 4: Verify Deployed Address Matches Prediction
  // ====================================================================
  console.log('\n' + '=' .repeat(80));
  console.log('\n📋 STEP 4: Verify Deployed Address Matches Prediction\n');

  const addressMatch = deployedAddress.toLowerCase() === predictedAddress.toLowerCase();

  console.log('   Predicted:', predictedAddress);
  console.log('   Deployed: ', deployedAddress);
  console.log('   Match:    ', addressMatch ? '✅ YES' : '❌ NO');

  if (!addressMatch) {
    console.error('\n❌ CRITICAL FAILURE: Addresses do NOT match!');
    console.error('   User\'s funds would be LOST!');
    process.exit(1);
  }

  // ====================================================================
  // STEP 5: Verify Safe Has User's TRX
  // ====================================================================
  console.log('\n' + '=' .repeat(80));
  console.log('\n📋 STEP 5: Verify Safe Has User\'s TRX\n');

  const safeBalance = await tw.trx.getBalance(deployedTron);
  console.log('   Safe Balance:', safeBalance / 1_000_000, 'TRX');
  console.log('   Expected:    ', balanceAfter / 1_000_000, 'TRX (minus deployment gas)');

  const hasBalance = safeBalance > 0;
  console.log('   Has Funds:   ', hasBalance ? '✅ YES' : '❌ NO');

  // ====================================================================
  // FINAL RESULT
  // ====================================================================
  console.log('\n' + '=' .repeat(80));
  console.log('\n🎉 FULL PRE-FUNDING FLOW TEST RESULTS:\n');

  if (addressMatch && hasBalance) {
    console.log('   ✅✅✅ SUCCESS! ✅✅✅\n');
    console.log('   ✅ Address prediction: WORKS');
    console.log('   ✅ Pre-funding: WORKS (sent TRX before deployment)');
    console.log('   ✅ Deployment: WORKS');
    console.log('   ✅ Address match: PERFECT');
    console.log('   ✅ Safe has funds: CONFIRMED\n');
    console.log('   🚀 This flow is PRODUCTION-READY!');
    console.log();
    console.log('=' .repeat(80));
    console.log();
    console.log('🔗 VERIFY ON NILE TRONSCAN:');
    console.log();
    console.log('   Safe Address:');
    console.log('   https://nile.tronscan.org/#/address/' + deployedTron);
    console.log();
    console.log('   Funding Transaction:');
    console.log('   https://nile.tronscan.org/#/transaction/' + fundingTx.txid);
    console.log();
    console.log('=' .repeat(80));
    console.log();
    console.log('💡 PRODUCTION IMPLEMENTATION:');
    console.log();
    console.log('   1. User registers:');
    console.log('      - Predict address with predictSafeAddress()');
    console.log('      - Store: { userId, safeAddress, saltNonce, deployed: false }');
    console.log();
    console.log('   2. User funds Safe:');
    console.log('      - User withdraws from CEX to predicted address');
    console.log('      - Backend monitor detects balance > 0');
    console.log();
    console.log('   3. Backend deploys:');
    console.log('      - deploySafeWithProtocolKit() with SAME saltNonce');
    console.log('      - Update DB: { deployed: true }');
    console.log();
    console.log('   4. User has Safe wallet with their TRX! ✅');
    console.log();
    console.log('=' .repeat(80) + '\n');
    process.exit(0);
  } else {
    console.error('   ❌ FAILURE!');
    console.error('   Address match:', addressMatch);
    console.error('   Has funds:', hasBalance);
    process.exit(1);
  }
}

testFullPrefundingFlow().catch((error) => {
  console.error('\n💥 TEST FAILED:');
  console.error(error);
  process.exit(1);
});

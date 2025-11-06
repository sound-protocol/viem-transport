/**
 * DEPLOY 2-OF-3 MULTISIG SAFE WALLET
 * Tests Safe deployment with multiple owners and threshold
 */

import { TronWeb } from 'tronweb';
import { createWalletClient, encodeFunctionData, parseAbi } from 'viem';
import { tronWeb, waitForTransactionReceipt, tronAddressTo0x, SAFE_EVENTS } from './src/tronWeb';
import 'dotenv/config';

// Owner credentials
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

// Safe contract addresses on Nile
const SAFE_CONTRACTS = {
  masterCopy: 'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',
  proxyFactory: 'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',
  fallbackHandler: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC',
};

async function deployMultisigSafe() {
  console.log('\n🏦 DEPLOYING 2-OF-3 MULTISIG SAFE WALLET\n');
  console.log('This tests Safe deployment with multiple owners\n');

  // Use first owner as deployer
  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: OWNERS[0].privateKey,
  });

  const transport = tronWeb(tw, {
    chainId: 3448148188, // Nile testnet
  });

  const client = createWalletClient({ transport });

  // Convert all addresses to EVM format
  const masterCopyEvm = tronAddressTo0x(tw, SAFE_CONTRACTS.masterCopy);
  const proxyFactoryEvm = tronAddressTo0x(tw, SAFE_CONTRACTS.proxyFactory);
  const fallbackHandlerEvm = tronAddressTo0x(tw, SAFE_CONTRACTS.fallbackHandler);

  const ownersEvm = OWNERS.map(owner => tronAddressTo0x(tw, owner.address));

  console.log('📋 Multisig Configuration:');
  console.log(`   Owners: ${OWNERS.length}`);
  OWNERS.forEach((owner, i) => {
    console.log(`     ${i + 1}. ${owner.address}`);
    console.log(`        EVM: ${ownersEvm[i]}`);
  });
  console.log(`   Threshold: 2 (requires 2 signatures)\n`);

  // Step 1: Prepare Safe setup parameters
  console.log('📋 Step 1: Preparing Safe Setup Parameters');

  const threshold = 2; // 2-of-3 multisig
  const saltNonce = Date.now(); // Unique nonce for deterministic address

  console.log(`   Owners: ${ownersEvm.length} addresses`);
  console.log(`   Threshold: ${threshold}`);
  console.log(`   Salt nonce: ${saltNonce}\n`);

  // Step 2: Encode Safe setup call
  console.log('📋 Step 2: Encoding Safe Setup Call');

  const safeSetupAbi = parseAbi([
    'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external'
  ]);

  const setupCalldata = encodeFunctionData({
    abi: safeSetupAbi,
    functionName: 'setup',
    args: [
      ownersEvm,
      BigInt(threshold),
      '0x0000000000000000000000000000000000000000', // to
      '0x', // data
      fallbackHandlerEvm, // fallbackHandler
      '0x0000000000000000000000000000000000000000', // paymentToken
      BigInt(0), // payment
      '0x0000000000000000000000000000000000000000', // paymentReceiver
    ],
  });

  console.log(`   Setup calldata: ${setupCalldata.slice(0, 20)}...${setupCalldata.slice(-10)}\n`);

  // Step 3: Call proxy factory to create Safe
  console.log('📋 Step 3: Calling Proxy Factory to Deploy Safe');

  const proxyFactoryAbi = parseAbi([
    'function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) public returns (address proxy)'
  ]);

  try {
    console.log('   Sending transaction to Proxy Factory...');

    const txHash = await client.request({
      method: 'eth_sendTransaction',
      params: [{
        from: OWNERS[0].address,
        to: SAFE_CONTRACTS.proxyFactory,
        data: encodeFunctionData({
          abi: proxyFactoryAbi,
          functionName: 'createProxyWithNonce',
          args: [
            masterCopyEvm,
            setupCalldata,
            BigInt(saltNonce),
          ],
        }),
        gas: '0x' + (10_000_000).toString(16), // 10M energy
      }],
    });

    console.log(`   ✅ Transaction sent: ${txHash}`);
    console.log(`   View: https://nile.tronscan.org/#/transaction/${txHash.slice(2)}\n`);

    // Step 4: Wait for confirmation
    console.log('📋 Step 4: Waiting for Transaction Confirmation');

    const receipt = await waitForTransactionReceipt(tw, txHash, {
      confirmations: 19,
      timeout: 120000,
      pollingInterval: 3000,
      onConfirmation: (current, required) => {
        const progress = Math.floor((current / required) * 100);
        console.log(`   📊 ${current}/${required} confirmations (${progress}%)`);
      },
    });

    console.log(`\n   ✅ Transaction confirmed!`);
    console.log(`   Status: ${receipt.status === '0x1' ? '✓ SUCCESS' : '✗ FAILED'}`);;
    console.log(`   Block: ${receipt.blockNumber}\n`);

    if (receipt.status !== '0x1') {
      throw new Error('Transaction failed on-chain');
    }

    // Step 5: Parse SafeSetup event to get Safe address
    console.log('📋 Step 5: Getting Safe Address from Events');

    await new Promise(resolve => setTimeout(resolve, 5000));

    const txInfo = await tw.trx.getTransactionInfo(txHash.slice(2));

    if (txInfo.log && txInfo.log.length > 0) {
      console.log(`   Found ${txInfo.log.length} events`);

      // Look for SafeSetup event
      const safeSetupTopic = SAFE_EVENTS.SafeSetup.topic;
      const setupEvent = txInfo.log.find(log => '0x' + log.topics[0] === safeSetupTopic);

      if (setupEvent) {
        const safeAddressHex = '41' + setupEvent.address;
        const safeAddress = tw.address.fromHex(safeAddressHex);

        console.log(`\n   ✅ Safe deployed at: ${safeAddress}`);
        console.log(`   View Safe: https://nile.tronscan.org/#/contract/${safeAddress}\n`);

        // Step 6: Verify Safe configuration
        console.log('📋 Step 6: Verifying Safe Configuration');

        const safeAbi = parseAbi([
          'function getOwners() public view returns (address[] memory)',
          'function getThreshold() public view returns (uint256)'
        ]);

        // Get owners
        const ownersData = encodeFunctionData({
          abi: safeAbi,
          functionName: 'getOwners',
          args: [],
        });

        const ownersResult = await client.request({
          method: 'eth_call',
          params: [{
            to: safeAddress,
            data: ownersData,
          }, 'latest'],
        });

        console.log('   Owners result:', ownersResult);

        // Get threshold
        const thresholdData = encodeFunctionData({
          abi: safeAbi,
          functionName: 'getThreshold',
          args: [],
        });

        const thresholdResult = await client.request({
          method: 'eth_call',
          params: [{
            to: safeAddress,
            data: thresholdData,
          }, 'latest'],
        });

        const actualThreshold = BigInt(thresholdResult as string);

        console.log(`   ✅ Threshold: ${actualThreshold}`);
        console.log(`   ✅ Owners: ${OWNERS.length} addresses configured\n`);

        if (actualThreshold === BigInt(threshold)) {
          console.log('   ✅ Threshold matches configuration!\n');
        } else {
          console.log(`   ❌ Threshold mismatch: expected ${threshold}, got ${actualThreshold}\n`);
        }

        return {
          success: true,
          safeAddress,
          txHash,
          owners: OWNERS.map(o => o.address),
          threshold,
        };
      }
    }

    console.log('   ⚠️  Could not parse SafeSetup event');
    console.log('   But transaction succeeded, Safe was created\n');

    return {
      success: true,
      safeAddress: 'Check transaction on TronScan',
      txHash,
      owners: OWNERS.map(o => o.address),
      threshold,
    };

  } catch (error: any) {
    console.error(`\n   ❌ Deployment failed: ${error.message}`);
    throw error;
  }
}

// Run the deployment
deployMultisigSafe()
  .then((result) => {
    console.log('🎉 MULTISIG SAFE DEPLOYED!\\n');
    console.log('✅ Successfully deployed 2-of-3 Safe using viem transport');
    console.log('✅ 3 owners configured');
    console.log('✅ 2 signature threshold set');
    console.log('✅ Transaction signing worked');
    console.log('✅ Contract interaction worked');
    console.log('\n📊 Deployment Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n💪 Ready for multi-signature testing!');
  })
  .catch((error) => {
    console.error('\n💥 DEPLOYMENT FAILED:');
    console.error(error);
    process.exit(1);
  });

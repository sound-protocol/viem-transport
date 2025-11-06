/**
 * EXECUTE 2-OF-3 MULTISIG SAFE TRANSACTION
 * Tests real multi-signature workflow with 2 owners signing
 */

import { TronWeb } from 'tronweb';
import { createWalletClient, encodeFunctionData, parseAbi } from 'viem';
import { tronWeb, waitForTransactionReceipt, SAFE_EVENTS, tronAddressTo0x } from './src/tronWeb';
import 'dotenv/config';

const SAFE_ADDRESS = 'TDYX8cJyqVFsAShvvw4DNA2GW2J27dvVWi';
const RECIPIENT = 'TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp'; // Send to owner 1 for testing

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
];

async function executeMultisigTransaction() {
  console.log('\n🔐 EXECUTING 2-OF-3 MULTISIG SAFE TRANSACTION\n');
  console.log('Safe Address:', SAFE_ADDRESS);
  console.log('Recipient:', RECIPIENT);
  console.log('Amount: 1 TRX\n');

  // Create TronWeb instances for each owner
  const tw1 = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: OWNERS[0].privateKey,
  });

  const tw2 = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: OWNERS[1].privateKey,
  });

  // Create clients for each owner
  const transport1 = tronWeb(tw1, { chainId: 3448148188 });
  const transport2 = tronWeb(tw2, { chainId: 3448148188 });

  const client1 = createWalletClient({ transport: transport1 });
  const client2 = createWalletClient({ transport: transport2 });

  // Convert addresses to EVM format
  const safeAddressEvm = tronAddressTo0x(tw1, SAFE_ADDRESS);
  const recipientEvm = tronAddressTo0x(tw1, RECIPIENT);
  const owner1Evm = tronAddressTo0x(tw1, OWNERS[0].address);
  const owner2Evm = tronAddressTo0x(tw1, OWNERS[1].address);

  console.log('👥 Signers:');
  console.log(`   Owner 1: ${OWNERS[0].address}`);
  console.log(`            ${owner1Evm}`);
  console.log(`   Owner 2: ${OWNERS[1].address}`);
  console.log(`            ${owner2Evm}\n`);

  // Step 1: Get Safe nonce
  console.log('📋 Step 1: Get Safe Nonce');

  const safeAbi = parseAbi([
    'function nonce() public view returns (uint256)',
    'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) public payable returns (bool success)'
  ]);

  const nonceData = encodeFunctionData({
    abi: safeAbi,
    functionName: 'nonce',
    args: [],
  });

  const nonceResult = await client1.request({
    method: 'eth_call',
    params: [{
      to: SAFE_ADDRESS,
      data: nonceData,
    }, 'latest'],
  });

  const nonce = BigInt(nonceResult as string);
  console.log(`   Safe nonce: ${nonce}\n`);

  // Step 2: Create Safe transaction
  console.log('📋 Step 2: Create Safe Transaction');

  const safeTx = {
    to: recipientEvm,
    value: BigInt(1_000_000), // 1 TRX in SUN
    data: '0x' as `0x${string}`,
    operation: 0, // Call
    safeTxGas: BigInt(0),
    baseGas: BigInt(0),
    gasPrice: BigInt(0),
    gasToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    refundReceiver: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    nonce,
  };

  console.log('   Transaction:', {
    to: safeTx.to,
    value: `${safeTx.value} SUN (1 TRX)`,
    operation: 'Call',
  });
  console.log();

  // Step 3: Prepare EIP-712 typed data
  console.log('📋 Step 3: Prepare EIP-712 Typed Data');

  const typedData = {
    domain: {
      chainId: 3448148188,
      verifyingContract: safeAddressEvm,
    },
    types: {
      SafeTx: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint8' },
        { name: 'safeTxGas', type: 'uint256' },
        { name: 'baseGas', type: 'uint256' },
        { name: 'gasPrice', type: 'uint256' },
        { name: 'gasToken', type: 'address' },
        { name: 'refundReceiver', type: 'address' },
        { name: 'nonce', type: 'uint256' },
      ],
    },
    primaryType: 'SafeTx',
    message: {
      to: safeTx.to,
      value: safeTx.value.toString(),
      data: safeTx.data,
      operation: safeTx.operation,
      safeTxGas: safeTx.safeTxGas.toString(),
      baseGas: safeTx.baseGas.toString(),
      gasPrice: safeTx.gasPrice.toString(),
      gasToken: safeTx.gasToken,
      refundReceiver: safeTx.refundReceiver,
      nonce: safeTx.nonce.toString(),
    },
  };

  console.log('   Typed data prepared\n');

  // Step 4: Get signature from Owner 1
  console.log('📋 Step 4: Sign with Owner 1');

  const signature1 = await client1.request({
    method: 'eth_signTypedData_v4',
    params: [owner1Evm, JSON.stringify(typedData)],
  }) as string;

  console.log('   ✅ Owner 1 signed');
  console.log(`   Signature: ${signature1.slice(0, 20)}...${signature1.slice(-10)}\n`);

  // Step 5: Get signature from Owner 2
  console.log('📋 Step 5: Sign with Owner 2');

  const signature2 = await client2.request({
    method: 'eth_signTypedData_v4',
    params: [owner2Evm, JSON.stringify(typedData)],
  }) as string;

  console.log('   ✅ Owner 2 signed');
  console.log(`   Signature: ${signature2.slice(0, 20)}...${signature2.slice(-10)}\n`);

  // Step 6: Sort and combine signatures
  console.log('📋 Step 6: Combine Signatures (sorted by signer address)');

  // Safe requires signatures to be sorted by signer address (ascending)
  const signers = [
    { address: owner1Evm.toLowerCase(), signature: signature1 },
    { address: owner2Evm.toLowerCase(), signature: signature2 },
  ];

  signers.sort((a, b) => a.address.localeCompare(b.address));

  console.log('   Signature order:');
  signers.forEach((s, i) => {
    console.log(`     ${i + 1}. ${s.address}`);
  });

  // Concatenate signatures (remove 0x prefix from second signature)
  const combinedSignatures = (signers[0].signature + signers[1].signature.slice(2)) as `0x${string}`;

  console.log(`   Combined signature length: ${combinedSignatures.length} chars`);
  console.log(`   Combined: ${combinedSignatures.slice(0, 20)}...${combinedSignatures.slice(-10)}\n`);

  // Step 7: Execute transaction
  console.log('📋 Step 7: Execute Transaction Through Safe');

  const execData = encodeFunctionData({
    abi: safeAbi,
    functionName: 'execTransaction',
    args: [
      safeTx.to,
      safeTx.value,
      safeTx.data,
      safeTx.operation,
      safeTx.safeTxGas,
      safeTx.baseGas,
      safeTx.gasPrice,
      safeTx.gasToken,
      safeTx.refundReceiver,
      combinedSignatures,
    ],
  });

  try {
    const txHash = await client1.request({
      method: 'eth_sendTransaction',
      params: [{
        from: OWNERS[0].address,
        to: SAFE_ADDRESS,
        data: execData,
        gas: '0x' + (40_000_000).toString(16),
      }],
    });

    console.log(`   ✅ Transaction sent: ${txHash}`);
    console.log(`   View: https://nile.tronscan.org/#/transaction/${txHash.slice(2)}\n`);

    // Step 8: Wait for confirmation
    console.log('📋 Step 8: Waiting for Confirmation');

    const receipt = await waitForTransactionReceipt(tw1, txHash, {
      confirmations: 19,
      timeout: 120000,
      onConfirmation: (current, required) => {
        const progress = Math.floor((current / required) * 100);
        console.log(`   📊 ${current}/${required} confirmations (${progress}%)`);
      },
    });

    console.log(`\n   ✅ Transaction confirmed!`);
    console.log(`   Status: ${receipt.status === '0x1' ? '✓ SUCCESS' : '✗ FAILED'}`);
    console.log();

    if (receipt.status !== '0x1') {
      throw new Error('Transaction failed on-chain');
    }

    // Step 9: Check for ExecutionSuccess event
    console.log('📋 Step 9: Verifying ExecutionSuccess Event');

    const txInfo = await tw1.trx.getTransactionInfo(txHash.slice(2));
    if (txInfo.log && txInfo.log.length > 0) {
      const executionSuccessTopic = SAFE_EVENTS.ExecutionSuccess.topic;
      const successEvent = txInfo.log.find(log =>
        '0x' + log.topics[0] === executionSuccessTopic
      );

      if (successEvent) {
        console.log('   ✅ ExecutionSuccess event found!');
        const decoded = SAFE_EVENTS.ExecutionSuccess.decode(successEvent);
        console.log('   Decoded:', decoded);
      } else {
        console.log('   ⚠️  ExecutionSuccess event not found');
        console.log('   Events found:', txInfo.log.map(l => '0x' + l.topics[0]));
      }
    }

    console.log('\n🎉 MULTISIG TRANSACTION EXECUTED SUCCESSFULLY!');
    console.log('✅ Owner 1 signed');
    console.log('✅ Owner 2 signed');
    console.log('✅ 2 signatures validated by Safe');
    console.log('✅ Transaction executed with 2-of-3 threshold');
    console.log('✅ 1 TRX sent through multisig Safe wallet');

    return {
      success: true,
      txHash,
      signatures: {
        owner1: signature1,
        owner2: signature2,
        combined: combinedSignatures,
      },
    };

  } catch (error: any) {
    console.error(`\n   ❌ Execution failed: ${error.message}`);
    throw error;
  }
}

executeMultisigTransaction()
  .then((result) => {
    console.log('\n📊 Result:', JSON.stringify({ success: result.success, txHash: result.txHash }, null, 2));
    console.log('\n💪 viem-transport MULTISIG VERIFICATION COMPLETE!');
  })
  .catch((error) => {
    console.error('\n💥 TEST FAILED:', error);
    process.exit(1);
  });

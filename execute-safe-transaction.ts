/**
 * EXECUTE SAFE TRANSACTION TEST
 * Tests the complete Safe transaction flow using transport's eth_signTypedData_v4
 */

import { TronWeb } from 'tronweb';
import { createWalletClient, encodeFunctionData, parseAbi } from 'viem';
import { tronWeb, waitForTransactionReceipt, SAFE_EVENTS, tronAddressTo0x } from './src/tronWeb';
import 'dotenv/config';

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const SAFE_ADDRESS = 'TMTizpgYhi3k4UFaEK7i9QPuMnTewzQNPy';
const RECIPIENT = 'TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp'; // Send to self for testing

async function executeSafeTransaction() {
  console.log('\n🔐 EXECUTING SAFE TRANSACTION\n');
  console.log('Safe Address:', SAFE_ADDRESS);
  console.log('Recipient:', RECIPIENT, '\n');

  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: PRIVATE_KEY,
  });

  const transport = tronWeb(tw, {
    chainId: 3448148188, // Nile testnet
  });

  const client = createWalletClient({ transport });
  const safeAddressEvm = tronAddressTo0x(tw, SAFE_ADDRESS);
  const recipientEvm = tronAddressTo0x(tw, RECIPIENT);
  const ownerEvm = tronAddressTo0x(tw, tw.defaultAddress.base58);

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

  const nonceResult = await client.request({
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

  // Step 3: Sign with eth_signTypedData_v4
  console.log('📋 Step 3: Signing with eth_signTypedData_v4 (uses Safe getTransactionHash)');

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

  const signature = await client.request({
    method: 'eth_signTypedData_v4',
    params: [ownerEvm, JSON.stringify(typedData)],
  });

  console.log('   Signature:', signature);
  console.log('   Signature length:', (signature as string).length);
  console.log();

  // Step 4: Execute transaction through Safe
  console.log('📋 Step 4: Executing Transaction Through Safe');

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
      signature as `0x${string}`,
    ],
  });

  try {
    const txHash = await client.request({
      method: 'eth_sendTransaction',
      params: [{
        from: tw.defaultAddress.base58,
        to: SAFE_ADDRESS,
        data: execData,
        gas: '0x' + (40_000_000).toString(16),
      }],
    });

    console.log(`   ✅ Transaction sent: ${txHash}`);
    console.log(`   View: https://nile.tronscan.org/#/transaction/${txHash.slice(2)}\n`);

    // Step 5: Wait for confirmation
    console.log('📋 Step 5: Waiting for Confirmation');

    const receipt = await waitForTransactionReceipt(tw, txHash, {
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

    // Step 6: Check for ExecutionSuccess event
    console.log('📋 Step 6: Verifying ExecutionSuccess Event');

    const txInfo = await tw.trx.getTransactionInfo(txHash.slice(2));
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

    console.log('\n🎉 SAFE TRANSACTION EXECUTED SUCCESSFULLY!');
    console.log('✅ eth_signTypedData_v4 worked');
    console.log('✅ Safe execTransaction worked');
    console.log('✅ 1 TRX sent through Safe wallet');

    return {
      success: true,
      txHash,
      signature,
    };

  } catch (error: any) {
    console.error(`\n   ❌ Execution failed: ${error.message}`);
    throw error;
  }
}

executeSafeTransaction()
  .then((result) => {
    console.log('\n📊 Result:', JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error('\n💥 TEST FAILED:', error);
    process.exit(1);
  });

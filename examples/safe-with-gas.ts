/**
 * Example: Using Tron transport with Gnosis Safe
 * Demonstrates proper gas estimation and fee calculation
 */

import { createWalletClient, createPublicClient, custom } from 'viem';
import TronWeb from 'tronweb';
import { tronWeb } from '../tronWeb';

// Initialize TronWeb
const tronWebInstance = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { 'TRON-PRO-API-KEY': 'your-api-key' },
  privateKey: process.env.PRIVATE_KEY
});

// Create viem client with Tron transport
const publicClient = createPublicClient({
  transport: tronWeb(tronWebInstance, {
    chainId: 728126428, // Tron mainnet
    defaultFrom: 'TYourDefaultAddress...',
    sendOptions: {
      feeLimit: 15_000_000, // 15 TRX default fee limit
    }
  })
});

const walletClient = createWalletClient({
  transport: tronWeb(tronWebInstance, {
    chainId: 728126428,
    defaultFrom: 'TYourDefaultAddress...',
  })
});

/**
 * Example 1: Estimate gas for a simple TRX transfer
 */
async function estimateSimpleTransfer() {
  console.log('=== Simple Transfer Gas Estimation ===');

  const gasEstimate = await publicClient.estimateGas({
    from: '0xYourAddress',
    to: '0xRecipientAddress',
    value: BigInt(1000000) // 1 TRX in SUN
  });

  console.log('Estimated gas:', gasEstimate);

  // Get current gas price (energy price)
  const gasPrice = await publicClient.getGasPrice();
  console.log('Gas price (SUN per unit):', gasPrice);

  // Calculate actual cost
  const costInSun = gasEstimate * gasPrice;
  const costInTrx = Number(costInSun) / 1_000_000;
  console.log('Estimated cost:', costInTrx, 'TRX');

  // Note: Actual cost will be ~265-365 bandwidth
  // If user has free bandwidth: 0 TRX
  // If no free bandwidth: ~0.265-0.365 TRX
}

/**
 * Example 2: Estimate gas for contract interaction
 */
async function estimateContractCall() {
  console.log('\n=== Contract Call Gas Estimation ===');

  // Example: calling a ERC20 transfer
  const transferData = '0xa9059cbb' + // transfer(address,uint256) signature
    '000000000000000000000000' + 'recipientAddressHex'.padStart(40, '0') +
    '00000000000000000000000000000000000000000000000000000000000186a0'; // 100000

  const gasEstimate = await publicClient.estimateGas({
    from: '0xYourAddress',
    to: '0xTokenContractAddress',
    data: transferData
  });

  console.log('Estimated gas:', gasEstimate);

  const gasPrice = await publicClient.getGasPrice();
  const costInSun = gasEstimate * gasPrice;
  const costInTrx = Number(costInSun) / 1_000_000;

  console.log('Estimated energy usage:', Number(gasEstimate) - 30000); // Subtract base gas
  console.log('Estimated cost:', costInTrx, 'TRX');
}

/**
 * Example 3: Using with Gnosis Safe
 */
async function safeTransaction() {
  console.log('\n=== Gnosis Safe Transaction ===');

  // Safe will call eth_estimateGas before executing
  const safeTransactionData = {
    to: '0xTargetContract',
    value: '0x0',
    data: '0xYourCalldata',
    operation: 0, // Call
    safeTxGas: '0x0', // Will be estimated
    baseGas: '0x0',
    gasPrice: '0x0', // Will use eth_gasPrice
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 0
  };

  // Safe will internally call these methods:

  // 1. Get current gas price
  const gasPrice = await publicClient.getGasPrice();
  console.log('Current gas price:', gasPrice, 'SUN/unit');

  // 2. Estimate gas for the transaction
  const gasEstimate = await publicClient.estimateGas({
    from: '0xSafeAddress',
    to: safeTransactionData.to,
    data: safeTransactionData.data,
    value: BigInt(safeTransactionData.value)
  });
  console.log('Estimated gas for Safe tx:', gasEstimate);

  // 3. Calculate total cost
  const totalCostSun = gasEstimate * gasPrice;
  const totalCostTrx = Number(totalCostSun) / 1_000_000;
  console.log('Total estimated cost:', totalCostTrx, 'TRX');

  // Safe can now execute with proper gas limits
  console.log('\nSafe transaction prepared with:');
  console.log('- Gas limit:', gasEstimate);
  console.log('- Gas price:', gasPrice);
  console.log('- Max cost:', totalCostTrx, 'TRX');
}

/**
 * Example 4: Check fee history (EIP-1559 compatibility)
 */
async function checkFeeHistory() {
  console.log('\n=== Fee History (EIP-1559) ===');

  const feeHistory = await publicClient.getFeeHistory({
    blockCount: 5,
    rewardPercentiles: [25, 50, 75],
    blockTag: 'latest'
  });

  console.log('Fee History:');
  console.log('- Oldest block:', feeHistory.oldestBlock);
  console.log('- Base fees:', feeHistory.baseFeePerGas);
  console.log('- Gas used ratios:', feeHistory.gasUsedRatio);

  // Note: rewards will be 0 as Tron doesn't have priority fees
  if (feeHistory.reward) {
    console.log('- Priority fee percentiles:', feeHistory.reward);
  }

  // Get max priority fee (will be 0 for Tron)
  const maxPriorityFee = await publicClient.request({
    method: 'eth_maxPriorityFeePerGas',
    params: []
  });
  console.log('Max priority fee per gas:', maxPriorityFee, '(0 for Tron)');
}

/**
 * Example 5: Understanding resource consumption
 */
async function explainResourceMapping() {
  console.log('\n=== Tron Resource Mapping Explained ===');

  console.log('Bandwidth:');
  console.log('- Simple transfer: ~265 bandwidth');
  console.log('- With memo: ~265 + memo_bytes bandwidth');
  console.log('- New account creation: +100 bandwidth');
  console.log('- 1 TRX = 1000 bandwidth points');

  console.log('\nEnergy:');
  console.log('- Smart contract execution only');
  console.log('- Current price: ~420 SUN per energy unit');
  console.log('- Price fluctuates based on network conditions');

  console.log('\nGas Mapping Strategy:');
  console.log('- Simple transfer: 21,000 gas (Ethereum standard)');
  console.log('- Contract call: 30,000 base + energy_used');
  console.log('- Gas price: energy_price in SUN (e.g., 420)');
  console.log('- Cost calculation: gas * gasPrice / 1,000,000 TRX');

  console.log('\nFree Resources:');
  console.log('- Daily free bandwidth: 1500 points');
  console.log('- Staked resources: Get bandwidth/energy from staking');
  console.log('- If available, transactions cost 0 TRX');
  console.log('- If exhausted, TRX is burned for resources');
}

/**
 * Main execution
 */
async function main() {
  try {
    await estimateSimpleTransfer();
    await estimateContractCall();
    await safeTransaction();
    await checkFeeHistory();
    await explainResourceMapping();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run examples
if (require.main === module) {
  main();
}
/**
 * Tron Gas Mapping Utilities
 * Maps Tron's Energy/Bandwidth system to Ethereum's gas model for viem compatibility
 */

// Current network constants (2025)
const ENERGY_PRICE_SUN = 420; // Current energy price in SUN per unit
const BANDWIDTH_PRICE_SUN = 1000; // 1 TRX = 1000 bandwidth
const SUN_PER_TRX = 1_000_000;

// Ethereum gas mapping constants
const ETH_TRANSFER_GAS = 21000;
const BASE_CONTRACT_EXECUTION_GAS = 30000;
const GAS_PER_BYTE = 68; // Approximate gas per byte of calldata

// Resource estimation constants
const BANDWIDTH_PER_BYTE = 1;
const BASE_TRANSACTION_BANDWIDTH = 265; // Base bandwidth for any transaction
const CREATE_ACCOUNT_BANDWIDTH = 100; // Additional bandwidth for new account creation

export interface TronResourceEstimate {
  bandwidth: number;
  energy: number;
  totalFeeSun: number;
  estimatedGas: number;
  gasPrice: bigint; // in wei equivalent
}

export interface TronAccountResources {
  freeNetUsed: number;
  freeNetLimit: number;
  netUsed: number;
  netLimit: number;
  energyUsed: number;
  energyLimit: number;
}

/**
 * Calculate the effective gas price based on Tron's current energy price
 * This maps SUN to Wei for compatibility with Ethereum tools
 */
export function calculateGasPrice(energyPriceSun: number = ENERGY_PRICE_SUN): bigint {
  // Map SUN directly to Wei (1:1 mapping for simplicity)
  // This gives us a meaningful gas price that reflects actual costs
  return BigInt(energyPriceSun);
}

/**
 * Estimate gas for a Tron transaction
 * Maps bandwidth and energy consumption to Ethereum gas units
 */
export async function estimateGas(
  tw: any,
  txRequest: {
    from?: string;
    to?: string;
    data?: string;
    value?: string | number | bigint;
  }
): Promise<bigint> {
  const hasData = txRequest.data && txRequest.data !== '0x' && txRequest.data !== '0x0';
  const hasValue = txRequest.value && BigInt(txRequest.value || 0) > 0n;

  // Simple TRX transfer
  if (!hasData) {
    // Calculate bandwidth needed
    let bandwidthNeeded = BASE_TRANSACTION_BANDWIDTH;

    // Check if recipient exists (new account creation costs more)
    if (txRequest.to) {
      try {
        const account = await tw.trx.getAccount(txRequest.to);
        if (!account || !account.address) {
          bandwidthNeeded += CREATE_ACCOUNT_BANDWIDTH;
        }
      } catch {
        // Assume new account if we can't check
        bandwidthNeeded += CREATE_ACCOUNT_BANDWIDTH;
      }
    }

    // Return standard ETH transfer gas for simple transfers
    // This ensures compatibility with tools expecting ~21000 gas
    return BigInt(ETH_TRANSFER_GAS);
  }

  // Smart contract interaction
  if (hasData && txRequest.to) {
    try {
      // Use triggerConstantContract to estimate energy
      const dataHex = txRequest.data!.startsWith('0x')
        ? txRequest.data!.slice(2)
        : txRequest.data!;

      const result = await tw.transactionBuilder.triggerConstantContract(
        txRequest.to,
        '',
        {
          feeLimit: 150_000_000, // High limit for estimation
          input: dataHex,
          callValue: txRequest.value ? Number(txRequest.value) : 0
        },
        [],
        txRequest.from || tw.defaultAddress?.base58
      );

      if (result?.energy_used) {
        // Map energy to gas units
        // Add base gas plus energy used
        const estimatedGas = BASE_CONTRACT_EXECUTION_GAS + result.energy_used;
        return BigInt(estimatedGas);
      }
    } catch (error) {
      console.warn('Failed to estimate energy via triggerConstantContract:', error);
    }

    // Fallback: estimate based on calldata size
    const dataBytes = (txRequest.data!.length - 2) / 2; // Remove 0x and convert hex to bytes
    const calldataGas = dataBytes * GAS_PER_BYTE;
    return BigInt(BASE_CONTRACT_EXECUTION_GAS + calldataGas);
  }

  // Contract deployment (no 'to' address)
  if (hasData && !txRequest.to) {
    const dataBytes = (txRequest.data!.length - 2) / 2;
    // Deployment typically uses more energy
    const deploymentGas = 500_000 + (dataBytes * GAS_PER_BYTE);
    return BigInt(deploymentGas);
  }

  // Default fallback
  return BigInt(ETH_TRANSFER_GAS);
}

/**
 * Calculate actual TRX cost from gas and gas price
 * Returns cost in TRX (not SUN)
 */
export function calculateTrxCost(gas: bigint, gasPrice: bigint): number {
  const costInSun = gas * gasPrice;
  return Number(costInSun) / SUN_PER_TRX;
}

/**
 * Get fee history for Tron network
 * Maps recent energy prices to Ethereum fee history format
 */
export async function getFeeHistory(
  tw: any,
  blockCount: number,
  newestBlock: string | number,
  rewardPercentiles: number[]
): Promise<{
  oldestBlock: string;
  baseFeePerGas: string[];
  gasUsedRatio: number[];
  reward?: string[][];
}> {
  // Get current block number
  let endBlock: number;
  if (newestBlock === 'latest' || newestBlock === 'pending') {
    const block = await tw.trx.getCurrentBlock();
    endBlock = block?.block_header?.raw_data?.number || 0;
  } else {
    endBlock = typeof newestBlock === 'string'
      ? parseInt(newestBlock, 16)
      : newestBlock;
  }

  const startBlock = Math.max(0, endBlock - blockCount + 1);

  // Tron doesn't have dynamic base fees like Ethereum EIP-1559
  // We'll use the current energy price for all blocks
  const currentGasPrice = calculateGasPrice();
  const baseFeePerGas: string[] = [];
  const gasUsedRatio: number[] = [];
  const reward: string[][] = [];

  for (let i = 0; i < blockCount; i++) {
    // Use current energy price as base fee
    baseFeePerGas.push('0x' + currentGasPrice.toString(16));

    // Estimate gas usage ratio (Tron doesn't have gas limits like Ethereum)
    // We'll use a moderate value
    gasUsedRatio.push(0.5);

    // Priority fees don't exist in Tron, return minimal values
    if (rewardPercentiles && rewardPercentiles.length > 0) {
      const blockRewards = rewardPercentiles.map(() => '0x0');
      reward.push(blockRewards);
    }
  }

  return {
    oldestBlock: '0x' + startBlock.toString(16),
    baseFeePerGas,
    gasUsedRatio,
    ...(reward.length > 0 && { reward })
  };
}

/**
 * Get current energy price from the network
 * This should be called periodically to stay updated
 */
export async function getCurrentEnergyPrice(tw: any): Promise<number> {
  try {
    // Try to get chain parameters which include energy price
    const chainParams = await tw.trx.getChainParameters();
    const energyParam = chainParams?.find((p: any) => p.key === 'getEnergyFee');
    if (energyParam?.value) {
      return energyParam.value;
    }
  } catch (error) {
    console.warn('Failed to fetch current energy price:', error);
  }

  // Return default if we can't fetch
  return ENERGY_PRICE_SUN;
}

/**
 * Check account resources to determine if free bandwidth/energy is available
 */
export async function getAccountResources(
  tw: any,
  address: string
): Promise<TronAccountResources> {
  try {
    const resources = await tw.trx.getAccountResources(address);
    return {
      freeNetUsed: resources?.freeNetUsed || 0,
      freeNetLimit: resources?.freeNetLimit || 1500, // Daily free bandwidth
      netUsed: resources?.NetUsed || 0,
      netLimit: resources?.NetLimit || 0,
      energyUsed: resources?.EnergyUsed || 0,
      energyLimit: resources?.EnergyLimit || 0
    };
  } catch {
    // Return defaults if account doesn't exist
    return {
      freeNetUsed: 0,
      freeNetLimit: 1500,
      netUsed: 0,
      netLimit: 0,
      energyUsed: 0,
      energyLimit: 0
    };
  }
}

/**
 * Calculate the actual cost considering free resources
 */
export async function calculateActualCost(
  tw: any,
  from: string,
  estimatedResources: {
    bandwidth: number;
    energy: number;
  }
): Promise<{
  totalCostSun: number;
  willUseFreeResources: boolean;
  freeResourcesUsed: { bandwidth: number; energy: number };
}> {
  const resources = await getAccountResources(tw, from);

  // Calculate available free resources
  const availableFreeBandwidth = Math.max(0, resources.freeNetLimit - resources.freeNetUsed);
  const availableStakedBandwidth = Math.max(0, resources.netLimit - resources.netUsed);
  const availableEnergy = Math.max(0, resources.energyLimit - resources.energyUsed);

  // Determine what resources will be used
  const freeBandwidthUsed = Math.min(estimatedResources.bandwidth, availableFreeBandwidth);
  const stakedBandwidthUsed = Math.min(
    estimatedResources.bandwidth - freeBandwidthUsed,
    availableStakedBandwidth
  );
  const paidBandwidth = Math.max(
    0,
    estimatedResources.bandwidth - freeBandwidthUsed - stakedBandwidthUsed
  );

  const freeEnergyUsed = Math.min(estimatedResources.energy, availableEnergy);
  const paidEnergy = Math.max(0, estimatedResources.energy - freeEnergyUsed);

  // Calculate costs
  const bandwidthCostSun = paidBandwidth * BANDWIDTH_PRICE_SUN;
  const energyCostSun = paidEnergy * ENERGY_PRICE_SUN;
  const totalCostSun = bandwidthCostSun + energyCostSun;

  return {
    totalCostSun,
    willUseFreeResources: (freeBandwidthUsed + stakedBandwidthUsed + freeEnergyUsed) > 0,
    freeResourcesUsed: {
      bandwidth: freeBandwidthUsed + stakedBandwidthUsed,
      energy: freeEnergyUsed
    }
  };
}
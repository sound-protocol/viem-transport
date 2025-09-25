import type { MethodHandler } from "./types";
import { toHex } from "../utils/hex";

export const eth_gasPrice: MethodHandler = async (_params, { tw }) => {
  // Return current energy price mapped to wei
  // Energy price is 100 SUN per unit
  // We map this directly for meaningful gas calculations
  try {
    // Try to get current energy price from chain parameters
    const chainParams = await tw.trx.getChainParameters();
    const energyParam = chainParams?.find((p: { key: string; value: number }) => p.key === 'getEnergyFee');
    const energyPrice = energyParam?.value || 100;

    // Return energy price as gas price (SUN maps to Wei)
    return toHex(energyPrice);
  } catch {
    // Default to 100 SUN per energy unit
    return toHex(100);
  }
};

export const eth_maxPriorityFeePerGas: MethodHandler = async () => {
  // Tron doesn't have priority fees like Ethereum
  // Return 0 to indicate no priority fee mechanism
  return "0x0";
};

export const eth_feeHistory: MethodHandler = async (params, { tw }) => {
  // Implement fee history for EIP-1559 compatibility
  const blockCount = Number(params[0] || 1);
  const newestBlock = params[1] || "latest";
  const rewardPercentiles = params[2] || [];

  // Get the current block number
  let endBlockNumber: number;
  if (newestBlock === "latest" || newestBlock === "pending") {
    const block = await tw.trx.getCurrentBlock();
    endBlockNumber = block?.block_header?.raw_data?.number || 0;
  } else {
    endBlockNumber = typeof newestBlock === "string"
      ? parseInt(newestBlock as string, 16)
      : Number(newestBlock);
  }

  const startBlockNumber = Math.max(0, endBlockNumber - blockCount + 1);

  // Get current energy price for base fee calculation
  let energyPrice = 100; // Default
  try {
    const chainParams = await tw.trx.getChainParameters();
    const energyParam = chainParams?.find((p: { key: string; value: number }) => p.key === 'getEnergyFee');
    if (energyParam?.value) {
      energyPrice = energyParam.value;
    }
  } catch {
    // Use default
  }

  // Build response
  const baseFeePerGas: string[] = [];
  const gasUsedRatio: number[] = [];
  const reward: string[][] = [];

  for (let i = 0; i < blockCount; i++) {
    // Use current energy price as base fee for all blocks
    baseFeePerGas.push(toHex(energyPrice));

    // Tron doesn't have block gas limits, use a moderate ratio
    gasUsedRatio.push(0.5);

    // No priority fees in Tron
    if (rewardPercentiles && (rewardPercentiles as any[]).length > 0) {
      reward.push((rewardPercentiles as any[]).map(() => "0x0"));
    }
  }

  const response: {
    oldestBlock: string;
    baseFeePerGas: string[];
    gasUsedRatio: number[];
    reward?: string[][];
  } = {
    oldestBlock: toHex(startBlockNumber),
    baseFeePerGas,
    gasUsedRatio
  };

  if (reward.length > 0) {
    response.reward = reward;
  }

  return response;
};
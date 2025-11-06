import type { Address, TronTransaction, TronTransactionInfo, TronWebLike } from "../types";
import { toHex } from "viem";
import { to0x } from "./hex";
import { tronAddressTo0x } from "./address";
import { ZERO_ADDRESS } from "../constants";

// Helper to extract transaction input data
export function extractInputData(_tw: TronWebLike, tx: TronTransaction): string | null {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;

  const parameter = contract.parameter?.value;
  if (parameter?.data) {
    return to0x(parameter.data);
  }

  return null;
}

// Helper to extract from address from transaction
export function extractFromAddress(tw: TronWebLike, tx: TronTransaction): Address | null {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;

  const parameter = contract.parameter?.value;
  if (parameter?.owner_address) {
    return tronAddressTo0x(tw, parameter.owner_address);
  }

  return null;
}

// Helper to extract to address from transaction
export function extractToAddress(tw: TronWebLike, tx: TronTransaction): Address | null {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;

  const parameter = contract.parameter?.value;
  if (parameter?.to_address) {
    return tronAddressTo0x(tw, parameter.to_address);
  }
  if (parameter?.contract_address) {
    return tronAddressTo0x(tw, parameter.contract_address);
  }

  return null;
}

// Helper to extract value from transaction
export function extractValue(_tw: TronWebLike, tx: TronTransaction): number {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return 0;

  const parameter = contract.parameter?.value;
  if (parameter?.amount) {
    return parameter.amount;
  }
  if (parameter?.call_value) {
    return parameter.call_value;
  }

  return 0;
}

// Normalize transaction receipt for Ethereum compatibility
export function normalizeReceipt(tw: TronWebLike, info: TronTransactionInfo) {
  const status =
    (info?.receipt?.result ?? info?.result) === "SUCCESS" ? "0x1" : "0x0";
  const logsArray = Array.isArray(info?.log) ? info.log : [];
  const logs = logsArray.map((l: { address: string; data?: string; topics?: string[] }, i: number) => ({
    address: tronAddressTo0x(tw, l.address) ?? ZERO_ADDRESS,
    blockHash: null,
    blockNumber: info.blockNumber != null ? toHex(info.blockNumber) : null,
    data:
      typeof l?.data === "string" && l.data.length > 0 ? to0x(l.data) : "0x",
    logIndex: toHex(i),
    removed: false,
    topics: Array.isArray(l?.topics)
      ? l.topics
          .filter(
            (topic: unknown): topic is string => typeof topic === "string",
          )
          .map((topic: string) => to0x(topic))
      : [],
    transactionHash: info.id ? to0x(info.id) : null,
    transactionIndex: "0x0",
  }));

  return {
    blockHash: null,
    blockNumber: info.blockNumber != null ? toHex(info.blockNumber) : null,
    contractAddress: tronAddressTo0x(tw, info.contract_address),
    cumulativeGasUsed: toHex(
      info.receipt?.energy_usage_total ?? info.energy_usage_total ?? 0,
    ),
    effectiveGasPrice: "0x0",
    from: null,
    gasUsed: toHex(info.receipt?.energy_usage ?? info.energy_usage ?? 0),
    logs,
    logsBloom: "0x",
    status,
    to: null,
    transactionHash: info.id ? to0x(info.id) : null,
    transactionIndex: "0x0",
    type: "0x0",
  };
}
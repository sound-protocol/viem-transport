import type { MethodHandler } from "./types";
import { eth_blockNumber, eth_getBlockByNumber, eth_getBlockByHash } from "./blocks";
import { eth_getBalance, eth_getTransactionCount, eth_accounts, net_version } from "./accounts";
import {
  eth_sendTransaction,
  eth_sendRawTransaction,
  eth_getTransactionReceipt,
  eth_getTransaction,
  eth_getTransactionByHash,
  eth_sign
} from "./transactions";
import { eth_call, eth_estimateGas, eth_getCode, eth_getStorageAt } from "./contracts";
import { eth_getLogs } from "./logs";
import { eth_gasPrice, eth_maxPriorityFeePerGas, eth_feeHistory } from "./gas";

// This registry maps Ethereum RPC methods to their handlers
// Each handler is imported from its specialized module
export const METHOD_REGISTRY: Record<string, MethodHandler> = {
  // Chain methods
  "eth_chainId": async (_params, { getChainIdHex }) => getChainIdHex(),

  // Block methods
  "eth_blockNumber": eth_blockNumber,
  "eth_getBlockByNumber": eth_getBlockByNumber,
  "eth_getBlockByHash": eth_getBlockByHash,

  // Account methods
  "eth_getBalance": eth_getBalance,
  "eth_getTransactionCount": eth_getTransactionCount,
  "eth_accounts": eth_accounts,
  "net_version": net_version,

  // Transaction methods
  "eth_sendTransaction": eth_sendTransaction,
  "eth_sendRawTransaction": eth_sendRawTransaction,
  "eth_getTransactionReceipt": eth_getTransactionReceipt,
  "eth_getTransaction": eth_getTransaction,
  "eth_getTransactionByHash": eth_getTransactionByHash,
  "eth_sign": eth_sign,

  // Contract methods
  "eth_call": eth_call,
  "eth_estimateGas": eth_estimateGas,
  "eth_getCode": eth_getCode,
  "eth_getStorageAt": eth_getStorageAt,

  // Log methods
  "eth_getLogs": eth_getLogs,

  // Gas and fee methods
  "eth_gasPrice": eth_gasPrice,
  "eth_maxPriorityFeePerGas": eth_maxPriorityFeePerGas,
  "eth_feeHistory": eth_feeHistory,

  // Unsupported filter methods (throw error)
  "eth_newFilter": async () => {
    throw new Error("Method not supported by Tron transport: eth_newFilter");
  },
  "eth_getFilterChanges": async () => {
    throw new Error("Method not supported by Tron transport: eth_getFilterChanges");
  },
  "eth_getFilterLogs": async () => {
    throw new Error("Method not supported by Tron transport: eth_getFilterLogs");
  },
  "eth_uninstallFilter": async () => {
    throw new Error("Method not supported by Tron transport: eth_uninstallFilter");
  },
};

// Export a function to check if a method is supported
export function isMethodSupported(method: string): boolean {
  return method in METHOD_REGISTRY;
}

// Export a function to get the handler for a method
export function getMethodHandler(method: string): MethodHandler | null {
  return METHOD_REGISTRY[method] || null;
}
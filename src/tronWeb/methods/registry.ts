import type { MethodHandler } from "./types";
import { eth_blockNumber, eth_getBlockByNumber, eth_getBlockByHash } from "./blocks";

// This registry maps Ethereum RPC methods to their handlers
// Each handler is imported from its specialized module
export const METHOD_REGISTRY: Record<string, MethodHandler> = {
  // Chain methods
  "eth_chainId": async (_params, { getChainIdHex }) => getChainIdHex(),

  // Block methods
  "eth_blockNumber": eth_blockNumber,
  "eth_getBlockByNumber": eth_getBlockByNumber,
  "eth_getBlockByHash": eth_getBlockByHash,

  // Account methods (would import from './accounts.ts')
  // "eth_getBalance": eth_getBalance,
  // "eth_getTransactionCount": eth_getTransactionCount,
  // "eth_accounts": eth_accounts,

  // Transaction methods (would import from './transactions.ts')
  // "eth_sendTransaction": eth_sendTransaction,
  // "eth_sendRawTransaction": eth_sendRawTransaction,
  // "eth_getTransactionReceipt": eth_getTransactionReceipt,
  // "eth_getTransaction": eth_getTransaction,

  // Contract methods (would import from './contracts.ts')
  // "eth_call": eth_call,
  // "eth_estimateGas": eth_estimateGas,
  // "eth_getCode": eth_getCode,

  // Log methods (would import from './logs.ts')
  // "eth_getLogs": eth_getLogs,
};

// Export a function to check if a method is supported
export function isMethodSupported(method: string): boolean {
  return method in METHOD_REGISTRY;
}

// Export a function to get the handler for a method
export function getMethodHandler(method: string): MethodHandler | null {
  return METHOD_REGISTRY[method] || null;
}
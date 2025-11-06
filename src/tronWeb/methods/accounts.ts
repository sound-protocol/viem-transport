import type { MethodHandler } from "./types";
import type { Address } from "../types";
import { toHex } from "viem";
import { assertAddress, tronBase58FromEvm, toCanonicalAddress, getTronDefaultAddressCandidates } from "../utils/address";

export const eth_getBalance: MethodHandler = async (params, { tw }) => {
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getBalance",
    parameter: 0
  });
  const tronAddress = tronBase58FromEvm(tw, address0x);
  const balanceSun = await tw.trx.getBalance(tronAddress);
  return toHex(balanceSun ?? 0);
};

export const eth_getTransactionCount: MethodHandler = async (params, { tw }) => {
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getTransactionCount",
    parameter: 0
  });
  const blockTag = params[1] ?? "latest";

  // Tron doesn't use nonces like Ethereum
  // We provide a monotonically increasing value for Safe compatibility
  const tronAddress = tronBase58FromEvm(tw, address0x);

  try {
    // Get account info
    const account = await tw.trx.getAccount(tronAddress);

    // For Safe compatibility: Create a pseudo-nonce that increases over time
    // This helps Safe maintain transaction ordering without strict sequential nonces
    const txCount = account?.transactions?.length ?? 0;

    // Get current block for timestamp-based component
    const currentBlock = await tw.trx.getCurrentBlock();
    const blockNumber = currentBlock?.block_header?.raw_data?.number ?? 0;

    // Combine tx count with block number for monotonic increase
    // This ensures each new transaction gets a higher nonce-like value
    // Format: (txCount * 1000000) + blockNumber
    // This gives us room for ~1M blocks between transactions
    const pseudoNonce = (txCount * 1000000) + (blockNumber % 1000000);

    return toHex(pseudoNonce);
  } catch {
    // If account doesn't exist, use block-based nonce
    try {
      const currentBlock = await tw.trx.getCurrentBlock();
      const blockNumber = currentBlock?.block_header?.raw_data?.number ?? 0;
      return toHex(blockNumber);
    } catch {
      return "0x0";
    }
  }
};

export const eth_accounts: MethodHandler = async (_params, { tw, config }) => {
  // Return configured default addresses if available
  const addresses: Address[] = [];

  // Check configured default address
  if (config?.defaultFrom) {
    const addr = toCanonicalAddress(tw, config.defaultFrom);
    if (addr) addresses.push(addr);
  }

  // Check TronWeb default addresses
  const candidates = getTronDefaultAddressCandidates(tw);
  for (const candidate of candidates) {
    const addr = toCanonicalAddress(tw, candidate);
    if (addr && !addresses.includes(addr)) {
      addresses.push(addr);
    }
  }

  return addresses;
};

export const net_version: MethodHandler = async (_params, { getChainIdHex }) => {
  // Return network ID (same as chain ID for Tron)
  const chainId = getChainIdHex();
  return String(parseInt(chainId, 16));
};
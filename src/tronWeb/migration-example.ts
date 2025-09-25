/**
 * Migration Example: Using the new modular TronWeb transport
 *
 * The API remains the same, but the internal structure is now modular.
 * You can also import specific utilities if needed.
 */

// ============================================
// BEFORE: Using the monolithic tronWeb.ts
// ============================================
/*
import { tronWeb } from "./tronWeb";
import TronWeb from "tronweb";

const tw = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: process.env.PRIVATE_KEY
});

const transport = tronWeb(tw, {
  chainId: "0x2b6653dc",
  defaultFrom: "TYourTronAddress...",
  sendOptions: {
    feeLimit: 15_000_000
  }
});
*/

// ============================================
// AFTER: Using the modular structure
// ============================================

// Main transport - API unchanged
import { tronWeb } from "./tronWeb";

// Can now also import specific utilities if needed
import {
  tronBase58FromEvm,
  toCanonicalAddress,
  assertAddress
} from "./tronWeb/utils/address";

import {
  toHex,
  to0x,
  strip0x
} from "./tronWeb/utils/hex";

import {
  ZERO_ADDRESS,
  DEFAULT_FEE_LIMIT
} from "./tronWeb/constants";

// Type imports are more organized
import type {
  TronWebLike,
  TronWebTransport,
  TronBlock,
  TronTransaction
} from "./tronWeb/types";

import type {
  TronWebTransportConfig,
  TronWebSigner
} from "./tronWeb/types/config";

// Example: Using the transport (unchanged)
import TronWeb from "tronweb";
import { createWalletClient, createPublicClient } from "viem";

const tw = new TronWeb({
  fullHost: "https://api.trongrid.io",
  privateKey: process.env.PRIVATE_KEY
});

// Transport creation is identical
const transport = tronWeb(tw, {
  chainId: "0x2b6653dc",
  defaultFrom: "TYourTronAddress...",
  sendOptions: {
    feeLimit: 15_000_000
  }
});

// Client creation is identical
const publicClient = createPublicClient({
  transport
});

const walletClient = createWalletClient({
  transport
});

// ============================================
// NEW: Direct utility usage
// ============================================

// You can now use utilities directly without importing the entire transport
async function convertAddresses(evmAddress: `0x${string}`) {
  // Convert EVM address to Tron format
  const tronAddress = tronBase58FromEvm(tw, evmAddress);
  console.log("Tron address:", tronAddress);

  // Convert back to canonical EVM format
  const canonical = toCanonicalAddress(tw, tronAddress);
  console.log("Canonical EVM address:", canonical);
}

// Custom signer can use the utilities
const customSigner: TronWebSigner = async (transaction, context) => {
  // Use address utilities
  const from = assertAddress(context.tronWeb, transaction.raw_data?.contract?.[0]?.parameter?.value?.owner_address, {
    method: "customSigner",
    parameter: 0
  });

  console.log("Signing transaction from:", from);

  // Sign the transaction
  const signed = await context.tronWeb.trx.sign(transaction);
  return signed;
};

// ============================================
// Benefits of the modular structure:
// ============================================

/*
1. **Better tree-shaking**: Import only what you need
2. **Clearer organization**: Find code faster
3. **Easier testing**: Test utilities in isolation
4. **Better TypeScript**: More focused type definitions
5. **Extensibility**: Easy to add new methods

Example of extending the transport:

// Add a custom method handler
import { getMethodHandler } from "./tronWeb/methods/registry";

// Override or add methods as needed
const customHandler = async (params: unknown[]) => {
  const baseHandler = getMethodHandler("eth_call");
  // Custom logic here
  return baseHandler ? await baseHandler(params, context) : null;
};
*/

export { transport, publicClient, walletClient, convertAddresses, customSigner };
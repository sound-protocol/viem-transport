/**
 * TronWeb Viem Transport
 *
 * This file now re-exports the modular implementation from src/tronWeb.
 * The original monolithic implementation has been refactored into a clean,
 * maintainable module structure while preserving full API compatibility.
 *
 * The modular structure provides:
 * - Better maintainability with single-responsibility modules
 * - Easier testing with isolated utilities
 * - Improved tree-shaking for smaller bundle sizes
 * - Extensible architecture for adding new RPC methods
 *
 * @see src/tronWeb/README.md for the module structure documentation
 * @see tronWeb.original.ts for the original monolithic implementation
 */

// Main transport export - API unchanged
export { tronWeb } from "./src/tronWeb";

// Type exports for backward compatibility
export type {
  TronWebLike,
  TronWebTransport,
  Address,
  TronBlock,
  TronTransaction,
  TronTransactionInfo,
  ErrorResponse,
  TronEvent,
  FunctionInfo,
  ParsedParam,
  ParsedCallData,
  ResolveAddressContext
} from "./src/tronWeb/types";

export type {
  TronWebTransportConfig,
  TronWebSigner,
  TronWebSignerContext
} from "./src/tronWeb/types/config";

// Export useful utilities for consumers who want to use them directly
export {
  // Address utilities
  assertAddress,
  tronBase58FromEvm,
  tronAddressTo0x,
  toCanonicalAddress,
  tronHex41To0x,
  tronBase58ToHex41,
  resolveFromAddress,
  getTronDefaultAddressCandidates,

  // Hex utilities
  toHex,
  to0x,
  strip0x,
  normalizeHex,

  // Constants
  ZERO_ADDRESS,
  TRON_HEX_PREFIX,
  BASE58_REGEX,
  DEFAULT_FEE_LIMIT
} from "./src/tronWeb";
import { createTransport, type EIP1193RequestFn } from "viem";
import type { TronWebLike, TronWebTransport } from "./types";
import type { TronWebTransportConfig } from "./types/config";
import { toHex } from "./utils/hex";
import { getMethodHandler } from "./methods/registry";
import type { MethodContext } from "./methods/types";

/**
 * Creates a Viem transport backed by a TronWeb instance.
 *
 * This modular implementation breaks down the original monolithic file into:
 * - types/ - All TypeScript interfaces and type definitions
 * - constants.ts - Shared constants
 * - utils/ - Utility functions for addresses, hex, validation, etc.
 * - abi/ - ABI parsing and function registry
 * - methods/ - RPC method handlers organized by domain
 *
 * @example
 * ```ts
 * import TronWeb from 'tronweb';
 * import { createWalletClient } from 'viem';
 * import { tronWeb } from '@/tronWeb';
 *
 * const tw = new TronWeb({
 *   fullHost: 'https://api.trongrid.io',
 *   privateKey: process.env.PRIVATE_KEY
 * });
 *
 * const client = createWalletClient({
 *   transport: tronWeb(tw)
 * });
 * ```
 */
export function tronWeb(
  tw: TronWebLike,
  cfg: TronWebTransportConfig = {},
): TronWebTransport {
  const {
    key = "tronWeb",
    name = "TronWeb",
    methods,
    retryDelay,
    timeout,
  } = cfg;

  return ({ chain, retryCount: defaultRetryCount }) =>
    createTransport(
      {
        key,
        methods,
        name,
        request: buildEip1193Request(tw, {
          chainId: cfg.chainId,
          chain,
          config: cfg,
        }),
        retryCount: cfg.retryCount ?? defaultRetryCount,
        retryDelay,
        timeout,
        type: "tronWeb",
      },
      { tronWeb: tw },
    );
}

/**
 * Builds an EIP-1193 request function for the TronWeb transport.
 * This function routes Ethereum RPC methods to their Tron equivalents.
 */
function buildEip1193Request(
  tw: TronWebLike,
  opts: {
    chainId?: number | `0x${string}`;
    chain?: { id: number } | undefined;
    config?: TronWebTransportConfig | undefined;
  },
): EIP1193RequestFn {
  const config = opts.config;

  const getChainIdHex = (): `0x${string}` => {
    if (typeof opts.chainId === "string") return opts.chainId;
    if (typeof opts.chainId === "number") return toHex(opts.chainId);
    if (opts.chain?.id != null) return toHex(opts.chain.id);
    throw new Error("eth_chainId not configured for Tron transport");
  };

  const req = async ({ method, params }: { method: string; params?: unknown }) => {
    const p = Array.isArray(params) ? params : params ? [params] : [];

    // Create the context for method handlers
    const context: MethodContext = {
      tw,
      config,
      getChainIdHex,
    };

    // Check if we have a handler for this method
    const handler = getMethodHandler(method);
    if (handler) {
      return await handler(p, context);
    }

    // Method not supported
    throw new Error(`Method not supported by Tron transport: ${method}`);
  };

  return req as EIP1193RequestFn;
}

// Re-export types and utilities for convenience
export type { TronWebLike, TronWebTransport } from "./types";
export type { TronWebTransportConfig, TronWebSigner, TronWebSignerContext } from "./types/config";

// Export utility functions that might be useful for consumers
export * from "./utils/address";
export * from "./utils/hex";
export { ZERO_ADDRESS, DEFAULT_FEE_LIMIT } from "./constants";
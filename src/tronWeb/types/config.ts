import type { Transport, TransportConfig, EIP1193RequestFn } from "viem";
import type { TronTransaction, TronWebLike } from "./index";

export type TronWebSignerContext = {
  tronWeb: TronWebLike;
  request: { method: string; params: unknown[] };
};

export type TronWebSigner = (
  transaction: TronTransaction,
  context: TronWebSignerContext,
) => Promise<TronTransaction>;

export type TronWebTransportConfig = {
  /** Value to return for `eth_chainId`. If omitted, falls back to `chain.id`. */
  chainId?: number | `0x${string}`;
  /** The key of the transport. */
  key?: TransportConfig["key"] | undefined;
  /** Methods to include or exclude from executing RPC requests. */
  methods?: TransportConfig["methods"] | undefined;
  /** The name of the transport. */
  name?: TransportConfig["name"] | undefined;
  /** The max number of times to retry. */
  retryCount?: TransportConfig["retryCount"] | undefined;
  /** The base delay (in ms) between retries. */
  retryDelay?: TransportConfig["retryDelay"] | undefined;
  /** The timeout (in ms) for requests. */
  timeout?: TransportConfig["timeout"] | undefined;
  /** Default address used when requests omit `from`. Accepts 0x, base58, or 41-hex. */
  defaultFrom?: string | undefined;
  /** Options controlling constant contract calls (`eth_call`). */
  callOptions?: {
    /** Fee limit (SUN) applied when invoking constant calls. */
    feeLimit?: number | undefined;
  };
  /** Options controlling state-changing transactions. */
  sendOptions?: {
    /** Fee limit (SUN) applied when building transactions. */
    feeLimit?: number | undefined;
    /** Custom signer invoked before broadcasting. */
    signer?: TronWebSigner | undefined;
  };
  /** Signature compatibility configuration for cross-chain contracts. */
  signatureCompatibility?: {
    /**
     * Use Ethereum-compatible signing prefix for all message signatures.
     * Set to TRUE for: Ethereum Safe contracts deployed without modifications
     * Set to FALSE for: Tron-adapted Safe contracts that expect Tron signatures
     * Default: false (use native Tron signing)
     */
    useEthereumPrefix?: boolean;
    /**
     * Automatically adjust v values to Ethereum format (27/28 instead of 0/1).
     * Default: true
     */
    adjustVValue?: boolean;
    /**
     * Offset to add to v value for signature compatibility.
     *
     * Use cases:
     * - 0: Standard Ethereum signatures (v = 27/28) - DEFAULT
     * - 4: Tron Safe with compressed keys (v = 31/32)
     *
     * Technical background:
     * - TronWeb's signMessageV2 returns v = 27 or 28 (standard ECDSA)
     * - Some Tron Safe contracts expect v = 31/32 (compressed public key format, BIP-137)
     * - This offset is applied AFTER signature generation: final_v = original_v + offset
     *
     * Example:
     * ```typescript
     * // Standard Ethereum Safe (v = 27/28)
     * signatureCompatibility: { vValueOffset: 0 }
     *
     * // Tron Safe with compressed keys (v = 31/32)
     * signatureCompatibility: { vValueOffset: 4 }
     * ```
     *
     * Default: 0 (standard Ethereum format)
     */
    vValueOffset?: number;
    /**
     * Support dual verification (try both TRON and Ethereum prefixes).
     * Default: false (for performance)
     */
    supportDualVerification?: boolean;
  };
};

export type TronWebTransport = Transport<
  "tronWeb",
  { tronWeb: TronWebLike },
  EIP1193RequestFn
>;
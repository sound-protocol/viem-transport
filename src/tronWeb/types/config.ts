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
};

export type TronWebTransport = Transport<
  "tronWeb",
  { tronWeb: TronWebLike },
  EIP1193RequestFn
>;
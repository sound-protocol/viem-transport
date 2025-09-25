import type { TronWebLike } from "../types";
import type { TronWebTransportConfig } from "../types/config";

export type MethodContext = {
  tw: TronWebLike;
  config: TronWebTransportConfig | undefined;
  getChainIdHex: () => `0x${string}`;
};

export type MethodHandler = (
  params: unknown[],
  context: MethodContext
) => Promise<unknown>;
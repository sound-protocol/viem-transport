import type { Address } from "./types";

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";
export const TRON_HEX_PREFIX = "41";
export const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;
export const DEFAULT_FEE_LIMIT = 40_000_000; // Increased for Safe contract deployments
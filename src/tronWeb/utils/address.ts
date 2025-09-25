import type { Address, TronWebLike, ResolveAddressContext } from "../types";
import type { TronWebTransportConfig } from "../types/config";
import { ZERO_ADDRESS, TRON_HEX_PREFIX } from "../constants";
import { strip0x } from "./hex";
import { isTronBase58, formatParamValue } from "./validation";

export function assertAddress(
  tw: TronWebLike,
  value: unknown,
  ctx: { method: string; parameter: number; property?: string },
): Address {
  const address = toCanonicalAddress(tw, value);
  if (address) return address;
  const target = ctx.property ?? `param[${ctx.parameter}]`;
  throw new Error(
    `${ctx.method} ${target} must be an address in 0x-prefixed 20-byte hex, Tron base58 (T...), or Tron 41-hex form. Received ${formatParamValue(value)}.`,
  );
}

export function tronBase58FromEvm(tw: TronWebLike, address: Address): string {
  const hex41 = `${TRON_HEX_PREFIX}${strip0x(address)}`;
  try {
    const converted = tw.address.fromHex(hex41);
    if (!isTronBase58(converted))
      throw new Error("TronWeb returned an invalid base58 address");
    return converted;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to convert ${address} to Tron base58: ${message}`);
  }
}

export function tronAddressTo0x(tw: TronWebLike, value: unknown): Address | null {
  return toCanonicalAddress(tw, value);
}

export function toCanonicalAddress(tw: TronWebLike, value: unknown): Address | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;

  const hex = strip0x(trimmed);
  if (/^[0-9a-fA-F]{40}$/.test(hex)) return `0x${hex.toLowerCase()}` as Address;

  if (
    /^[0-9a-fA-F]{42}$/.test(hex) &&
    hex.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX
  )
    return `0x${hex.slice(2).toLowerCase()}` as Address;

  if (isTronBase58(trimmed)) {
    const hex41 = tronBase58ToHex41(tw, trimmed);
    if (!hex41) return null;
    return tronHex41To0x(hex41);
  }

  return null;
}

export function tronHex41To0x(value: string): Address | null {
  const hex = strip0x(value).toLowerCase();
  if (hex.length !== 42 || !hex.startsWith(TRON_HEX_PREFIX)) return null;
  const body = hex.slice(2);
  if (!/^[0-9a-f]{40}$/.test(body)) return null;
  return `0x${body}` as Address;
}

export function tronBase58ToHex41(tw: TronWebLike, value: string): string | null {
  try {
    const hex = tw.address.toHex(value);
    const normalized = strip0x(hex);
    if (
      normalized.length === 42 &&
      normalized.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX &&
      /^[0-9a-fA-F]+$/.test(normalized)
    )
      return `0x${normalized.toLowerCase()}`;
  } catch {
    return null;
  }
  return null;
}

export function resolveFromAddress(
  tw: TronWebLike,
  config: TronWebTransportConfig | undefined,
  candidate: unknown,
  ctx: ResolveAddressContext,
): { evm: Address; base58: string } {
  const candidates: string[] = [];
  if (typeof candidate === "string" && candidate.trim().length > 0)
    candidates.push(candidate);
  if (candidate == null && typeof config?.defaultFrom === "string")
    candidates.push(config.defaultFrom);
  if (candidate == null)
    candidates.push(...getTronDefaultAddressCandidates(tw));

  for (const value of candidates) {
    const address = toCanonicalAddress(tw, value);
    if (address)
      return { evm: address, base58: tronBase58FromEvm(tw, address) };
  }

  if (ctx.allowZeroFallback) {
    const base58 = tronBase58FromEvm(tw, ZERO_ADDRESS);
    return { evm: ZERO_ADDRESS, base58 };
  }

  throw new Error(
    `${ctx.method} ${ctx.property} is required. Provide a valid address or configure defaultFrom on the TronWeb transport.`,
  );
}

export function getTronDefaultAddressCandidates(tw: TronWebLike): string[] {
  const defaults = new Set<string>();
  const address = tw.defaultAddress;
  if (address) {
    const maybe = [address.base58, address.b58, address.hex, address.hexString];
    for (const value of maybe) {
      if (typeof value === "string" && value.length > 0) defaults.add(value);
    }
  }
  return Array.from(defaults);
}
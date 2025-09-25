import { strip0x } from "./hex";

export function toSun(value: unknown, label: string): number {
  let amount: bigint;
  try {
    amount = toBigIntLike(value);
  } catch {
    throw new Error(`Tron transport ${label} must be a valid numeric value.`);
  }
  if (amount < BigInt(0))
    throw new Error(`Tron transport ${label} must be a non-negative integer.`);
  if (amount === BigInt(0)) return 0;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(
      `Tron transport ${label} exceeds the max safe integer supported for Sun values.`,
    );
  return Number(amount);
}

export function toBigIntLike(value: unknown): bigint {
  if (value == null) return BigInt(0);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Value must be finite.");
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return BigInt(0);
    const normalized =
      trimmed.startsWith("0x") || trimmed.startsWith("0X")
        ? `0x${strip0x(trimmed)}`
        : trimmed;
    if (normalized === "0x") return BigInt(0);
    return BigInt(normalized);
  }
  throw new Error("Value must be bigint, number, or hex string.");
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const numeric = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const truncated = Math.trunc(numeric);
  if (truncated < 0) return undefined;
  return truncated;
}

export function resolveFeeLimit(
  provided: number | undefined,
  fallback: number,
  label: string,
): number {
  const value = provided ?? fallback;
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Tron transport ${label} must be a positive number.`);
  return Math.trunc(value);
}
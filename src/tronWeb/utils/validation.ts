import { BASE58_REGEX } from "../constants";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTronBase58(value: string): boolean {
  if (!value || value[0] !== "T") return false;
  if (value.length < 34 || value.length > 36) return false;
  return BASE58_REGEX.test(value);
}

export function isLikelyBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) return false;
  return /^[0-9A-Za-z+/=]+$/.test(value);
}

export function formatParamValue(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (value == null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
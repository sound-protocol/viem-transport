export function to0x(hex: string): `0x${string}` {
  return `0x${strip0x(hex).toLowerCase()}`;
}

export function strip0x(hex: string): string {
  if (typeof hex !== "string") return String(hex ?? "");
  const value = hex.trim();
  return value.startsWith("0x") || value.startsWith("0X")
    ? value.slice(2)
    : value;
}

export function normalizeHex(value: unknown): `0x${string}` {
  if (typeof value !== "string") return "0x";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "0x" || trimmed === "0X") return "0x";
  return `0x${strip0x(trimmed)}`;
}
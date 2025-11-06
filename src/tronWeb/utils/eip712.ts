import { keccak256 } from "viem";
import { strip0x } from "./hex";

// EIP-712 type definitions
export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number | bigint;
  verifyingContract?: string;
  salt?: string;
}

export interface TypedDataField {
  name: string;
  type: string;
}

export interface TypedData {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, any>;
}

// EIP-712 constants
const EIP712_DOMAIN_TYPE = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
  { name: "salt", type: "bytes32" },
];

/**
 * Encode a single type for EIP-712
 */
function encodeType(typeName: string, types: Record<string, TypedDataField[]>): string {
  const fields = types[typeName];
  if (!fields) {
    throw new Error(`Type ${typeName} not found in types`);
  }

  const encoded = fields
    .map((field) => `${field.type} ${field.name}`)
    .join(",");

  return `${typeName}(${encoded})`;
}

/**
 * Get all dependencies of a type (including nested types)
 */
function getDependencies(
  typeName: string,
  types: Record<string, TypedDataField[]>,
  found = new Set<string>()
): Set<string> {
  if (found.has(typeName)) return found;

  const fields = types[typeName];
  if (!fields) return found;

  found.add(typeName);

  for (const field of fields) {
    const fieldType = field.type.replace(/\[.*\]$/, ""); // Remove array brackets
    if (types[fieldType] && !found.has(fieldType)) {
      getDependencies(fieldType, types, found);
    }
  }

  return found;
}

/**
 * Encode type with all its dependencies
 */
function encodeTypeWithDeps(typeName: string, types: Record<string, TypedDataField[]>): string {
  const deps = getDependencies(typeName, types);
  const sorted = Array.from(deps).sort();
  const primary = sorted.splice(sorted.indexOf(typeName), 1)[0];

  const encoded = [primary, ...sorted]
    .map((type) => encodeType(type, types))
    .join("");

  return encoded;
}

/**
 * Hash a type for EIP-712
 */
function hashType(typeName: string, types: Record<string, TypedDataField[]>): string {
  const encoded = encodeTypeWithDeps(typeName, types);
  return keccak256(`0x${Buffer.from(encoded).toString("hex")}`);
}

/**
 * Encode a value according to its type
 */
function encodeValue(type: string, value: any, types: Record<string, TypedDataField[]>): string {
  if (type === "string" || type === "bytes") {
    return keccak256(`0x${Buffer.from(value).toString("hex")}`);
  }

  if (type.startsWith("bytes")) {
    // Fixed-size bytes
    const hex = strip0x(value);
    return hex.padEnd(64, "0");
  }

  if (type === "bool") {
    return value ? "0".padStart(63, "0") + "1" : "0".padStart(64, "0");
  }

  if (type.startsWith("uint") || type.startsWith("int")) {
    const num = BigInt(value);
    const hex = num.toString(16);
    if (type.startsWith("int") && num < 0n) {
      // Two's complement for negative numbers
      const bits = parseInt(type.replace(/[^0-9]/g, "") || "256");
      const max = 2n ** BigInt(bits);
      return (max + num).toString(16).padStart(64, "0");
    }
    return hex.padStart(64, "0");
  }

  if (type === "address") {
    return strip0x(value).toLowerCase().padStart(64, "0");
  }

  if (type.endsWith("[]")) {
    // Dynamic array
    const elementType = type.slice(0, -2);
    const encoded = (value as any[]).map((v) => encodeValue(elementType, v, types));
    const concatenated = encoded.join("");
    return keccak256(`0x${concatenated}`);
  }

  if (type.includes("[")) {
    // Fixed-size array
    const match = type.match(/^(.+)\[(\d+)\]$/);
    if (!match) throw new Error(`Invalid array type: ${type}`);
    const [, elementType, size] = match;
    const encoded = (value as any[])
      .slice(0, parseInt(size))
      .map((v) => encodeValue(elementType, v, types));
    return encoded.join("");
  }

  if (types[type]) {
    // Custom struct type
    return hashStruct(type, value, types);
  }

  throw new Error(`Unsupported type: ${type}`);
}

/**
 * Hash a struct for EIP-712
 */
function hashStruct(typeName: string, data: Record<string, any>, types: Record<string, TypedDataField[]>): string {
  const fields = types[typeName];
  if (!fields) {
    throw new Error(`Type ${typeName} not found`);
  }

  const typeHash = hashType(typeName, types);
  const encodedValues = fields.map((field) => {
    const value = data[field.name];
    if (value === undefined || value === null) {
      return "0".padStart(64, "0");
    }
    return encodeValue(field.type, value, types);
  });

  const encoded = typeHash + encodedValues.join("");
  return keccak256(`0x${encoded}`);
}

/**
 * Create domain separator hash for EIP-712
 */
function hashDomain(domain: TypedDataDomain, types: Record<string, TypedDataField[]>): string {
  const domainType: TypedDataField[] = [];
  const domainData: Record<string, any> = {};

  // Only include fields that are present in the domain
  for (const field of EIP712_DOMAIN_TYPE) {
    const value = domain[field.name as keyof TypedDataDomain];
    if (value !== undefined) {
      domainType.push(field);
      domainData[field.name] = value;
    }
  }

  // Add the domain type to types temporarily
  const extendedTypes = { ...types, EIP712Domain: domainType };

  return hashStruct("EIP712Domain", domainData, extendedTypes);
}

/**
 * Create the final EIP-712 digest to sign
 */
export function createEIP712Digest(typedData: TypedData): string {
  const domainSeparator = hashDomain(typedData.domain, typedData.types);
  const messageHash = hashStruct(typedData.primaryType, typedData.message, typedData.types);

  // Final digest: keccak256("\x19\x01" + domainSeparator + messageHash)
  const prefix = "1901";
  const digest = keccak256(`0x${prefix}${strip0x(domainSeparator)}${strip0x(messageHash)}`);

  return digest;
}

/**
 * Parse and validate typed data
 */
export function parseTypedData(data: string | object): TypedData {
  const parsed = typeof data === "string" ? JSON.parse(data) : data;

  if (!parsed.types || !parsed.domain || !parsed.primaryType || !parsed.message) {
    throw new Error("Invalid typed data: missing required fields");
  }

  // Remove EIP712Domain from types if present (it's handled separately)
  const types = { ...parsed.types };
  delete types.EIP712Domain;

  return {
    domain: parsed.domain,
    types,
    primaryType: parsed.primaryType,
    message: parsed.message,
  };
}

/**
 * Format Safe transaction for EIP-712
 */
export function formatSafeTransaction(safeTx: any): TypedData {
  return {
    types: {
      SafeTx: [
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
        { name: "operation", type: "uint8" },
        { name: "safeTxGas", type: "uint256" },
        { name: "baseGas", type: "uint256" },
        { name: "gasPrice", type: "uint256" },
        { name: "gasToken", type: "address" },
        { name: "refundReceiver", type: "address" },
        { name: "nonce", type: "uint256" },
      ],
    },
    domain: safeTx.domain || {
      chainId: safeTx.chainId,
      verifyingContract: safeTx.safe,
    },
    primaryType: "SafeTx",
    message: {
      to: safeTx.to,
      value: safeTx.value || 0,
      data: safeTx.data || "0x",
      operation: safeTx.operation || 0,
      safeTxGas: safeTx.safeTxGas || 0,
      baseGas: safeTx.baseGas || 0,
      gasPrice: safeTx.gasPrice || 0,
      gasToken: safeTx.gasToken || "0x0000000000000000000000000000000000000000",
      refundReceiver: safeTx.refundReceiver || "0x0000000000000000000000000000000000000000",
      nonce: safeTx.nonce || 0,
    },
  };
}
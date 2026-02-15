// src/tronWeb/utils/eip712.ts
import { keccak256 } from "viem";

// src/tronWeb/utils/hex.ts
function to0x(hex) {
  return `0x${strip0x(hex).toLowerCase()}`;
}
function strip0x(hex) {
  if (typeof hex !== "string") return String(hex ?? "");
  const value = hex.trim();
  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}
function normalizeHex(value) {
  if (typeof value !== "string") return "0x";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "0x" || trimmed === "0X") return "0x";
  return `0x${strip0x(trimmed)}`;
}

// src/tronWeb/utils/eip712.ts
var EIP712_DOMAIN_TYPE = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
  { name: "salt", type: "bytes32" }
];
function encodeType(typeName, types) {
  const fields = types[typeName];
  if (!fields) {
    throw new Error(`Type ${typeName} not found in types`);
  }
  const encoded = fields.map((field) => `${field.type} ${field.name}`).join(",");
  return `${typeName}(${encoded})`;
}
function getDependencies(typeName, types, found = /* @__PURE__ */ new Set()) {
  if (found.has(typeName)) return found;
  const fields = types[typeName];
  if (!fields) return found;
  found.add(typeName);
  for (const field of fields) {
    const fieldType = field.type.replace(/\[.*\]$/, "");
    if (types[fieldType] && !found.has(fieldType)) {
      getDependencies(fieldType, types, found);
    }
  }
  return found;
}
function encodeTypeWithDeps(typeName, types) {
  const deps = getDependencies(typeName, types);
  const sorted = Array.from(deps).sort();
  const primary = sorted.splice(sorted.indexOf(typeName), 1)[0];
  const encoded = [primary, ...sorted].map((type) => encodeType(type, types)).join("");
  return encoded;
}
function hashType(typeName, types) {
  const encoded = encodeTypeWithDeps(typeName, types);
  return keccak256(`0x${Buffer.from(encoded).toString("hex")}`);
}
function encodeValue(type, value, types) {
  if (type === "string" || type === "bytes") {
    return keccak256(`0x${Buffer.from(value).toString("hex")}`);
  }
  if (type.startsWith("bytes")) {
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
    const elementType = type.slice(0, -2);
    const encoded = value.map((v) => encodeValue(elementType, v, types));
    const concatenated = encoded.join("");
    return keccak256(`0x${concatenated}`);
  }
  if (type.includes("[")) {
    const match = type.match(/^(.+)\[(\d+)\]$/);
    if (!match) throw new Error(`Invalid array type: ${type}`);
    const [, elementType, size] = match;
    const encoded = value.slice(0, parseInt(size)).map((v) => encodeValue(elementType, v, types));
    return encoded.join("");
  }
  if (types[type]) {
    return hashStruct(type, value, types);
  }
  throw new Error(`Unsupported type: ${type}`);
}
function hashStruct(typeName, data, types) {
  const fields = types[typeName];
  if (!fields) {
    throw new Error(`Type ${typeName} not found`);
  }
  const typeHash = hashType(typeName, types);
  const encodedValues = fields.map((field) => {
    const value = data[field.name];
    if (value === void 0 || value === null) {
      return "0".padStart(64, "0");
    }
    return encodeValue(field.type, value, types);
  });
  const encoded = typeHash + encodedValues.join("");
  return keccak256(`0x${encoded}`);
}
function hashDomain(domain, types) {
  const domainType = [];
  const domainData = {};
  for (const field of EIP712_DOMAIN_TYPE) {
    const value = domain[field.name];
    if (value !== void 0) {
      domainType.push(field);
      domainData[field.name] = value;
    }
  }
  const extendedTypes = { ...types, EIP712Domain: domainType };
  return hashStruct("EIP712Domain", domainData, extendedTypes);
}
function createEIP712Digest(typedData) {
  const domainSeparator = hashDomain(typedData.domain, typedData.types);
  const messageHash = hashStruct(typedData.primaryType, typedData.message, typedData.types);
  const prefix = "1901";
  const digest = keccak256(`0x${prefix}${strip0x(domainSeparator)}${strip0x(messageHash)}`);
  return digest;
}
function parseTypedData(data) {
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  if (!parsed.types || !parsed.domain || !parsed.primaryType || !parsed.message) {
    throw new Error("Invalid typed data: missing required fields");
  }
  const types = { ...parsed.types };
  delete types.EIP712Domain;
  return {
    domain: parsed.domain,
    types,
    primaryType: parsed.primaryType,
    message: parsed.message
  };
}
function formatSafeTransaction(safeTx) {
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
        { name: "nonce", type: "uint256" }
      ]
    },
    domain: safeTx.domain || {
      chainId: safeTx.chainId,
      verifyingContract: safeTx.safe
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
      nonce: safeTx.nonce || 0
    }
  };
}

export {
  to0x,
  strip0x,
  normalizeHex,
  createEIP712Digest,
  parseTypedData,
  formatSafeTransaction
};

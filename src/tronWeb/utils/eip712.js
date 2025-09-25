"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEIP712Digest = createEIP712Digest;
exports.parseTypedData = parseTypedData;
exports.formatSafeTransaction = formatSafeTransaction;
var viem_1 = require("viem");
var hex_1 = require("./hex");
// EIP-712 constants
var EIP712_DOMAIN_TYPE = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
    { name: "salt", type: "bytes32" },
];
/**
 * Encode a single type for EIP-712
 */
function encodeType(typeName, types) {
    var fields = types[typeName];
    if (!fields) {
        throw new Error("Type ".concat(typeName, " not found in types"));
    }
    var encoded = fields
        .map(function (field) { return "".concat(field.type, " ").concat(field.name); })
        .join(",");
    return "".concat(typeName, "(").concat(encoded, ")");
}
/**
 * Get all dependencies of a type (including nested types)
 */
function getDependencies(typeName, types, found) {
    if (found === void 0) { found = new Set(); }
    if (found.has(typeName))
        return found;
    var fields = types[typeName];
    if (!fields)
        return found;
    found.add(typeName);
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var field = fields_1[_i];
        var fieldType = field.type.replace(/\[.*\]$/, ""); // Remove array brackets
        if (types[fieldType] && !found.has(fieldType)) {
            getDependencies(fieldType, types, found);
        }
    }
    return found;
}
/**
 * Encode type with all its dependencies
 */
function encodeTypeWithDeps(typeName, types) {
    var deps = getDependencies(typeName, types);
    var sorted = Array.from(deps).sort();
    var primary = sorted.splice(sorted.indexOf(typeName), 1)[0];
    var encoded = __spreadArray([primary], sorted, true).map(function (type) { return encodeType(type, types); })
        .join("");
    return encoded;
}
/**
 * Hash a type for EIP-712
 */
function hashType(typeName, types) {
    var encoded = encodeTypeWithDeps(typeName, types);
    return (0, viem_1.keccak256)("0x".concat(Buffer.from(encoded).toString("hex")));
}
/**
 * Encode a value according to its type
 */
function encodeValue(type, value, types) {
    if (type === "string" || type === "bytes") {
        return (0, viem_1.keccak256)("0x".concat(Buffer.from(value).toString("hex")));
    }
    if (type.startsWith("bytes")) {
        // Fixed-size bytes
        var hex = (0, hex_1.strip0x)(value);
        return hex.padEnd(64, "0");
    }
    if (type === "bool") {
        return value ? "0".padStart(63, "0") + "1" : "0".padStart(64, "0");
    }
    if (type.startsWith("uint") || type.startsWith("int")) {
        var num = BigInt(value);
        var hex = num.toString(16);
        if (type.startsWith("int") && num < 0n) {
            // Two's complement for negative numbers
            var bits = parseInt(type.replace(/[^0-9]/g, "") || "256");
            var max = Math.pow(2n, BigInt(bits));
            return (max + num).toString(16).padStart(64, "0");
        }
        return hex.padStart(64, "0");
    }
    if (type === "address") {
        return (0, hex_1.strip0x)(value).toLowerCase().padStart(64, "0");
    }
    if (type.endsWith("[]")) {
        // Dynamic array
        var elementType_1 = type.slice(0, -2);
        var encoded = value.map(function (v) { return encodeValue(elementType_1, v, types); });
        var concatenated = encoded.join("");
        return (0, viem_1.keccak256)("0x".concat(concatenated));
    }
    if (type.includes("[")) {
        // Fixed-size array
        var match = type.match(/^(.+)\[(\d+)\]$/);
        if (!match)
            throw new Error("Invalid array type: ".concat(type));
        var elementType_2 = match[1], size = match[2];
        var encoded = value
            .slice(0, parseInt(size))
            .map(function (v) { return encodeValue(elementType_2, v, types); });
        return encoded.join("");
    }
    if (types[type]) {
        // Custom struct type
        return hashStruct(type, value, types);
    }
    throw new Error("Unsupported type: ".concat(type));
}
/**
 * Hash a struct for EIP-712
 */
function hashStruct(typeName, data, types) {
    var fields = types[typeName];
    if (!fields) {
        throw new Error("Type ".concat(typeName, " not found"));
    }
    var typeHash = hashType(typeName, types);
    var encodedValues = fields.map(function (field) {
        var value = data[field.name];
        if (value === undefined || value === null) {
            return "0".padStart(64, "0");
        }
        return encodeValue(field.type, value, types);
    });
    var encoded = typeHash + encodedValues.join("");
    return (0, viem_1.keccak256)("0x".concat(encoded));
}
/**
 * Create domain separator hash for EIP-712
 */
function hashDomain(domain, types) {
    var domainType = [];
    var domainData = {};
    // Only include fields that are present in the domain
    for (var _i = 0, EIP712_DOMAIN_TYPE_1 = EIP712_DOMAIN_TYPE; _i < EIP712_DOMAIN_TYPE_1.length; _i++) {
        var field = EIP712_DOMAIN_TYPE_1[_i];
        var value = domain[field.name];
        if (value !== undefined) {
            domainType.push(field);
            domainData[field.name] = value;
        }
    }
    // Add the domain type to types temporarily
    var extendedTypes = __assign(__assign({}, types), { EIP712Domain: domainType });
    return hashStruct("EIP712Domain", domainData, extendedTypes);
}
/**
 * Create the final EIP-712 digest to sign
 */
function createEIP712Digest(typedData) {
    var domainSeparator = hashDomain(typedData.domain, typedData.types);
    var messageHash = hashStruct(typedData.primaryType, typedData.message, typedData.types);
    // Final digest: keccak256("\x19\x01" + domainSeparator + messageHash)
    var prefix = "1901";
    var digest = (0, viem_1.keccak256)("0x".concat(prefix).concat((0, hex_1.strip0x)(domainSeparator)).concat((0, hex_1.strip0x)(messageHash)));
    return digest;
}
/**
 * Parse and validate typed data
 */
function parseTypedData(data) {
    var parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (!parsed.types || !parsed.domain || !parsed.primaryType || !parsed.message) {
        throw new Error("Invalid typed data: missing required fields");
    }
    // Remove EIP712Domain from types if present (it's handled separately)
    var types = __assign({}, parsed.types);
    delete types.EIP712Domain;
    return {
        domain: parsed.domain,
        types: types,
        primaryType: parsed.primaryType,
        message: parsed.message,
    };
}
/**
 * Format Safe transaction for EIP-712
 */
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

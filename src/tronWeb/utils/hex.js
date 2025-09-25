"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHex = toHex;
exports.to0x = to0x;
exports.strip0x = strip0x;
exports.normalizeHex = normalizeHex;
function toHex(v) {
    var b = typeof v === "bigint" ? v : v == null ? BigInt(0) : BigInt(v);
    return "0x".concat(b.toString(16));
}
function to0x(hex) {
    return "0x".concat(strip0x(hex).toLowerCase());
}
function strip0x(hex) {
    if (typeof hex !== "string")
        return String(hex !== null && hex !== void 0 ? hex : "");
    var value = hex.trim();
    return value.startsWith("0x") || value.startsWith("0X")
        ? value.slice(2)
        : value;
}
function normalizeHex(value) {
    if (typeof value !== "string")
        return "0x";
    var trimmed = value.trim();
    if (trimmed === "" || trimmed === "0x" || trimmed === "0X")
        return "0x";
    return "0x".concat(strip0x(trimmed));
}

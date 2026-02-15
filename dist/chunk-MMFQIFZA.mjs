import {
  __require
} from "./chunk-Y6FXYEAI.mjs";

// src/tronWeb/utils/ethereum-compatible-signing.ts
async function signWithEthereumPrefix(tw, message) {
  const messageBytes = typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
  const prefix = "Ethereum Signed Message:\n";
  const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, "utf8"),
    Buffer.from(messageBytes.length.toString(), "utf8"),
    messageBytes
  ]);
  const signature = await tw.trx.signMessageV2(prefixedMessage);
  return ensureEthereumSignatureFormat(signature);
}
function ensureEthereumSignatureFormat(signature, vOffset = 0) {
  const sigBytes = Buffer.from(signature.replace("0x", ""), "hex");
  if (sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: ${sigBytes.length} bytes (expected 65)`);
  }
  const r = sigBytes.slice(0, 32);
  const s = sigBytes.slice(32, 64);
  let v = sigBytes[64];
  if (v < 27) {
    v += 27;
  }
  v += vOffset;
  const formattedSig = Buffer.concat([r, s, Buffer.from([v])]);
  return "0x" + formattedSig.toString("hex");
}
function createEthereumMessageHash(message) {
  const messageBytes = typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
  const prefix = "Ethereum Signed Message:\n";
  const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, "utf8"),
    Buffer.from(messageBytes.length.toString(), "utf8"),
    messageBytes
  ]);
  const { keccak256 } = __require("viem");
  return keccak256(`0x${prefixedMessage.toString("hex")}`);
}
var DEFAULT_COMPATIBILITY_CONFIG = {
  useEthereumPrefix: false,
  // Use native Tron signing by default
  adjustVValue: true,
  vValueOffset: 0,
  // Standard Ethereum format (v = 27/28)
  supportDualVerification: false
};
async function signMessageWithConfig(tw, message, config = DEFAULT_COMPATIBILITY_CONFIG) {
  const vOffset = config.vValueOffset ?? 0;
  if (config.useEthereumPrefix) {
    const sig = await signWithEthereumPrefix(tw, message);
    if (vOffset !== 0) {
      return ensureEthereumSignatureFormat(sig, vOffset);
    }
    return sig;
  } else {
    const messageBytes = typeof message === "string" ? Buffer.from(message, "utf8") : Buffer.from(message);
    const signature = await tw.trx.signMessageV2(messageBytes);
    if (config.adjustVValue) {
      return ensureEthereumSignatureFormat(signature, vOffset);
    }
    if (vOffset !== 0) {
      return ensureEthereumSignatureFormat(signature, vOffset);
    }
    return signature;
  }
}
function isEthereumCompatibleSignature(signature) {
  try {
    const sigBytes = Buffer.from(signature.replace("0x", ""), "hex");
    if (sigBytes.length !== 65) {
      return false;
    }
    const v = sigBytes[64];
    return v === 27 || v === 28;
  } catch {
    return false;
  }
}
function extractSignatureComponents(signature) {
  const sigBytes = Buffer.from(signature.replace("0x", ""), "hex");
  if (sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: ${sigBytes.length}`);
  }
  return {
    r: "0x" + sigBytes.slice(0, 32).toString("hex"),
    s: "0x" + sigBytes.slice(32, 64).toString("hex"),
    v: sigBytes[64]
  };
}

export {
  signWithEthereumPrefix,
  ensureEthereumSignatureFormat,
  createEthereumMessageHash,
  DEFAULT_COMPATIBILITY_CONFIG,
  signMessageWithConfig,
  isEthereumCompatibleSignature,
  extractSignatureComponents
};

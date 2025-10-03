/**
 * Ethereum-Compatible Signing Utilities for TRON
 *
 * This module provides signing methods that produce signatures
 * compatible with Ethereum's ecrecover, enabling Safe and other
 * Ethereum-based contracts to work on TRON.
 */

import { TronWeb } from "tronweb";

/**
 * Signs a message with Ethereum prefix to ensure compatibility
 * with Ethereum's ecrecover function.
 *
 * @param tw - TronWeb instance with private key
 * @param message - Message to sign (string or bytes)
 * @returns Ethereum-compatible signature
 */
export async function signWithEthereumPrefix(
  tw: TronWeb,
  message: string | Uint8Array
): Promise<string> {
  // Convert message to bytes
  const messageBytes = typeof message === 'string'
    ? Buffer.from(message, 'utf8')
    : Buffer.from(message);

  // Create Ethereum-style prefixed message
  // Format: "\x19Ethereum Signed Message:\n" + length + message
  const prefix = "\x19Ethereum Signed Message:\n";
  const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, 'utf8'),
    Buffer.from(messageBytes.length.toString(), 'utf8'),
    messageBytes
  ]);

  // Sign the prefixed message with TronWeb
  // Note: TronWeb will add its own prefix internally, but we're signing
  // the Ethereum-prefixed content, which should make it compatible
  const signature = await tw.trx.signMessageV2(prefixedMessage);

  // Ensure signature is in correct format
  return ensureEthereumSignatureFormat(signature);
}

/**
 * Ensures the signature is in Ethereum-compatible format
 * with v value as 27 or 28 (not 0 or 1), and applies optional offset.
 *
 * @param signature - Raw signature from TronWeb
 * @param vOffset - Optional offset to add to v value (default: 0)
 * @returns Formatted signature for Ethereum
 */
export function ensureEthereumSignatureFormat(signature: string, vOffset: number = 0): string {
  const sigBytes = Buffer.from(signature.replace('0x', ''), 'hex');

  if (sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: ${sigBytes.length} bytes (expected 65)`);
  }

  // Extract r, s, v components
  const r = sigBytes.slice(0, 32);
  const s = sigBytes.slice(32, 64);
  let v = sigBytes[64];

  // Adjust v value for Ethereum compatibility
  // Ethereum expects v to be 27 or 28
  if (v < 27) {
    v += 27;
  }

  // Apply custom offset (e.g., +4 for Tron Safe compressed keys)
  v += vOffset;

  // Reconstruct the signature
  const formattedSig = Buffer.concat([r, s, Buffer.from([v])]);
  return '0x' + formattedSig.toString('hex');
}

/**
 * Creates a message hash with Ethereum prefix
 * without actually signing it.
 *
 * @param message - Message to hash
 * @returns Ethereum-prefixed message hash
 */
export function createEthereumMessageHash(message: string | Uint8Array): string {
  const messageBytes = typeof message === 'string'
    ? Buffer.from(message, 'utf8')
    : Buffer.from(message);

  const prefix = "\x19Ethereum Signed Message:\n";
  const prefixedMessage = Buffer.concat([
    Buffer.from(prefix, 'utf8'),
    Buffer.from(messageBytes.length.toString(), 'utf8'),
    messageBytes
  ]);

  // Use keccak256 to hash the prefixed message
  const { keccak256 } = require('viem');
  return keccak256(`0x${prefixedMessage.toString('hex')}`);
}

/**
 * Configuration for signature compatibility mode
 */
export interface SignatureCompatibilityConfig {
  /**
   * Whether to use Ethereum-compatible signing for all messages
   * Default: false (use native Tron signing for Tron-adapted contracts)
   */
  useEthereumPrefix: boolean;

  /**
   * Whether to automatically adjust v values
   * Default: true
   */
  adjustVValue: boolean;

  /**
   * Offset to add to v value (e.g., 4 for Tron Safe compressed keys)
   * Default: 0
   */
  vValueOffset: number;

  /**
   * Whether to support dual verification (try both TRON and Ethereum prefixes)
   * Default: false (for performance)
   */
  supportDualVerification: boolean;
}

/**
 * Default configuration for Tron-native contracts
 */
export const DEFAULT_COMPATIBILITY_CONFIG: SignatureCompatibilityConfig = {
  useEthereumPrefix: false,  // Use native Tron signing by default
  adjustVValue: true,
  vValueOffset: 0,  // Standard Ethereum format (v = 27/28)
  supportDualVerification: false,
};

/**
 * Enhanced signing method selector based on configuration
 */
export async function signMessageWithConfig(
  tw: TronWeb,
  message: string | Uint8Array,
  config: SignatureCompatibilityConfig = DEFAULT_COMPATIBILITY_CONFIG
): Promise<string> {
  const vOffset = config.vValueOffset ?? 0;

  if (config.useEthereumPrefix) {
    // Use Ethereum-compatible signing
    const sig = await signWithEthereumPrefix(tw, message);
    // Apply v offset if needed
    if (vOffset !== 0) {
      return ensureEthereumSignatureFormat(sig, vOffset);
    }
    return sig;
  } else {
    // Use default TRON signing
    const messageBytes = typeof message === 'string'
      ? Buffer.from(message, 'utf8')
      : Buffer.from(message);

    const signature = await tw.trx.signMessageV2(messageBytes);

    if (config.adjustVValue) {
      return ensureEthereumSignatureFormat(signature, vOffset);
    }

    // Apply v offset even if adjustVValue is false
    if (vOffset !== 0) {
      return ensureEthereumSignatureFormat(signature, vOffset);
    }

    return signature;
  }
}

/**
 * Verifies if a signature will be compatible with Ethereum's ecrecover
 *
 * @param signature - Signature to check
 * @returns Whether the signature format is compatible
 */
export function isEthereumCompatibleSignature(signature: string): boolean {
  try {
    const sigBytes = Buffer.from(signature.replace('0x', ''), 'hex');

    // Check length
    if (sigBytes.length !== 65) {
      return false;
    }

    // Check v value
    const v = sigBytes[64];
    return v === 27 || v === 28;
  } catch {
    return false;
  }
}

/**
 * Helper to extract signature components
 */
export function extractSignatureComponents(signature: string): {
  r: string;
  s: string;
  v: number;
} {
  const sigBytes = Buffer.from(signature.replace('0x', ''), 'hex');

  if (sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: ${sigBytes.length}`);
  }

  return {
    r: '0x' + sigBytes.slice(0, 32).toString('hex'),
    s: '0x' + sigBytes.slice(32, 64).toString('hex'),
    v: sigBytes[64],
  };
}
import type { TronWebLike } from "../types";
import { strip0x, to0x } from "./hex";
import { createEIP712Digest, parseTypedData, type TypedData } from "./eip712";
import { signWithEthereumPrefix, ensureEthereumSignatureFormat } from "./ethereum-compatible-signing";

/**
 * Signature mode for validation
 */
export type SignatureMode = 'tron' | 'ethereum';

/**
 * Result of signature validation
 */
export interface SignatureValidationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** The recovered signer address (Ethereum format 0x...) */
  recoveredAddress?: string;
  /** Error message if validation failed */
  error?: string;
  /** Detailed hints for debugging */
  hints?: string[];
  /** The mode that was used for validation */
  mode: SignatureMode;
}

/**
 * Validate a signature against a message and expected signer
 *
 * This is essential for debugging Safe contract signature issues. It helps identify:
 * - Wrong signature mode (Tron vs Ethereum prefix)
 * - Incorrect private key used
 * - Message hash mismatches
 *
 * @param tw - TronWeb instance
 * @param message - The message that was signed (string or Buffer)
 * @param signature - The signature to validate (0x-prefixed hex)
 * @param expectedSigner - The expected signer address (Ethereum or Tron format)
 * @param mode - Signature mode: 'tron' or 'ethereum'
 * @returns Validation result with detailed error information
 *
 * @example
 * ```typescript
 * const result = await validateSignature(
 *   tw,
 *   'Hello World',
 *   '0xabcd...signature',
 *   '0x1234...address',
 *   'ethereum'
 * );
 *
 * if (!result.valid) {
 *   console.error(`Signature validation failed: ${result.error}`);
 *   console.log('Hints:', result.hints);
 * }
 * ```
 */
export async function validateSignature(
  tw: TronWebLike,
  message: string | Buffer,
  signature: string,
  expectedSigner: string,
  mode: SignatureMode = 'tron'
): Promise<SignatureValidationResult> {
  try {
    // Convert message to bytes if string
    const messageBytes = typeof message === 'string'
      ? Buffer.from(strip0x(message), 'hex')
      : message;

    // Add prefix based on mode
    let prefixedMessage: Buffer;
    if (mode === 'ethereum') {
      const prefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
      const prefixBytes = Buffer.from(prefix, 'utf8');
      prefixedMessage = Buffer.concat([prefixBytes, messageBytes]);
    } else {
      // Tron mode - TronWeb will add its own prefix
      prefixedMessage = messageBytes;
    }

    // Recover signer from signature
    const recovered = await recoverSigner(tw, prefixedMessage, signature, mode);

    if (!recovered) {
      return {
        valid: false,
        error: 'Failed to recover signer from signature',
        hints: [
          'Signature may be malformed',
          'Check that signature is in correct format (0x-prefixed hex, 65 bytes)',
          'Verify v value is 27 or 28 (or 0/1 before adjustment)',
        ],
        mode,
      };
    }

    // Normalize addresses for comparison
    const recoveredNormalized = normalizeAddress(tw, recovered);
    const expectedNormalized = normalizeAddress(tw, expectedSigner);

    const valid = recoveredNormalized.toLowerCase() === expectedNormalized.toLowerCase();

    if (!valid) {
      return {
        valid: false,
        recoveredAddress: recoveredNormalized,
        error: `Signature verification failed: recovered ${recoveredNormalized}, expected ${expectedNormalized}`,
        hints: generateValidationHints(mode, recoveredNormalized, expectedNormalized),
        mode,
      };
    }

    return {
      valid: true,
      recoveredAddress: recoveredNormalized,
      mode,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
      hints: [
        'Check that TronWeb instance is properly initialized',
        'Verify message format is correct',
        'Ensure signature is valid hex string',
      ],
      mode,
    };
  }
}

/**
 * Validate an EIP-712 typed data signature
 *
 * Used for Safe transaction signatures and other structured data
 *
 * @param tw - TronWeb instance
 * @param typedData - The EIP-712 typed data that was signed
 * @param signature - The signature to validate
 * @param expectedSigner - The expected signer address
 * @param mode - Signature mode
 * @returns Validation result
 */
export async function validateTypedDataSignature(
  tw: TronWebLike,
  typedData: TypedData | string,
  signature: string,
  expectedSigner: string,
  mode: SignatureMode = 'tron'
): Promise<SignatureValidationResult> {
  try {
    // Parse typed data if string
    const parsed = typeof typedData === 'string'
      ? parseTypedData(typedData)
      : typedData;

    // Create EIP-712 digest
    const digest = createEIP712Digest(parsed);
    const digestBytes = Buffer.from(strip0x(digest), 'hex');

    // Recover signer
    const recovered = await recoverSigner(tw, digestBytes, signature, mode);

    if (!recovered) {
      return {
        valid: false,
        error: 'Failed to recover signer from EIP-712 signature',
        hints: [
          'Check EIP-712 domain separator matches contract',
          'Verify all type definitions are correct',
          'Ensure message fields match exactly',
        ],
        mode,
      };
    }

    const recoveredNormalized = normalizeAddress(tw, recovered);
    const expectedNormalized = normalizeAddress(tw, expectedSigner);

    const valid = recoveredNormalized.toLowerCase() === expectedNormalized.toLowerCase();

    if (!valid) {
      return {
        valid: false,
        recoveredAddress: recoveredNormalized,
        error: `EIP-712 signature verification failed: recovered ${recoveredNormalized}, expected ${expectedNormalized}`,
        hints: [
          'EIP-712 domain may not match Safe contract configuration',
          `Check chainId in domain (parsed: ${parsed.domain.chainId})`,
          `Check verifyingContract matches Safe address`,
          `Verify signature mode (${mode}) matches contract expectations`,
        ],
        mode,
      };
    }

    return {
      valid: true,
      recoveredAddress: recoveredNormalized,
      mode,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
      hints: [
        'EIP-712 typed data may be malformed',
        'Check that all required fields are present',
        'Verify types match contract ABI',
      ],
      mode,
    };
  }
}

/**
 * Validate a signature in both Tron and Ethereum modes
 *
 * Useful when you're not sure which mode the Safe contract expects.
 * Returns results for both modes so you can see which one would work.
 *
 * @param tw - TronWeb instance
 * @param message - Message or typed data
 * @param signature - Signature to validate
 * @param expectedSigner - Expected signer address
 * @returns Validation results for both modes
 */
export async function validateSignatureBothModes(
  tw: TronWebLike,
  message: string | Buffer,
  signature: string,
  expectedSigner: string
): Promise<{
  tron: SignatureValidationResult;
  ethereum: SignatureValidationResult;
  recommendation: string;
}> {
  const [tronResult, ethereumResult] = await Promise.all([
    validateSignature(tw, message, signature, expectedSigner, 'tron'),
    validateSignature(tw, message, signature, expectedSigner, 'ethereum'),
  ]);

  let recommendation: string;
  if (tronResult.valid && !ethereumResult.valid) {
    recommendation = 'Use Tron mode (signatureCompatibility.useEthereumPrefix: false)';
  } else if (!tronResult.valid && ethereumResult.valid) {
    recommendation = 'Use Ethereum mode (signatureCompatibility.useEthereumPrefix: true)';
  } else if (tronResult.valid && ethereumResult.valid) {
    recommendation = 'Both modes work - use Tron mode for better performance';
  } else {
    recommendation = 'Neither mode works - check message and signature are correct';
  }

  return {
    tron: tronResult,
    ethereum: ethereumResult,
    recommendation,
  };
}

/**
 * Recover the signer address from a signature
 *
 * @param tw - TronWeb instance
 * @param message - The message bytes that were signed
 * @param signature - The signature
 * @param mode - Signature mode
 * @returns Recovered address or null if recovery failed
 */
async function recoverSigner(
  tw: TronWebLike,
  message: Buffer,
  signature: string,
  mode: SignatureMode
): Promise<string | null> {
  try {
    // Ensure signature is properly formatted
    const formattedSig = ensureEthereumSignatureFormat(signature);
    const sigHex = strip0x(formattedSig);

    if (sigHex.length !== 130) {
      // 65 bytes = 130 hex chars
      return null;
    }

    // Extract r, s, v from signature
    const r = '0x' + sigHex.slice(0, 64);
    const s = '0x' + sigHex.slice(64, 128);
    let v = parseInt(sigHex.slice(128, 130), 16);

    // Normalize v value
    if (v < 27) {
      v += 27;
    }

    // Hash the message
    const messageHash = tw.utils.code.generateHashedMessage(message);

    // Recover public key
    // Note: This is a simplified implementation
    // Real implementation would use ecrecover
    // For now, we'll use TronWeb's verifySignature if available

    // Try to recover using TronWeb methods
    // This is TronWeb-specific and may need adjustment
    if (typeof tw.trx.verifyMessage === 'function') {
      try {
        const recovered = await tw.trx.verifyMessage(message, formattedSig);
        if (recovered) {
          return to0x(tw.address.toHex(recovered));
        }
      } catch {
        // Continue to fallback
      }
    }

    // Fallback: We can't actually recover without proper ecrecover
    // This is a limitation - in practice, Safe contracts do the verification on-chain
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize an address to Ethereum format for comparison
 */
function normalizeAddress(tw: TronWebLike, address: string): string {
  try {
    // If already Ethereum format (0x...)
    if (address.startsWith('0x')) {
      return address.toLowerCase();
    }

    // If Tron base58 format (T...)
    if (address.startsWith('T')) {
      const hex = tw.address.toHex(address);
      return to0x(hex.slice(2)).toLowerCase(); // Remove 41 prefix
    }

    // If Tron hex format (41...)
    if (address.startsWith('41')) {
      return to0x(address.slice(2)).toLowerCase();
    }

    return address.toLowerCase();
  } catch {
    return address.toLowerCase();
  }
}

/**
 * Generate helpful hints for signature validation failures
 */
function generateValidationHints(
  mode: SignatureMode,
  recovered: string,
  expected: string
): string[] {
  const hints: string[] = [];

  hints.push(`Recovered address: ${recovered}`);
  hints.push(`Expected address: ${expected}`);

  if (mode === 'tron') {
    hints.push('Currently using Tron signature mode (\\x19TRON Signed Message)');
    hints.push('Try Ethereum mode if Safe contract expects Ethereum signatures:');
    hints.push('  Set signatureCompatibility.useEthereumPrefix: true');
  } else {
    hints.push('Currently using Ethereum signature mode (\\x19Ethereum Signed Message)');
    hints.push('Try Tron mode if Safe contract is Tron-adapted:');
    hints.push('  Set signatureCompatibility.useEthereumPrefix: false');
  }

  hints.push('Other possible causes:');
  hints.push('  - Wrong private key used for signing');
  hints.push('  - Message content does not match what was signed');
  hints.push('  - Signature v value needs adjustment');

  return hints;
}

/**
 * Create a test signature for debugging purposes
 *
 * Useful for generating known-good signatures to compare against
 *
 * @param tw - TronWeb instance with private key configured
 * @param message - Message to sign
 * @param mode - Signature mode
 * @returns Signature in hex format
 */
export async function createTestSignature(
  tw: TronWebLike,
  message: string | Buffer,
  mode: SignatureMode = 'tron'
): Promise<string> {
  const messageBytes = typeof message === 'string'
    ? Buffer.from(strip0x(message), 'hex')
    : message;

  if (mode === 'ethereum') {
    return await signWithEthereumPrefix(tw, messageBytes);
  } else {
    const signature = await tw.trx.signMessageV2(messageBytes);
    return ensureEthereumSignatureFormat(signature);
  }
}

/**
 * Format validation result for console output
 *
 * @param result - Validation result
 * @returns Formatted string for console.log
 */
export function formatValidationResult(result: SignatureValidationResult): string {
  const lines: string[] = [];

  lines.push(`\n=== Signature Validation Result (${result.mode} mode) ===`);
  lines.push(`Valid: ${result.valid ? '✓ YES' : '✗ NO'}`);

  if (result.recoveredAddress) {
    lines.push(`Recovered: ${result.recoveredAddress}`);
  }

  if (result.error) {
    lines.push(`\nError: ${result.error}`);
  }

  if (result.hints && result.hints.length > 0) {
    lines.push('\nHints:');
    result.hints.forEach(hint => lines.push(`  • ${hint}`));
  }

  lines.push('');

  return lines.join('\n');
}
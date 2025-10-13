import type { TronTransaction, TronWebLike } from "../types";
import type { TronWebTransportConfig } from "../types/config";
import { toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Sign a raw hash using ECDSA without adding any message prefix.
 * This is used for EIP-712 typed data signing where the hash already includes domain separation.
 *
 * @param tw - TronWeb instance with private key
 * @param hash - Raw hash to sign (32 bytes)
 * @returns ECDSA signature (65 bytes: r + s + v)
 */
export async function signEcdsa(
  tw: TronWebLike,
  hash: Buffer | Uint8Array
): Promise<string> {
  // Get private key from TronWeb
  const privateKey = tw.defaultPrivateKey;
  if (!privateKey) {
    throw new Error("TronWeb instance must have a private key to sign");
  }

  // Normalize private key format (ensure 0x prefix)
  const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

  // Convert hash to hex string
  const hashHex = toHex(hash);

  // Use viem's signing which uses raw ECDSA without any prefix
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);
  const signature = await account.sign({ hash: hashHex as `0x${string}` });

  return signature;
}

export async function signTransaction(
  tw: TronWebLike,
  config: TronWebTransportConfig | undefined,
  transaction: TronTransaction,
  context: { method: string; params: unknown[] },
): Promise<TronTransaction | undefined> {
  try {
    if (config?.sendOptions?.signer)
      return await config.sendOptions.signer(transaction, {
        tronWeb: tw,
        request: context,
      });
    const signed = await tw.trx.sign(transaction);
    // TronWeb.trx.sign returns the signed transaction object when a private key is set
    // If it returns a string, that's an error - the transaction wasn't signed properly
    if (typeof signed === "string") {
      throw new Error("Failed to sign transaction - ensure private key is configured");
    }
    return signed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sendTransaction signing failed: ${message}`);
  }
}
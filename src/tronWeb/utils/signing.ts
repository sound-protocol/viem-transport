import type { TronTransaction, TronWebLike } from "../types";
import type { TronWebTransportConfig } from "../types/config";

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
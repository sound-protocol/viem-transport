// src/tronWeb/utils/signing.ts
import { toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
async function signEcdsa(tw, hash) {
  const privateKey = tw.defaultPrivateKey;
  if (!privateKey) {
    throw new Error("TronWeb instance must have a private key to sign");
  }
  const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const hashHex = toHex(hash);
  const account = privateKeyToAccount(normalizedKey);
  const signature = await account.sign({ hash: hashHex });
  return signature;
}
async function signTransaction(tw, config, transaction, context) {
  try {
    if (config?.sendOptions?.signer)
      return await config.sendOptions.signer(transaction, {
        tronWeb: tw,
        request: context
      });
    const signed = await tw.trx.sign(transaction);
    if (typeof signed === "string") {
      throw new Error("Failed to sign transaction - ensure private key is configured");
    }
    return signed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sendTransaction signing failed: ${message}`);
  }
}

export {
  signEcdsa,
  signTransaction
};

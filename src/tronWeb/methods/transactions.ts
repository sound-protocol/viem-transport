import type { MethodHandler } from "./types";
import type { TronTransaction } from "../types";
import { strip0x, to0x, toHex } from "../utils/hex";
import { normalizeReceipt, extractFromAddress, extractToAddress, extractValue, extractInputData } from "../utils/transactions";
import { assertAddress, resolveFromAddress, tronBase58FromEvm } from "../utils/address";
import { toSun, resolveFeeLimit, toOptionalNumber } from "../utils/numeric";
import { isPlainObject } from "../utils/validation";
import { extractTronErrorMessage } from "../utils/errors";
import { parseCallData, convertParamsToTron } from "../abi/parser";
import { signTransaction } from "../utils/signing";
import { DEFAULT_FEE_LIMIT } from "../constants";
import {
  signWithEthereumPrefix,
  ensureEthereumSignatureFormat,
  DEFAULT_COMPATIBILITY_CONFIG,
  SignatureCompatibilityConfig
} from "../utils/ethereum-compatible-signing";

export const eth_sendRawTransaction: MethodHandler = async (params, { tw }) => {
  const raw = strip0x(params[0] as string);
  const res = await tw.trx.sendRawTransaction(raw);
  const txid = res?.txid ?? res?.transaction?.txID;
  if (!txid) throw new Error("sendRawTransaction: unexpected response");
  return to0x(txid);
};

export const eth_getTransactionReceipt: MethodHandler = async (params, { tw }) => {
  const txid = strip0x(params[0] as string);
  const info = await tw.trx.getTransactionInfo(txid);
  return info ? normalizeReceipt(tw, info) : null;
};

export const eth_getTransaction: MethodHandler = async (params, { tw, getChainIdHex }) => {
  const txid = strip0x(params[0] as string);

  if (!txid) {
    return null;
  }

  try {
    // Get transaction details
    const tx = await tw.trx.getTransaction(txid);

    if (!tx) return null;

    // Get additional info for block details
    const info = await tw.trx.getTransactionInfo(txid);

    // Extract transaction details
    const from = extractFromAddress(tw, tx);
    const to = extractToAddress(tw, tx);
    const value = extractValue(tw, tx);
    const input = extractInputData(tw, tx);

    // Convert to Ethereum transaction format
    return {
      blockHash: info?.blockHash ? to0x(info.blockHash) : null,
      blockNumber: info?.blockNumber != null ? toHex(info.blockNumber) : null,
      from: from ?? "0x0000000000000000000000000000000000000000",
      gas: toHex(tx.raw_data?.fee_limit ?? DEFAULT_FEE_LIMIT),
      gasPrice: toHex(1), // Tron doesn't use gas price in the same way
      hash: to0x(txid),
      input: input ?? "0x",
      nonce: toHex(0), // Tron doesn't use nonces
      to: to,
      transactionIndex: info?.transactionIndex != null ? toHex(info.transactionIndex) : "0x0",
      value: toHex(value),
      v: "0x0", // Signature values not directly available
      r: "0x0",
      s: "0x0",
      type: "0x0", // Legacy transaction type
      accessList: [],
      chainId: getChainIdHex()
    };
  } catch (error) {
    return null;
  }
};

export const eth_getTransactionByHash: MethodHandler = eth_getTransaction;

export const eth_sendTransaction: MethodHandler = async (params, { tw, config }) => {
  const txRequest = params[0];

  if (!isPlainObject(txRequest))
    throw new Error("eth_sendTransaction param[0] must be an object.");

  const sender = resolveFromAddress(tw, config, txRequest.from, {
    method: "eth_sendTransaction",
    property: "transaction.from",
    allowZeroFallback: false,
  });

  const feeLimit = resolveFeeLimit(
    config?.sendOptions?.feeLimit,
    DEFAULT_FEE_LIMIT,
    "sendOptions.feeLimit",
  );
  const valueSun = toSun(txRequest.value, "transaction.value");
  const dataHex = txRequest.data ?? txRequest.input;
  const normalizedDataHex = typeof dataHex === "string" ? `0x${strip0x(dataHex)}` : "0x";
  const hasData = strip0x(normalizedDataHex).length > 0;
  const permissionId = toOptionalNumber(txRequest.permissionId);

  let transaction: TronTransaction;

  if (hasData) {
    const toValue = txRequest.to;
    if (!toValue)
      throw new Error(
        "eth_sendTransaction transaction.to is required for contract execution on Tron transport.",
      );
    const toAddress = assertAddress(tw, toValue, {
      method: "eth_sendTransaction",
      parameter: 0,
      property: "transaction.to",
    });
    const contractBase58 = tronBase58FromEvm(tw, toAddress);
    const options: Record<string, any> = { feeLimit };
    if (permissionId != null) options.permissionId = permissionId;
    if (valueSun > 0) options.callValue = valueSun;

    // Handle Ethereum ABI-encoded data
    const rawParameter = strip0x(normalizedDataHex);
    if (rawParameter.length > 0) {
      // Try to parse the function call data
      const parsedCall = parseCallData(rawParameter);

      if (parsedCall) {
        // Check for complex types (bytes, arrays) that need rawParameter mode
        const hasComplexTypes = parsedCall.functionInfo.params.some(p =>
          p === 'bytes' || p.includes('[]') || p.startsWith('bytes[')
        );

        if (hasComplexTypes) {
          // Complex types: use rawParameter mode for safety and reliability
          // TronWeb handles ABI decoding internally for dynamic types
          if (process.env.DEBUG_TRANSPORT) {
            console.debug(`Function ${parsedCall.functionInfo.signature} has complex types (bytes/arrays), using rawParameter mode`);
          }

          options.rawParameter = rawParameter;
          const trigger = await tw.transactionBuilder.triggerSmartContract(
            contractBase58,
            "",
            options,
            [],
            sender.base58,
          );

          if (!trigger?.transaction || trigger?.result?.result === false) {
            const message = extractTronErrorMessage(trigger);
            const reason = message ?? "failed to build Tron transaction";
            throw new Error(`eth_sendTransaction (complex types) failed: ${reason}`);
          }
          transaction = trigger.transaction;
        } else {
          // Simple types only: use parsed params for better error messages
          const { functionInfo, params } = parsedCall;
          const tronParams = convertParamsToTron(params, tw);

          // Log function call for debugging (if needed)
          if (process.env.DEBUG_TRANSPORT) {
            console.debug(`Calling ${functionInfo.signature} with params:`, tronParams);
          }

          const trigger = await tw.transactionBuilder.triggerSmartContract(
            contractBase58,
            functionInfo.signature,
            options,
            tronParams,
            sender.base58,
          );

          if (!trigger?.transaction || trigger?.result?.result === false) {
            const message = extractTronErrorMessage(trigger);
            const reason = message ?? "failed to build Tron transaction";
            throw new Error(`eth_sendTransaction ${functionInfo.signature} failed: ${reason}`);
          }
          transaction = trigger.transaction;
        }
      } else {
        // Unrecognized function - fall back to raw parameter
        // This allows new functions to still work without explicit support
        options.rawParameter = rawParameter;
        const trigger = await tw.transactionBuilder.triggerSmartContract(
          contractBase58,
          "",
          options,
          [],
          sender.base58,
        );

        if (!trigger?.transaction || trigger?.result?.result === false) {
          const message = extractTronErrorMessage(trigger);
          const reason = message ?? "failed to build Tron transaction";
          throw new Error(`eth_sendTransaction preparation failed: ${reason}`);
        }
        transaction = trigger.transaction;
      }
    } else {
      throw new Error("Contract interaction requires data payload");
    }
  } else {
    if (!txRequest.to)
      throw new Error(
        "eth_sendTransaction transaction.to is required for value transfers on Tron transport.",
      );
    if (valueSun <= 0)
      throw new Error(
        "eth_sendTransaction value must be greater than zero when no data payload is provided on Tron transport.",
      );
    const toAddress = assertAddress(tw, txRequest.to, {
      method: "eth_sendTransaction",
      parameter: 0,
      property: "transaction.to",
    });
    const recipientBase58 = tronBase58FromEvm(tw, toAddress);
    const options: Record<string, any> = { feeLimit };
    if (permissionId != null) options.permissionId = permissionId;
    transaction = await tw.transactionBuilder.sendTrx(
      recipientBase58,
      valueSun,
      sender.base58,
      options,
    );
  }

  const context = { method: "eth_sendTransaction", params };
  const signedTx = await signTransaction(tw, config, transaction, context);
  const preparedTx = signedTx ?? transaction;

  if (
    !preparedTx ||
    !Array.isArray(preparedTx.signature) ||
    preparedTx.signature.length === 0
  )
    throw new Error("eth_sendTransaction signing failed: missing signature.");

  const broadcast = await tw.trx.sendRawTransaction(preparedTx);
  if (!broadcast?.result) {
    const message = extractTronErrorMessage(broadcast);
    const reason = message ?? "broadcast rejected";
    throw new Error(`eth_sendTransaction broadcast failed: ${reason}`);
  }

  const txid =
    typeof broadcast.txid === "string" && broadcast.txid.length > 0
      ? broadcast.txid
      : typeof preparedTx.txID === "string" && preparedTx.txID.length > 0
        ? preparedTx.txID
        : typeof preparedTx.txId === "string" && preparedTx.txId.length > 0
          ? preparedTx.txId
          : undefined;

  if (!txid)
    throw new Error(
      "eth_sendTransaction broadcast succeeded but no transaction id was returned.",
    );

  return to0x(txid);
};

export const eth_sign: MethodHandler = async (params, { tw, config }) => {
  assertAddress(tw, params[0], { method: "eth_sign", parameter: 0 });
  const message = params[1];

  if (!message) {
    throw new Error("eth_sign requires a message to sign");
  }

  try {
    // Convert hex message to bytes if needed
    const messageHex = strip0x(message as string);
    const messageBytes = Buffer.from(messageHex, 'hex');

    // Check if we should use Ethereum-compatible signing (for Safe)
    const useEthereumCompatible = config?.signatureCompatibility?.useEthereumPrefix ??
                                  DEFAULT_COMPATIBILITY_CONFIG.useEthereumPrefix;

    let signature: string;
    if (useEthereumCompatible) {
      // Use Ethereum-compatible signing for Safe compatibility
      signature = await signWithEthereumPrefix(tw, messageBytes);
    } else {
      // Use standard TronWeb signing
      signature = await tw.trx.signMessageV2(messageBytes);
      // Ensure proper format
      signature = ensureEthereumSignatureFormat(signature);
    }

    // Format and return
    if (typeof signature === 'string') {
      return to0x(signature);
    } else if (signature && typeof signature === 'object') {
      const sig = (signature as any).signature || signature;
      return to0x(sig);
    }

    throw new Error('Invalid signature format from TronWeb');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sign failed: ${msg}`);
  }
};

// Personal sign adds Ethereum-specific prefix to messages
export const personal_sign: MethodHandler = async (params, { tw }) => {
  // personal_sign has message first, then address
  const message = params[0];
  const address = params[1];

  assertAddress(tw, address, { method: "personal_sign", parameter: 1 });

  if (!message) {
    throw new Error("personal_sign requires a message to sign");
  }

  try {
    // Convert message to bytes
    const messageStr = typeof message === 'string' ? strip0x(message) : String(message);
    const messageBytes = Buffer.from(messageStr, 'hex');

    // Add Ethereum personal message prefix
    const prefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
    const prefixBytes = Buffer.from(prefix, 'utf8');
    const prefixedMessage = Buffer.concat([prefixBytes, messageBytes]);

    // Sign the prefixed message
    const signature = await tw.trx.signMessageV2(prefixedMessage);

    // Format signature for Ethereum compatibility
    if (typeof signature === 'string') {
      return to0x(signature);
    } else if (signature && typeof signature === 'object') {
      const sig = signature.signature || signature;
      return to0x(sig);
    }

    throw new Error('Invalid signature format from TronWeb');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`personal_sign failed: ${msg}`);
  }
};

// eth_signTypedData_v4 for EIP-712 structured data signing
export const eth_signTypedData_v4: MethodHandler = async (params, { tw, config, getChainIdHex }) => {
  const address = params[0];
  const typedDataJson = params[1];

  assertAddress(tw, address, { method: "eth_signTypedData_v4", parameter: 0 });

  if (!typedDataJson) {
    throw new Error("eth_signTypedData_v4 requires typed data to sign");
  }

  try {
    // Import EIP-712 utilities dynamically
    const { parseTypedData, createEIP712Digest } = await import("../utils/eip712");

    // Parse and validate the typed data
    const typedData = parseTypedData(typedDataJson);

    // Add chainId to domain if not present
    if (!typedData.domain.chainId) {
      const chainIdHex = getChainIdHex();
      typedData.domain.chainId = parseInt(chainIdHex, 16);
    }

    // Create the EIP-712 digest
    const digest = createEIP712Digest(typedData);

    // Convert digest to bytes for signing
    const digestBytes = Buffer.from(strip0x(digest), 'hex');

    // Sign the EIP-712 digest
    const signature = await tw.trx.signMessageV2(digestBytes);

    // Extract string signature
    let sigString: string;
    if (typeof signature === 'string') {
      sigString = signature;
    } else if (signature && typeof signature === 'object') {
      sigString = signature.signature || signature;
    } else {
      throw new Error('Invalid signature format from TronWeb');
    }

    // Apply v value offset if configured (e.g., +4 for Tron Safe compressed keys)
    const vOffset = config?.signatureCompatibility?.vValueOffset ?? 0;
    if (vOffset !== 0) {
      // Import signature formatting utility
      const { ensureEthereumSignatureFormat } = await import("../utils/ethereum-compatible-signing");
      return ensureEthereumSignatureFormat(sigString, vOffset);
    }

    return to0x(sigString);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_signTypedData_v4 failed: ${msg}`);
  }
};

// Additional signing methods for completeness
export const eth_signTypedData: MethodHandler = eth_signTypedData_v4;
export const eth_signTypedData_v3: MethodHandler = eth_signTypedData_v4;

// Re-export confirmation utilities for convenience
export {
  waitForTransactionReceipt,
  getTransactionConfirmations,
  isTransactionConfirmed,
  ConfirmationTimeoutError,
  TransactionNotFoundError,
  TransactionRevertedError,
  type WaitForReceiptOptions,
  type TransactionReceipt,
} from "../utils/confirmation";
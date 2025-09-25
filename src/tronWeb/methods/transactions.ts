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
        // We recognized the function - use dynamic processing
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

export const eth_sign: MethodHandler = async (params, { tw }) => {
  assertAddress(tw, params[0], { method: "eth_sign", parameter: 0 });
  const message = params[1];

  if (!message) {
    throw new Error("eth_sign requires a message to sign");
  }

  try {
    // Use TronWeb's sign method directly
    const signature = await tw.trx.sign(message);
    return to0x(signature);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sign failed: ${msg}`);
  }
};
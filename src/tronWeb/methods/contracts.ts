import type { MethodHandler } from "./types";
import { assertAddress, resolveFromAddress, tronBase58FromEvm } from "../utils/address";
import { toHex } from "viem";
import { strip0x, to0x, normalizeHex } from "../utils/hex";
import { toSun, resolveFeeLimit, toOptionalNumber } from "../utils/numeric";
import { isPlainObject } from "../utils/validation";
import { extractTronErrorMessage } from "../utils/errors";
import { DEFAULT_FEE_LIMIT } from "../constants";

export const eth_call: MethodHandler = async (params, { tw, config }) => {
  const callRequest = params[0];
  const blockTag = params[1];

  if (!isPlainObject(callRequest))
    throw new Error("eth_call param[0] must be an object.");

  const toValue = callRequest.to ?? callRequest.contractAddress;
  if (!toValue)
    throw new Error("eth_call transaction.to is required on Tron transport.");

  const toAddress = assertAddress(tw, toValue, {
    method: "eth_call",
    parameter: 0,
    property: "transaction.to",
  });

  if (blockTag != null && blockTag !== "latest" && blockTag !== "pending")
    throw new Error(
      "eth_call currently supports only latest or pending block tags on Tron transport.",
    );

  const caller = resolveFromAddress(tw, config, callRequest.from, {
    method: "eth_call",
    property: "transaction.from",
    allowZeroFallback: true,
  });

  const contractBase58 = tronBase58FromEvm(tw, toAddress);
  const feeLimit = resolveFeeLimit(
    config?.callOptions?.feeLimit,
    DEFAULT_FEE_LIMIT,
    "callOptions.feeLimit",
  );
  const callValueSun = toSun(callRequest.value, "transaction.value");
  const dataHex = normalizeHex(callRequest.data ?? callRequest.input);
  const rawParameter = strip0x(dataHex);
  const options: Record<string, any> = { feeLimit };
  if (rawParameter.length > 0) options.input = rawParameter;
  if (callValueSun > 0) options.callValue = callValueSun;
  const permissionId = toOptionalNumber(callRequest.permissionId);
  if (permissionId != null) options.permissionId = permissionId;
  const issuerAddress = caller.base58;

  const result = await tw.transactionBuilder.triggerConstantContract(
    contractBase58,
    "",
    options,
    [],
    issuerAddress,
  );

  if (!result) return "0x";

  if (result?.result?.result === false) {
    const message = extractTronErrorMessage(result);
    const reason = message ?? "execution reverted";
    throw new Error(`eth_call reverted: ${reason}`);
  }

  const constantResult = Array.isArray(result?.constant_result)
    ? result.constant_result.find((item: unknown) => typeof item === "string")
    : undefined;

  return to0x(constantResult ?? "");
};

export const eth_estimateGas: MethodHandler = async (params, { tw, config }) => {
  const txRequest = params[0] as any;
  if (!txRequest) {
    throw new Error("eth_estimateGas requires a transaction object");
  }

  const fromAddress = resolveFromAddress(tw, config, txRequest.from, {
    method: "eth_estimateGas",
    property: "transaction.from",
    allowZeroFallback: true,
  });

  // Handle simple TRX transfers
  if (!txRequest.data || strip0x(txRequest.data).length === 0) {
    // Standard transfer uses ~265 bandwidth
    // Map to standard Ethereum transfer gas for compatibility
    return toHex(21000);
  }

  // Handle contract interactions
  if (txRequest.to) {
    const toAddress = assertAddress(tw, txRequest.to, {
      method: "eth_estimateGas",
      parameter: 0,
      property: "transaction.to"
    });

    try {
      // Use triggerConstantContract to get accurate energy estimation
      const result = await tw.transactionBuilder.triggerConstantContract(
        tronBase58FromEvm(tw, toAddress),
        "",
        {
          feeLimit: 150_000_000, // High limit for estimation
          input: strip0x(txRequest.data),
          callValue: toSun(txRequest.value, "transaction.value")
        },
        [],
        fromAddress.base58
      );

      if (result?.energy_used) {
        // Map energy directly to gas units
        // Add a base amount to account for bandwidth costs
        const estimatedGas = 30000 + result.energy_used;
        return toHex(estimatedGas);
      }
    } catch {
      // Estimation failed, fall back to data size estimation
    }

    // Fallback: estimate based on calldata size
    const dataBytes = Math.max(0, (strip0x(txRequest.data).length) / 2);
    const estimatedGas = 30000 + (dataBytes * 68); // 68 gas per byte approximation
    return toHex(estimatedGas);
  }

  // Contract deployment (no 'to' address)
  if (txRequest.data && !txRequest.to) {
    const dataBytes = Math.max(0, (strip0x(txRequest.data).length) / 2);
    const deploymentGas = 500000 + (dataBytes * 68);
    return toHex(deploymentGas);
  }

  // Default fallback
  return toHex(100000);
};

export const eth_getCode: MethodHandler = async (params, { tw }) => {
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getCode",
    parameter: 0
  });
  const tronAddress = tronBase58FromEvm(tw, address0x);
  const blockTag = params[1] ?? "latest";

  // Note: Block tag support is limited in Tron, only supporting latest

  try {
    // Get contract info from Tron
    // NOTE: Tron's getContract() API doesn't return actual bytecode like Ethereum
    // Instead, it returns code_hash and abi fields for deployed contracts
    const contract = await tw.trx.getContract(tronAddress);

    // Check if contract exists by verifying code_hash or abi presence
    if (contract && (contract.code_hash || contract.abi)) {
      // Return code_hash if available
      if (contract.code_hash && typeof contract.code_hash === 'string') {
        return to0x(contract.code_hash);
      }
      // Fallback: if abi exists but no code_hash, return minimal non-empty value
      return "0x01";
    }

    // For proxy contracts (e.g., Safe), getContract() may return empty
    // Use getAccount() as fallback to check if address is deployed
    const account = await tw.trx.getAccount(tronAddress);

    // If account exists and has an address field, it's deployed
    if (account && account.address) {
      // Return "0x01" to indicate contract exists
      // This is sufficient for Protocol Kit and similar tools
      return "0x01";
    }

    // Not a contract - return empty
    return "0x";
  } catch (error) {
    // If error fetching contract, assume it's not a contract
    if (process.env.DEBUG_TRANSPORT) {
      console.error('eth_getCode error:', error);
    }
    return "0x";
  }
};

export const eth_getStorageAt: MethodHandler = async (params, { tw }) => {
  // Validate the address parameter to ensure it's valid
  assertAddress(tw, params[0], {
    method: "eth_getStorageAt",
    parameter: 0
  });

  // Note: Tron doesn't provide direct storage slot access like Ethereum
  // We validate the address but can't actually read storage slots
  // Parameters params[1] (position) and params[2] (blockTag) would be used in Ethereum
  // but are not applicable to Tron's architecture

  // Always return 32 bytes of zeros as Tron has no storage slot access
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
};
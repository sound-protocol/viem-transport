import {
  signTransaction
} from "./chunk-PDE3ASXT.mjs";
import {
  DEFAULT_COMPATIBILITY_CONFIG,
  createEthereumMessageHash,
  ensureEthereumSignatureFormat,
  extractSignatureComponents,
  isEthereumCompatibleSignature,
  signMessageWithConfig,
  signWithEthereumPrefix
} from "./chunk-MMFQIFZA.mjs";
import {
  createEIP712Digest,
  formatSafeTransaction,
  normalizeHex,
  parseTypedData,
  strip0x,
  to0x
} from "./chunk-PH3BKQDX.mjs";
import "./chunk-Y6FXYEAI.mjs";

// src/tronWeb/index.ts
import { createTransport, toHex as toHex10 } from "viem";

// src/tronWeb/methods/blocks.ts
import { toHex } from "viem";

// src/tronWeb/constants.ts
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var TRON_HEX_PREFIX = "41";
var BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;
var DEFAULT_FEE_LIMIT = 4e7;

// src/tronWeb/utils/validation.ts
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isTronBase58(value) {
  if (!value || value[0] !== "T") return false;
  if (value.length < 34 || value.length > 36) return false;
  return BASE58_REGEX.test(value);
}
function isLikelyBase64(value) {
  if (!value || value.length % 4 !== 0) return false;
  return /^[0-9A-Za-z+/=]+$/.test(value);
}
function formatParamValue(value) {
  if (typeof value === "string") return `'${value}'`;
  if (value == null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

// src/tronWeb/utils/address.ts
function assertAddress(tw, value, ctx) {
  const address = toCanonicalAddress(tw, value);
  if (address) return address;
  const target = ctx.property ?? `param[${ctx.parameter}]`;
  throw new Error(
    `${ctx.method} ${target} must be an address in 0x-prefixed 20-byte hex, Tron base58 (T...), or Tron 41-hex form. Received ${formatParamValue(value)}.`
  );
}
function tronBase58FromEvm(tw, address) {
  const hex41 = `${TRON_HEX_PREFIX}${strip0x(address)}`;
  try {
    const converted = tw.address.fromHex(hex41);
    if (!isTronBase58(converted))
      throw new Error("TronWeb returned an invalid base58 address");
    return converted;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to convert ${address} to Tron base58: ${message}`);
  }
}
function tronAddressTo0x(tw, value) {
  return toCanonicalAddress(tw, value);
}
function toCanonicalAddress(tw, value) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const hex = strip0x(trimmed);
  if (/^[0-9a-fA-F]{40}$/.test(hex)) return `0x${hex.toLowerCase()}`;
  if (/^[0-9a-fA-F]{42}$/.test(hex) && hex.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX)
    return `0x${hex.slice(2).toLowerCase()}`;
  if (isTronBase58(trimmed)) {
    const hex41 = tronBase58ToHex41(tw, trimmed);
    if (!hex41) return null;
    return tronHex41To0x(hex41);
  }
  return null;
}
function tronHex41To0x(value) {
  const hex = strip0x(value).toLowerCase();
  if (hex.length !== 42 || !hex.startsWith(TRON_HEX_PREFIX)) return null;
  const body = hex.slice(2);
  if (!/^[0-9a-f]{40}$/.test(body)) return null;
  return `0x${body}`;
}
function tronBase58ToHex41(tw, value) {
  try {
    const hex = tw.address.toHex(value);
    const normalized = strip0x(hex);
    if (normalized.length === 42 && normalized.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX && /^[0-9a-fA-F]+$/.test(normalized))
      return `0x${normalized.toLowerCase()}`;
  } catch {
    return null;
  }
  return null;
}
function resolveFromAddress(tw, config, candidate, ctx) {
  const candidates = [];
  if (typeof candidate === "string" && candidate.trim().length > 0)
    candidates.push(candidate);
  if (candidate == null && typeof config?.defaultFrom === "string")
    candidates.push(config.defaultFrom);
  if (candidate == null)
    candidates.push(...getTronDefaultAddressCandidates(tw));
  for (const value of candidates) {
    const address = toCanonicalAddress(tw, value);
    if (address)
      return { evm: address, base58: tronBase58FromEvm(tw, address) };
  }
  if (ctx.allowZeroFallback) {
    const base58 = tronBase58FromEvm(tw, ZERO_ADDRESS);
    return { evm: ZERO_ADDRESS, base58 };
  }
  throw new Error(
    `${ctx.method} ${ctx.property} is required. Provide a valid address or configure defaultFrom on the TronWeb transport.`
  );
}
function getTronDefaultAddressCandidates(tw) {
  const defaults = /* @__PURE__ */ new Set();
  const address = tw.defaultAddress;
  if (address) {
    const maybe = [address.base58, address.b58, address.hex, address.hexString];
    for (const value of maybe) {
      if (typeof value === "string" && value.length > 0) defaults.add(value);
    }
  }
  return Array.from(defaults);
}

// src/tronWeb/methods/blocks.ts
var eth_blockNumber = async (_params, { tw }) => {
  const block = await tw.trx.getCurrentBlock();
  const n = block?.block_header?.raw_data?.number ?? block?.block_header?.number;
  return toHex(n ?? 0);
};
var eth_getBlockByNumber = async (params, { tw }) => {
  const tag = params[0];
  const includeTxs = !!params[1];
  if (tag === "latest" || tag == null) {
    const block2 = await tw.trx.getCurrentBlock();
    return normalizeBlock(tw, block2, includeTxs);
  }
  const n = typeof tag === "string" && tag.startsWith("0x") ? Number(BigInt(tag)) : Number(tag);
  const block = await tw.trx.getBlock(n);
  return normalizeBlock(tw, block, includeTxs);
};
var eth_getBlockByHash = async (params, { tw }) => {
  const id = params[0];
  const idClean = id.startsWith("0x") ? id.slice(2) : id;
  const block = await tw.trx.getBlock(idClean).catch(() => null);
  return block ? normalizeBlock(tw, block, !!params[1]) : null;
};
function normalizeBlock(tw, block, includeTxs) {
  const raw = block?.block_header?.raw_data ?? {};
  const number = raw.number ?? block?.number ?? 0;
  const timestamp = raw.timestamp ?? block?.timestamp ?? 0;
  const hash = block?.blockID ? to0x(block.blockID) : null;
  const parentHash = block?.parentID ? to0x(block.parentID) : null;
  const txs = Array.isArray(block?.transactions) ? block.transactions : [];
  const transactions = includeTxs ? [] : txs.map((tx) => tx?.txID).filter(
    (id) => typeof id === "string" && id.length > 0
  ).map((id) => to0x(id));
  return {
    baseFeePerGas: null,
    difficulty: "0x0",
    extraData: "0x",
    gasLimit: "0x0",
    gasUsed: "0x0",
    hash,
    logsBloom: "0x",
    miner: tronAddressTo0x(tw, raw.witness_address) ?? ZERO_ADDRESS,
    mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    nonce: "0x0000000000000000",
    number: toHex(number),
    parentHash,
    receiptsRoot: "0x",
    sha3Uncles: "0x",
    size: "0x0",
    stateRoot: "0x",
    timestamp: toHex(timestamp),
    totalDifficulty: "0x0",
    transactions,
    transactionsRoot: "0x",
    uncles: []
  };
}
async function resolveBlockNumber(tw, blockTag) {
  if (blockTag === "latest" || blockTag === "pending") {
    const block = await tw.trx.getCurrentBlock();
    return block?.block_header?.raw_data?.number ?? block?.block_header?.number ?? 0;
  }
  if (blockTag === "earliest") {
    return 0;
  }
  if (typeof blockTag === "string" && blockTag.startsWith("0x")) {
    return Number(BigInt(blockTag));
  }
  return Number(blockTag);
}

// src/tronWeb/methods/accounts.ts
import { toHex as toHex2 } from "viem";
var eth_getBalance = async (params, { tw }) => {
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getBalance",
    parameter: 0
  });
  const tronAddress = tronBase58FromEvm(tw, address0x);
  const balanceSun = await tw.trx.getBalance(tronAddress);
  return toHex2(balanceSun ?? 0);
};
var eth_getTransactionCount = async (params, { tw }) => {
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getTransactionCount",
    parameter: 0
  });
  const blockTag = params[1] ?? "latest";
  const tronAddress = tronBase58FromEvm(tw, address0x);
  try {
    const account = await tw.trx.getAccount(tronAddress);
    const txCount = account?.transactions?.length ?? 0;
    const currentBlock = await tw.trx.getCurrentBlock();
    const blockNumber = currentBlock?.block_header?.raw_data?.number ?? 0;
    const pseudoNonce = txCount * 1e6 + blockNumber % 1e6;
    return toHex2(pseudoNonce);
  } catch {
    try {
      const currentBlock = await tw.trx.getCurrentBlock();
      const blockNumber = currentBlock?.block_header?.raw_data?.number ?? 0;
      return toHex2(blockNumber);
    } catch {
      return "0x0";
    }
  }
};
var eth_accounts = async (_params, { tw, config }) => {
  const addresses = [];
  if (config?.defaultFrom) {
    const addr = toCanonicalAddress(tw, config.defaultFrom);
    if (addr) addresses.push(addr);
  }
  const candidates = getTronDefaultAddressCandidates(tw);
  for (const candidate of candidates) {
    const addr = toCanonicalAddress(tw, candidate);
    if (addr && !addresses.includes(addr)) {
      addresses.push(addr);
    }
  }
  return addresses;
};
var net_version = async (_params, { getChainIdHex }) => {
  const chainId = getChainIdHex();
  return String(parseInt(chainId, 16));
};

// src/tronWeb/methods/transactions.ts
import { toHex as toHex5 } from "viem";

// src/tronWeb/utils/transactions.ts
import { toHex as toHex3 } from "viem";
function extractInputData(_tw, tx) {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;
  const parameter = contract.parameter?.value;
  if (parameter?.data) {
    return to0x(parameter.data);
  }
  return null;
}
function extractFromAddress(tw, tx) {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;
  const parameter = contract.parameter?.value;
  if (parameter?.owner_address) {
    return tronAddressTo0x(tw, parameter.owner_address);
  }
  return null;
}
function extractToAddress(tw, tx) {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;
  const parameter = contract.parameter?.value;
  if (parameter?.to_address) {
    return tronAddressTo0x(tw, parameter.to_address);
  }
  if (parameter?.contract_address) {
    return tronAddressTo0x(tw, parameter.contract_address);
  }
  return null;
}
function extractValue(_tw, tx) {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return 0;
  const parameter = contract.parameter?.value;
  if (parameter?.amount) {
    return parameter.amount;
  }
  if (parameter?.call_value) {
    return parameter.call_value;
  }
  return 0;
}
function normalizeReceipt(tw, info) {
  const status = (info?.receipt?.result ?? info?.result) === "SUCCESS" ? "0x1" : "0x0";
  const logsArray = Array.isArray(info?.log) ? info.log : [];
  const logs = logsArray.map((l, i) => ({
    address: tronAddressTo0x(tw, l.address) ?? ZERO_ADDRESS,
    blockHash: null,
    blockNumber: info.blockNumber != null ? toHex3(info.blockNumber) : null,
    data: typeof l?.data === "string" && l.data.length > 0 ? to0x(l.data) : "0x",
    logIndex: toHex3(i),
    removed: false,
    topics: Array.isArray(l?.topics) ? l.topics.filter(
      (topic) => typeof topic === "string"
    ).map((topic) => to0x(topic)) : [],
    transactionHash: info.id ? to0x(info.id) : null,
    transactionIndex: "0x0"
  }));
  return {
    blockHash: null,
    blockNumber: info.blockNumber != null ? toHex3(info.blockNumber) : null,
    contractAddress: tronAddressTo0x(tw, info.contract_address),
    cumulativeGasUsed: toHex3(
      info.receipt?.energy_usage_total ?? info.energy_usage_total ?? 0
    ),
    effectiveGasPrice: "0x0",
    from: null,
    gasUsed: toHex3(info.receipt?.energy_usage ?? info.energy_usage ?? 0),
    logs,
    logsBloom: "0x",
    status,
    to: null,
    transactionHash: info.id ? to0x(info.id) : null,
    transactionIndex: "0x0",
    type: "0x0"
  };
}

// src/tronWeb/utils/numeric.ts
function toSun(value, label) {
  let amount;
  try {
    amount = toBigIntLike(value);
  } catch {
    throw new Error(`Tron transport ${label} must be a valid numeric value.`);
  }
  if (amount < BigInt(0))
    throw new Error(`Tron transport ${label} must be a non-negative integer.`);
  if (amount === BigInt(0)) return 0;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(
      `Tron transport ${label} exceeds the max safe integer supported for Sun values.`
    );
  return Number(amount);
}
function toBigIntLike(value) {
  if (value == null) return BigInt(0);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Value must be finite.");
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return BigInt(0);
    const normalized = trimmed.startsWith("0x") || trimmed.startsWith("0X") ? `0x${strip0x(trimmed)}` : trimmed;
    if (normalized === "0x") return BigInt(0);
    return BigInt(normalized);
  }
  throw new Error("Value must be bigint, number, or hex string.");
}
function toOptionalNumber(value) {
  if (value == null) return void 0;
  const numeric = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(numeric)) return void 0;
  const truncated = Math.trunc(numeric);
  if (truncated < 0) return void 0;
  return truncated;
}
function resolveFeeLimit(provided, fallback, label) {
  const value = provided ?? fallback;
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Tron transport ${label} must be a positive number.`);
  return Math.trunc(value);
}

// src/tronWeb/utils/errors.ts
function extractTronErrorMessage(value) {
  if (!value) return null;
  const errorResp = value;
  const candidates = [
    errorResp.result?.message,
    errorResp.message,
    errorResp.Error,
    errorResp.code
  ];
  for (const item of candidates) {
    if (typeof item === "string" && item.length > 0)
      return decodeTronMessage(item);
  }
  const ret = Array.isArray(errorResp.transaction?.ret) ? errorResp.transaction.ret[0] : void 0;
  if (ret) {
    const retMessage = typeof ret.ret_message === "string" && ret.ret_message || typeof ret.retMsg === "string" && ret.retMsg || typeof ret.ret_msg === "string" && ret.ret_msg || typeof ret.message === "string" && ret.message;
    if (retMessage) return decodeTronMessage(retMessage);
  }
  return null;
}
function decodeTronMessage(message) {
  if (isLikelyBase64(message)) {
    const decoded = decodeBase64String(message);
    if (decoded && decoded.length > 0) return decoded;
  }
  return message;
}
function decodeBase64String(value) {
  try {
    const globalObj = globalThis;
    if (globalObj?.atob) return globalObj.atob(value);
    if (globalObj?.Buffer)
      return globalObj.Buffer.from(value, "base64").toString("utf8");
  } catch {
  }
  return value;
}

// src/tronWeb/abi/registry.ts
var FUNCTION_REGISTRY = {
  // ERC-20 Standard Functions
  "a9059cbb": { signature: "transfer(address,uint256)", params: ["address", "uint256"] },
  "095ea7b3": { signature: "approve(address,uint256)", params: ["address", "uint256"] },
  "23b872dd": { signature: "transferFrom(address,address,uint256)", params: ["address", "address", "uint256"] },
  "70a08231": { signature: "balanceOf(address)", params: ["address"] },
  "dd62ed3e": { signature: "allowance(address,address)", params: ["address", "address"] },
  "18160ddd": { signature: "totalSupply()", params: [] },
  "313ce567": { signature: "decimals()", params: [] },
  "95d89b41": { signature: "symbol()", params: [] },
  "06fdde03": { signature: "name()", params: [] },
  // Safe Contract Functions - Core
  "6a761202": { signature: "execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)", params: ["address", "uint256", "bytes", "uint8", "uint256", "uint256", "uint256", "address", "address", "bytes"] },
  "0d582f13": { signature: "addOwnerWithThreshold(address,uint256)", params: ["address", "uint256"] },
  "f8dc5dd9": { signature: "removeOwner(address,address,uint256)", params: ["address", "address", "uint256"] },
  "e009cfde": { signature: "swapOwner(address,address,address)", params: ["address", "address", "address"] },
  "694e80c3": { signature: "changeThreshold(uint256)", params: ["uint256"] },
  "610b5925": { signature: "enableModule(address)", params: ["address"] },
  "e009cfdf": { signature: "disableModule(address,address)", params: ["address", "address"] },
  "d4d9bdcd": { signature: "approveHash(bytes32)", params: ["bytes32"] },
  "20c13b0b": { signature: "isValidSignature(bytes,bytes)", params: ["bytes", "bytes"] },
  "2f54bf6e": { signature: "isOwner(address)", params: ["address"] },
  "a0e67e2b": { signature: "getOwners()", params: [] },
  "e75235b8": { signature: "getThreshold()", params: [] },
  "affed0e0": { signature: "nonce()", params: [] },
  // Safe Contract Functions - Transaction Building
  "bb8310d2": { signature: "getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)", params: ["address", "uint256", "bytes", "uint8", "uint256", "uint256", "uint256", "address", "address", "uint256"] },
  "934f3a11": { signature: "checkSignatures(bytes32,bytes,bytes)", params: ["bytes32", "bytes", "bytes"] },
  "a85594bf": { signature: "checkNSignatures(bytes32,bytes,bytes,uint256)", params: ["bytes32", "bytes", "bytes", "uint256"] },
  // Safe Contract Functions - Modules
  "468721a7": { signature: "execTransactionFromModule(address,uint256,bytes,uint8)", params: ["address", "uint256", "bytes", "uint8"] },
  "ccafc387": { signature: "execTransactionFromModuleReturnData(address,uint256,bytes,uint8)", params: ["address", "uint256", "bytes", "uint8"] },
  "aa8c217c": { signature: "getModulesPaginated(address,uint256)", params: ["address", "uint256"] },
  "b2494df3": { signature: "getModules()", params: [] },
  "2d9ad53d": { signature: "isModuleEnabled(address)", params: ["address"] },
  // Safe Contract Functions - Guards
  "e19a9dd9": { signature: "setGuard(address)", params: ["address"] },
  "58401ed8": { signature: "getGuard()", params: [] },
  // Safe Contract Functions - Fallback
  "f698da25": { signature: "domainSeparator()", params: [] },
  "60b3cbf8": { signature: "getChainId()", params: [] },
  "1624f6c6": { signature: "setup(address[],uint256,address,bytes,address,address,uint256,address)", params: ["address[]", "uint256", "address", "bytes", "address", "address", "uint256", "address"] },
  "0a1028c4": { signature: "encodeTransactionData(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)", params: ["address", "uint256", "bytes", "uint8", "uint256", "uint256", "uint256", "address", "address", "uint256"] },
  // Safe Contract Functions - EIP-1271
  "1626ba7e": { signature: "isValidSignature(bytes32,bytes)", params: ["bytes32", "bytes"] },
  // Safe Contract Functions - Storage
  "bd79b86d": { signature: "getStorageAt(uint256,uint256)", params: ["uint256", "uint256"] },
  "93271368": { signature: "simulateAndRevert(address,bytes)", params: ["address", "bytes"] },
  // Safe Proxy Factory Functions
  "1688f0b9": { signature: "createProxyWithNonce(address,bytes,uint256)", params: ["address", "bytes", "uint256"] }
};

// src/tronWeb/abi/parser.ts
function parseCallData(rawParameter) {
  if (rawParameter.length < 8) return null;
  const selector = rawParameter.substring(0, 8).toLowerCase();
  const functionInfo = FUNCTION_REGISTRY[selector];
  if (!functionInfo) return null;
  const params = [];
  let offset = 8;
  for (const paramType of functionInfo.params) {
    if (offset >= rawParameter.length) {
      break;
    }
    if (paramType === "address") {
      if (offset + 64 <= rawParameter.length) {
        const addressHex = rawParameter.substring(offset + 24, offset + 64);
        params.push({ type: "address", value: addressHex });
        offset += 64;
      }
    } else if (paramType === "uint256" || paramType === "uint") {
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset, offset + 64);
        params.push({ type: "uint256", value: `0x${value}` });
        offset += 64;
      }
    } else if (paramType === "uint8") {
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset + 62, offset + 64);
        params.push({ type: "uint8", value: parseInt(value, 16) });
        offset += 64;
      }
    } else if (paramType === "bool") {
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset + 63, offset + 64);
        params.push({ type: "bool", value: value === "1" });
        offset += 64;
      }
    } else if (paramType === "bytes32") {
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset, offset + 64);
        params.push({ type: "bytes32", value: `0x${value}` });
        offset += 64;
      }
    } else if (paramType === "bytes") {
      if (offset + 64 <= rawParameter.length) {
        const offsetPointer = parseInt(rawParameter.substring(offset, offset + 64), 16) * 2 + 8;
        params.push({ type: "bytes", value: offsetPointer });
        offset += 64;
      }
    }
  }
  for (let i = 0; i < params.length; i++) {
    if (params[i].type === "bytes" && typeof params[i].value === "number") {
      const dataOffset = params[i].value;
      if (dataOffset < rawParameter.length) {
        const lengthHex = rawParameter.substring(dataOffset, dataOffset + 64);
        const length = parseInt(lengthHex, 16) * 2;
        const data = rawParameter.substring(dataOffset + 64, dataOffset + 64 + length);
        params[i].value = `0x${data}`;
      }
    }
  }
  return { functionInfo, params };
}
function convertParamsToTron(params, tw) {
  return params.map((param) => {
    if (param.type === "address" && typeof param.value === "string") {
      const ethAddress = `0x${param.value}`;
      return tronBase58FromEvm(tw, ethAddress);
    }
    if (param.type === "uint256" && typeof param.value === "string") {
      const hexValue = param.value.startsWith("0x") ? param.value.slice(2) : param.value;
      const bigIntValue = BigInt("0x" + hexValue);
      if (bigIntValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(bigIntValue);
      }
      return bigIntValue.toString();
    }
    return param.value;
  });
}

// src/tronWeb/utils/confirmation.ts
import { toHex as toHex4 } from "viem";
var ConfirmationTimeoutError = class extends Error {
  constructor(txHash, timeout) {
    super(`Transaction ${txHash} confirmation timed out after ${timeout}ms`);
    this.txHash = txHash;
    this.timeout = timeout;
    this.name = "ConfirmationTimeoutError";
  }
};
var TransactionNotFoundError = class extends Error {
  constructor(txHash) {
    super(`Transaction ${txHash} not found on the blockchain`);
    this.txHash = txHash;
    this.name = "TransactionNotFoundError";
  }
};
var TransactionRevertedError = class extends Error {
  constructor(txHash, reason) {
    super(
      `Transaction ${txHash} reverted${reason ? `: ${reason}` : ""}`
    );
    this.txHash = txHash;
    this.reason = reason;
    this.name = "TransactionRevertedError";
  }
};
async function getTransactionReceiptWithConfirmations(tw, txHash) {
  const txid = strip0x(txHash);
  const [txInfo, tx] = await Promise.all([
    tw.trx.getTransactionInfo(txid),
    tw.trx.getTransaction(txid)
  ]);
  if (!txInfo || !txInfo.id) {
    return null;
  }
  const currentBlock = await tw.trx.getCurrentBlock();
  const currentBlockNumber = currentBlock?.block_header?.raw_data?.number ?? 0;
  const txBlockNumber = txInfo.blockNumber ?? 0;
  const confirmations = Math.max(0, currentBlockNumber - txBlockNumber);
  const contractResult = txInfo.result ?? "SUCCESS";
  const status = contractResult === "SUCCESS" ? "0x1" : "0x0";
  const fromAddress = tx?.raw_data?.contract?.[0]?.parameter?.value?.owner_address ? tw.address.fromHex(
    tx.raw_data.contract[0].parameter.value.owner_address
  ) : "";
  let toAddress = null;
  if (tx?.raw_data?.contract?.[0]?.parameter?.value?.to_address) {
    toAddress = tw.address.fromHex(
      tx.raw_data.contract[0].parameter.value.to_address
    );
  } else if (tx?.raw_data?.contract?.[0]?.parameter?.value?.contract_address) {
    toAddress = tw.address.fromHex(
      tx.raw_data.contract[0].parameter.value.contract_address
    );
  }
  const fromEth = fromAddress ? to0x(tw.address.toHex(fromAddress)) : "";
  const toEth = toAddress ? to0x(tw.address.toHex(toAddress)) : null;
  const logs = (txInfo.log ?? []).map((log) => ({
    address: to0x(log.address),
    topics: log.topics?.map((t) => to0x(t)) ?? [],
    data: to0x(log.data ?? ""),
    blockNumber: toHex4(txBlockNumber),
    transactionHash: to0x(txInfo.id ?? txid),
    transactionIndex: "0x0",
    // Tron doesn't have tx index within block
    blockHash: to0x(txInfo.blockHash ?? ""),
    logIndex: toHex4(log.index ?? 0),
    removed: false
  }));
  const receipt = {
    transactionHash: to0x(txInfo.id ?? txid),
    transactionIndex: "0x0",
    // Tron doesn't have tx index
    blockHash: to0x(txInfo.blockHash ?? ""),
    blockNumber: toHex4(txBlockNumber),
    from: fromEth,
    to: toEth,
    cumulativeGasUsed: toHex4(txInfo.energy_usage_total ?? 0),
    gasUsed: toHex4(txInfo.energy_usage ?? 0),
    contractAddress: txInfo.contract_address ? to0x(txInfo.contract_address) : null,
    logs,
    status,
    effectiveGasPrice: toHex4(100),
    // Tron's energy price
    confirmations
  };
  return receipt;
}
async function waitForTransactionReceipt(tw, txHash, options = {}) {
  const {
    confirmations = 19,
    // One full SR cycle
    timeout = 6e4,
    // 60 seconds
    pollingInterval = 3e3,
    // 3 seconds (Tron block time)
    onConfirmation
  } = options;
  const startTime = Date.now();
  let lastConfirmationCount = -1;
  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new ConfirmationTimeoutError(txHash, timeout);
    }
    try {
      const receipt = await getTransactionReceiptWithConfirmations(
        tw,
        txHash
      );
      if (!receipt) {
        await sleep(pollingInterval);
        continue;
      }
      if (receipt.status === "0x0") {
        const reason = extractRevertReason(receipt);
        throw new TransactionRevertedError(txHash, reason);
      }
      if (onConfirmation && receipt.confirmations !== lastConfirmationCount) {
        lastConfirmationCount = receipt.confirmations;
        onConfirmation(receipt.confirmations, confirmations);
      }
      if (receipt.confirmations >= confirmations) {
        return receipt;
      }
      await sleep(pollingInterval);
    } catch (error) {
      if (error instanceof TransactionRevertedError || error instanceof ConfirmationTimeoutError) {
        throw error;
      }
      await sleep(pollingInterval);
    }
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function extractRevertReason(receipt) {
  for (const log of receipt.logs) {
    if (log.topics[0] === "0x08c379a0") {
      try {
        const data = log.data.slice(2);
        if (data.length > 64) {
          const reason = Buffer.from(data.slice(128), "hex").toString(
            "utf8"
          );
          return reason.replace(/\0/g, "");
        }
      } catch {
      }
    }
  }
  return void 0;
}
async function getTransactionConfirmations(tw, txHash) {
  try {
    const receipt = await getTransactionReceiptWithConfirmations(
      tw,
      txHash
    );
    return receipt?.confirmations ?? null;
  } catch {
    return null;
  }
}
async function isTransactionConfirmed(tw, txHash, requiredConfirmations = 19) {
  const confirmations = await getTransactionConfirmations(tw, txHash);
  return confirmations !== null && confirmations >= requiredConfirmations;
}

// src/tronWeb/methods/transactions.ts
var eth_sendRawTransaction = async (params, { tw, config }) => {
  const rawTxHex = params[0];
  try {
    const { parseTransaction } = await import("viem");
    const decodedTx = parseTransaction(rawTxHex);
    const { recoverTransactionAddress } = await import("viem");
    const senderAddress = await recoverTransactionAddress({ serializedTransaction: rawTxHex });
    const sender = { evm: senderAddress, base58: tronBase58FromEvm(tw, senderAddress) };
    const estimatedGas = decodedTx.gas ? Number(decodedTx.gas) : 0;
    const feeLimit = Math.max(estimatedGas * 10, DEFAULT_FEE_LIMIT);
    const valueSun = decodedTx.value ? Number(decodedTx.value) : 0;
    const dataHex = decodedTx.data ?? "0x";
    const hasData = strip0x(dataHex).length > 0;
    let transaction;
    if (hasData && decodedTx.to) {
      const toAddress = assertAddress(tw, decodedTx.to, {
        method: "eth_sendRawTransaction",
        parameter: 0,
        property: "transaction.to"
      });
      const contractBase58 = tronBase58FromEvm(tw, toAddress);
      const options = { feeLimit };
      if (valueSun > 0) options.callValue = valueSun;
      const rawParameter = strip0x(dataHex);
      const parsedCall = parseCallData(rawParameter);
      if (parsedCall) {
        const { functionInfo, params: params2 } = parsedCall;
        const tronParams = convertParamsToTron(params2, tw);
        const trigger = await tw.transactionBuilder.triggerSmartContract(
          contractBase58,
          functionInfo.signature,
          options,
          tronParams,
          sender.base58
        );
        if (!trigger?.transaction || trigger?.result?.result === false) {
          const message = extractTronErrorMessage(trigger);
          const reason = message ?? "failed to build Tron transaction";
          throw new Error(`eth_sendRawTransaction ${functionInfo.signature} failed: ${reason}`);
        }
        transaction = trigger.transaction;
      } else {
        options.rawParameter = rawParameter;
        const trigger = await tw.transactionBuilder.triggerSmartContract(
          contractBase58,
          "",
          options,
          [],
          sender.base58
        );
        if (!trigger?.transaction || trigger?.result?.result === false) {
          const message = extractTronErrorMessage(trigger);
          const reason = message ?? "failed to build Tron transaction";
          throw new Error(`eth_sendRawTransaction preparation failed: ${reason}`);
        }
        transaction = trigger.transaction;
      }
    } else if (decodedTx.to && valueSun > 0) {
      const toAddress = assertAddress(tw, decodedTx.to, {
        method: "eth_sendRawTransaction",
        parameter: 0,
        property: "transaction.to"
      });
      const recipientBase58 = tronBase58FromEvm(tw, toAddress);
      transaction = await tw.transactionBuilder.sendTrx(
        recipientBase58,
        valueSun,
        sender.base58,
        { feeLimit }
      );
    } else {
      throw new Error("eth_sendRawTransaction: invalid transaction (no data or value)");
    }
    const context = { method: "eth_sendRawTransaction", params };
    const signedTx = await signTransaction(tw, config, transaction, context);
    const preparedTx = signedTx ?? transaction;
    if (!preparedTx || !Array.isArray(preparedTx.signature) || preparedTx.signature.length === 0) {
      throw new Error("eth_sendRawTransaction signing failed: missing signature.");
    }
    const broadcast = await tw.trx.sendRawTransaction(preparedTx);
    if (!broadcast?.result) {
      const message = extractTronErrorMessage(broadcast);
      const reason = message ?? "broadcast rejected";
      throw new Error(`eth_sendRawTransaction broadcast failed: ${reason}`);
    }
    const txid = typeof broadcast.txid === "string" && broadcast.txid.length > 0 ? broadcast.txid : typeof preparedTx.txID === "string" && preparedTx.txID.length > 0 ? preparedTx.txID : typeof preparedTx.txId === "string" && preparedTx.txId.length > 0 ? preparedTx.txId : void 0;
    if (!txid) {
      throw new Error("eth_sendRawTransaction broadcast succeeded but no transaction id was returned.");
    }
    return to0x(txid);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sendRawTransaction failed: ${msg}`);
  }
};
var eth_getTransactionReceipt = async (params, { tw }) => {
  const txid = strip0x(params[0]);
  const info = await tw.trx.getTransactionInfo(txid);
  return info ? normalizeReceipt(tw, info) : null;
};
var eth_getTransaction = async (params, { tw, getChainIdHex }) => {
  const txid = strip0x(params[0]);
  if (!txid) {
    return null;
  }
  try {
    const tx = await tw.trx.getTransaction(txid);
    if (!tx) return null;
    const info = await tw.trx.getTransactionInfo(txid);
    const from = extractFromAddress(tw, tx);
    const to = extractToAddress(tw, tx);
    const value = extractValue(tw, tx);
    const input = extractInputData(tw, tx);
    return {
      blockHash: info?.blockHash ? to0x(info.blockHash) : null,
      blockNumber: info?.blockNumber != null ? toHex5(info.blockNumber) : null,
      from: from ?? "0x0000000000000000000000000000000000000000",
      gas: toHex5(tx.raw_data?.fee_limit ?? DEFAULT_FEE_LIMIT),
      gasPrice: toHex5(1),
      // Tron doesn't use gas price in the same way
      hash: to0x(txid),
      input: input ?? "0x",
      nonce: toHex5(0),
      // Tron doesn't use nonces
      to,
      transactionIndex: info?.transactionIndex != null ? toHex5(info.transactionIndex) : "0x0",
      value: toHex5(value),
      v: "0x0",
      // Signature values not directly available
      r: "0x0",
      s: "0x0",
      type: "0x0",
      // Legacy transaction type
      accessList: [],
      chainId: getChainIdHex()
    };
  } catch (error) {
    return null;
  }
};
var eth_getTransactionByHash = eth_getTransaction;
var eth_sendTransaction = async (params, { tw, config }) => {
  const txRequest = params[0];
  if (!isPlainObject(txRequest))
    throw new Error("eth_sendTransaction param[0] must be an object.");
  const sender = resolveFromAddress(tw, config, txRequest.from, {
    method: "eth_sendTransaction",
    property: "transaction.from",
    allowZeroFallback: false
  });
  const feeLimit = resolveFeeLimit(
    config?.sendOptions?.feeLimit,
    DEFAULT_FEE_LIMIT,
    "sendOptions.feeLimit"
  );
  const valueSun = toSun(txRequest.value, "transaction.value");
  const dataHex = txRequest.data ?? txRequest.input;
  const normalizedDataHex = typeof dataHex === "string" ? `0x${strip0x(dataHex)}` : "0x";
  const hasData = strip0x(normalizedDataHex).length > 0;
  const permissionId = toOptionalNumber(txRequest.permissionId);
  let transaction;
  if (hasData) {
    const toValue = txRequest.to;
    if (!toValue)
      throw new Error(
        "eth_sendTransaction transaction.to is required for contract execution on Tron transport."
      );
    const toAddress = assertAddress(tw, toValue, {
      method: "eth_sendTransaction",
      parameter: 0,
      property: "transaction.to"
    });
    const contractBase58 = tronBase58FromEvm(tw, toAddress);
    const options = { feeLimit };
    if (permissionId != null) options.permissionId = permissionId;
    if (valueSun > 0) options.callValue = valueSun;
    const rawParameter = strip0x(normalizedDataHex);
    if (rawParameter.length > 0) {
      const parsedCall = parseCallData(rawParameter);
      if (parsedCall) {
        const hasComplexTypes = parsedCall.functionInfo.params.some(
          (p) => p === "bytes" || p.includes("[]") || p.startsWith("bytes[")
        );
        if (hasComplexTypes) {
          if (process.env.DEBUG_TRANSPORT) {
            console.debug(`Function ${parsedCall.functionInfo.signature} has complex types (bytes/arrays), using parameter decoding`);
          }
          const { decodeFunctionData, parseAbi: parseAbi3 } = await import("viem");
          const abi = parseAbi3([`function ${parsedCall.functionInfo.signature}`]);
          const decoded = decodeFunctionData({
            abi,
            data: `0x${rawParameter}`
          });
          const tronParams = parsedCall.functionInfo.params.map((paramType, i) => {
            const value = decoded.args[i];
            if (paramType === "address") {
              return { type: "address", value: tronBase58FromEvm(tw, value) };
            } else if (paramType.startsWith("bytes")) {
              return { type: paramType, value };
            } else if (paramType.includes("[]")) {
              return { type: paramType, value };
            } else {
              return { type: paramType, value: typeof value === "bigint" ? value.toString() : value };
            }
          });
          const trigger = await tw.transactionBuilder.triggerSmartContract(
            contractBase58,
            parsedCall.functionInfo.signature,
            options,
            tronParams,
            sender.base58
          );
          if (!trigger?.transaction || trigger?.result?.result === false) {
            const message = extractTronErrorMessage(trigger);
            const reason = message ?? "failed to build Tron transaction";
            throw new Error(`eth_sendTransaction (complex types) failed: ${reason}`);
          }
          transaction = trigger.transaction;
        } else {
          const { functionInfo, params: params2 } = parsedCall;
          const tronParams = convertParamsToTron(params2, tw);
          if (process.env.DEBUG_TRANSPORT) {
            console.debug(`Calling ${functionInfo.signature} with params:`, tronParams);
          }
          const trigger = await tw.transactionBuilder.triggerSmartContract(
            contractBase58,
            functionInfo.signature,
            options,
            tronParams,
            sender.base58
          );
          if (!trigger?.transaction || trigger?.result?.result === false) {
            const message = extractTronErrorMessage(trigger);
            const reason = message ?? "failed to build Tron transaction";
            throw new Error(`eth_sendTransaction ${functionInfo.signature} failed: ${reason}`);
          }
          transaction = trigger.transaction;
        }
      } else {
        options.rawParameter = rawParameter;
        const trigger = await tw.transactionBuilder.triggerSmartContract(
          contractBase58,
          "",
          options,
          [],
          sender.base58
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
        "eth_sendTransaction transaction.to is required for value transfers on Tron transport."
      );
    if (valueSun <= 0)
      throw new Error(
        "eth_sendTransaction value must be greater than zero when no data payload is provided on Tron transport."
      );
    const toAddress = assertAddress(tw, txRequest.to, {
      method: "eth_sendTransaction",
      parameter: 0,
      property: "transaction.to"
    });
    const recipientBase58 = tronBase58FromEvm(tw, toAddress);
    const options = { feeLimit };
    if (permissionId != null) options.permissionId = permissionId;
    transaction = await tw.transactionBuilder.sendTrx(
      recipientBase58,
      valueSun,
      sender.base58,
      options
    );
  }
  const context = { method: "eth_sendTransaction", params };
  const signedTx = await signTransaction(tw, config, transaction, context);
  const preparedTx = signedTx ?? transaction;
  if (!preparedTx || !Array.isArray(preparedTx.signature) || preparedTx.signature.length === 0)
    throw new Error("eth_sendTransaction signing failed: missing signature.");
  const broadcast = await tw.trx.sendRawTransaction(preparedTx);
  if (!broadcast?.result) {
    const message = extractTronErrorMessage(broadcast);
    const reason = message ?? "broadcast rejected";
    throw new Error(`eth_sendTransaction broadcast failed: ${reason}`);
  }
  const txid = typeof broadcast.txid === "string" && broadcast.txid.length > 0 ? broadcast.txid : typeof preparedTx.txID === "string" && preparedTx.txID.length > 0 ? preparedTx.txID : typeof preparedTx.txId === "string" && preparedTx.txId.length > 0 ? preparedTx.txId : void 0;
  if (!txid)
    throw new Error(
      "eth_sendTransaction broadcast succeeded but no transaction id was returned."
    );
  return to0x(txid);
};
var eth_sign = async (params, { tw, config }) => {
  assertAddress(tw, params[0], { method: "eth_sign", parameter: 0 });
  const message = params[1];
  if (!message) {
    throw new Error("eth_sign requires a message to sign");
  }
  try {
    const messageHex = strip0x(message);
    const messageBytes = Buffer.from(messageHex, "hex");
    const useEthereumCompatible = config?.signatureCompatibility?.useEthereumPrefix ?? DEFAULT_COMPATIBILITY_CONFIG.useEthereumPrefix;
    let signature;
    if (useEthereumCompatible) {
      signature = await signWithEthereumPrefix(tw, messageBytes);
    } else {
      signature = await tw.trx.signMessageV2(messageBytes);
      signature = ensureEthereumSignatureFormat(signature);
    }
    if (typeof signature === "string") {
      return to0x(signature);
    } else if (signature && typeof signature === "object") {
      const sig = signature.signature || signature;
      return to0x(sig);
    }
    throw new Error("Invalid signature format from TronWeb");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sign failed: ${msg}`);
  }
};
var personal_sign = async (params, { tw }) => {
  const message = params[0];
  const address = params[1];
  assertAddress(tw, address, { method: "personal_sign", parameter: 1 });
  if (!message) {
    throw new Error("personal_sign requires a message to sign");
  }
  try {
    const messageStr = typeof message === "string" ? strip0x(message) : String(message);
    const messageBytes = Buffer.from(messageStr, "hex");
    const prefix = `Ethereum Signed Message:
${messageBytes.length}`;
    const prefixBytes = Buffer.from(prefix, "utf8");
    const prefixedMessage = Buffer.concat([prefixBytes, messageBytes]);
    const signature = await tw.trx.signMessageV2(prefixedMessage);
    return to0x(signature);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`personal_sign failed: ${msg}`);
  }
};
function isSafeTransaction(typedData) {
  if (typedData.primaryType !== "SafeTx") return false;
  const safeFields = ["to", "value", "data", "operation", "safeTxGas", "baseGas", "gasPrice", "gasToken", "refundReceiver", "nonce"];
  const txTypes = typedData.types?.SafeTx;
  if (!Array.isArray(txTypes) || txTypes.length !== safeFields.length) return false;
  return safeFields.every(
    (field) => txTypes.some((t) => t.name === field)
  );
}
var eth_signTypedData_v4 = async (params, { tw, config, getChainIdHex }) => {
  const address = params[0];
  const typedDataJson = params[1];
  assertAddress(tw, address, { method: "eth_signTypedData_v4", parameter: 0 });
  if (!typedDataJson) {
    throw new Error("eth_signTypedData_v4 requires typed data to sign");
  }
  try {
    const { parseTypedData: parseTypedData2, createEIP712Digest: createEIP712Digest2 } = await import("./eip712-EZPJBFSO.mjs");
    const typedData = parseTypedData2(typedDataJson);
    if (isSafeTransaction(typedData) && typedData.domain.verifyingContract) {
      try {
        const safeAbi = [{
          "constant": true,
          "inputs": [
            { "name": "to", "type": "address" },
            { "name": "value", "type": "uint256" },
            { "name": "data", "type": "bytes" },
            { "name": "operation", "type": "uint8" },
            { "name": "safeTxGas", "type": "uint256" },
            { "name": "baseGas", "type": "uint256" },
            { "name": "gasPrice", "type": "uint256" },
            { "name": "gasToken", "type": "address" },
            { "name": "refundReceiver", "type": "address" },
            { "name": "_nonce", "type": "uint256" }
          ],
          "name": "getTransactionHash",
          "outputs": [{ "name": "", "type": "bytes32" }],
          "payable": false,
          "stateMutability": "view",
          "type": "function"
        }];
        if (!typedData.domain.verifyingContract) {
          throw new Error("EIP-712 typed data missing verifyingContract in domain");
        }
        const safeBase58 = tronBase58FromEvm(tw, typedData.domain.verifyingContract);
        const safeContract = await tw.contract(safeAbi, safeBase58);
        const message = typedData.message;
        const txHash = await safeContract.getTransactionHash(
          message.to,
          message.value,
          message.data,
          message.operation,
          message.safeTxGas,
          message.baseGas,
          message.gasPrice,
          message.gasToken,
          message.refundReceiver,
          message.nonce
        ).call();
        const hashToSign = txHash.txHash || txHash;
        const hashBytes = Buffer.from(strip0x(hashToSign), "hex");
        const { signEcdsa: signEcdsa2 } = await import("./signing-YXJUEP4A.mjs");
        const signature2 = await signEcdsa2(tw, hashBytes);
        let sigString2;
        if (typeof signature2 === "string") {
          sigString2 = signature2;
        } else if (signature2 && typeof signature2 === "object") {
          sigString2 = signature2.signature || signature2;
        } else {
          throw new Error("Invalid signature format from TronWeb");
        }
        const vOffset2 = config?.signatureCompatibility?.vValueOffset ?? 0;
        if (vOffset2 !== 0) {
          const { ensureEthereumSignatureFormat: ensureEthereumSignatureFormat2 } = await import("./ethereum-compatible-signing-PYILQTBO.mjs");
          return ensureEthereumSignatureFormat2(sigString2, vOffset2);
        }
        return to0x(sigString2);
      } catch (safeError) {
      }
    }
    if (!typedData.domain.chainId) {
      if (typedData.domain.verifyingContract) {
        try {
          const minimalAbi = [{
            "constant": true,
            "inputs": [],
            "name": "getChainId",
            "outputs": [{ "name": "", "type": "uint256" }],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
          }];
          if (!typedData.domain.verifyingContract) {
            throw new Error("EIP-712 typed data missing verifyingContract in domain");
          }
          const contractBase58 = tronBase58FromEvm(tw, typedData.domain.verifyingContract);
          const contract = await tw.contract(minimalAbi, contractBase58);
          const onChainChainId = await contract.getChainId().call();
          typedData.domain.chainId = onChainChainId.toString();
        } catch (error) {
          const chainIdHex = getChainIdHex();
          typedData.domain.chainId = parseInt(chainIdHex, 16);
        }
      } else {
        const chainIdHex = getChainIdHex();
        typedData.domain.chainId = parseInt(chainIdHex, 16);
      }
    }
    const digest = createEIP712Digest2(typedData);
    const digestBytes = Buffer.from(strip0x(digest), "hex");
    const { signEcdsa } = await import("./signing-YXJUEP4A.mjs");
    const signature = await signEcdsa(tw, digestBytes);
    let sigString;
    if (typeof signature === "string") {
      sigString = signature;
    } else if (signature && typeof signature === "object") {
      sigString = signature.signature || signature;
    } else {
      throw new Error("Invalid signature format from TronWeb");
    }
    const vOffset = config?.signatureCompatibility?.vValueOffset ?? 0;
    if (vOffset !== 0) {
      const { ensureEthereumSignatureFormat: ensureEthereumSignatureFormat2 } = await import("./ethereum-compatible-signing-PYILQTBO.mjs");
      return ensureEthereumSignatureFormat2(sigString, vOffset);
    }
    return to0x(sigString);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_signTypedData_v4 failed: ${msg}`);
  }
};
var eth_signTypedData = eth_signTypedData_v4;
var eth_signTypedData_v3 = eth_signTypedData_v4;

// src/tronWeb/methods/contracts.ts
import { toHex as toHex6 } from "viem";
var eth_call = async (params, { tw, config }) => {
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
    property: "transaction.to"
  });
  if (blockTag != null && blockTag !== "latest" && blockTag !== "pending")
    throw new Error(
      "eth_call currently supports only latest or pending block tags on Tron transport."
    );
  const caller = resolveFromAddress(tw, config, callRequest.from, {
    method: "eth_call",
    property: "transaction.from",
    allowZeroFallback: true
  });
  const contractBase58 = tronBase58FromEvm(tw, toAddress);
  const feeLimit = resolveFeeLimit(
    config?.callOptions?.feeLimit,
    DEFAULT_FEE_LIMIT,
    "callOptions.feeLimit"
  );
  const callValueSun = toSun(callRequest.value, "transaction.value");
  const dataHex = normalizeHex(callRequest.data ?? callRequest.input);
  const rawParameter = strip0x(dataHex);
  const options = { feeLimit };
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
    issuerAddress
  );
  if (!result) return "0x";
  if (result?.result?.result === false) {
    const message = extractTronErrorMessage(result);
    const reason = message ?? "execution reverted";
    throw new Error(`eth_call reverted: ${reason}`);
  }
  const constantResult = Array.isArray(result?.constant_result) ? result.constant_result.find((item) => typeof item === "string") : void 0;
  return to0x(constantResult ?? "");
};
var eth_estimateGas = async (params, { tw, config }) => {
  const txRequest = params[0];
  if (!txRequest) {
    throw new Error("eth_estimateGas requires a transaction object");
  }
  const fromAddress = resolveFromAddress(tw, config, txRequest.from, {
    method: "eth_estimateGas",
    property: "transaction.from",
    allowZeroFallback: true
  });
  if (!txRequest.data || strip0x(txRequest.data).length === 0) {
    return toHex6(21e3);
  }
  if (txRequest.to) {
    const toAddress = assertAddress(tw, txRequest.to, {
      method: "eth_estimateGas",
      parameter: 0,
      property: "transaction.to"
    });
    try {
      const result = await tw.transactionBuilder.triggerConstantContract(
        tronBase58FromEvm(tw, toAddress),
        "",
        {
          feeLimit: 15e7,
          // High limit for estimation
          input: strip0x(txRequest.data),
          callValue: toSun(txRequest.value, "transaction.value")
        },
        [],
        fromAddress.base58
      );
      if (result?.energy_used) {
        const estimatedGas2 = 3e4 + result.energy_used;
        return toHex6(estimatedGas2);
      }
    } catch {
    }
    const dataBytes = Math.max(0, strip0x(txRequest.data).length / 2);
    const estimatedGas = 3e4 + dataBytes * 68;
    return toHex6(estimatedGas);
  }
  if (txRequest.data && !txRequest.to) {
    const dataBytes = Math.max(0, strip0x(txRequest.data).length / 2);
    const deploymentGas = 5e5 + dataBytes * 68;
    return toHex6(deploymentGas);
  }
  return toHex6(1e5);
};
var eth_getCode = async (params, { tw }) => {
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getCode",
    parameter: 0
  });
  const tronAddress = tronBase58FromEvm(tw, address0x);
  const blockTag = params[1] ?? "latest";
  try {
    const contract = await tw.trx.getContract(tronAddress);
    if (contract) {
      if (contract.bytecode) {
        return to0x(contract.bytecode);
      }
      if (contract.abi || contract.code_hash) {
        return "0x01";
      }
    }
    const account = await tw.trx.getAccount(tronAddress);
    if (account && account.address) {
      return "0x01";
    }
    return "0x";
  } catch (error) {
    if (process.env.DEBUG_TRANSPORT) {
      console.error("eth_getCode error:", error);
    }
    return "0x";
  }
};
var eth_getStorageAt = async (params, { tw }) => {
  assertAddress(tw, params[0], {
    method: "eth_getStorageAt",
    parameter: 0
  });
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
};

// src/tronWeb/methods/logs.ts
import { toHex as toHex8 } from "viem";

// src/tronWeb/utils/events.ts
import { keccak256 as keccak2562, toHex as viemToHex } from "viem";

// src/tronWeb/utils/safe-events.ts
import { keccak256, toHex as toHex7 } from "viem";
var SAFE_EVENTS = {
  // Core execution events
  ExecutionSuccess: {
    signature: "ExecutionSuccess(bytes32,uint256)",
    topic: "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e",
    decode: (log) => ({
      txHash: log.topics[1],
      payment: log.data ? parseInt(log.data, 16) : 0
    })
  },
  ExecutionFailure: {
    signature: "ExecutionFailure(bytes32,uint256)",
    topic: "0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23",
    decode: (log) => ({
      txHash: log.topics[1],
      payment: log.data ? parseInt(log.data, 16) : 0
    })
  },
  // Signature events
  ApproveHash: {
    signature: "ApproveHash(bytes32,address)",
    topic: "0xf2a0eb156472d1440255b0d7c1e19cc07115d1051fe605b0dce69acfec884d9c",
    decode: (log) => ({
      approvedHash: log.topics[1],
      owner: log.topics[2]
    })
  },
  SignMsg: {
    signature: "SignMsg(bytes32)",
    topic: "0xe7f4675038f4f6034dfcbbb24c4dc08e4ebf10eb9d257d3d02c0f38d122ac6e4",
    decode: (log) => ({
      msgHash: log.topics[1]
    })
  },
  // Owner management events
  AddedOwner: {
    signature: "AddedOwner(address)",
    topic: "0x9465fa0c962cc76958e6373a993326400c1c94f8be2fe3a952adfa7f60b2ea26",
    decode: (log) => ({
      owner: log.topics[1]
    })
  },
  RemovedOwner: {
    signature: "RemovedOwner(address)",
    topic: "0xf8d49fc529812e9a7c5c50e69c20f0dccc0db8fa95c98bc58cc9a4f1c1299eaf",
    decode: (log) => ({
      owner: log.topics[1]
    })
  },
  ChangedThreshold: {
    signature: "ChangedThreshold(uint256)",
    topic: "0x610f7ff2b304ae8903c3de74c60c6ab1f7d6226b3f52c5161905bb5ad4039c93",
    decode: (log) => ({
      threshold: log.data ? parseInt(log.data, 16) : 0
    })
  },
  // Module management events
  EnabledModule: {
    signature: "EnabledModule(address)",
    topic: "0xecdf3a3effea5783a3c4c2140e677577666428d44ed9d474a0b3a4c9943f8440",
    decode: (log) => ({
      module: log.topics[1]
    })
  },
  DisabledModule: {
    signature: "DisabledModule(address)",
    topic: "0xaab4fa2b463f581b2b32cb3b7e3b704b9ce37cc209b5fb4d77e593ace4054276",
    decode: (log) => ({
      module: log.topics[1]
    })
  },
  // Fallback handler
  ChangedFallbackHandler: {
    signature: "ChangedFallbackHandler(address)",
    topic: "0x5ac6c46c93c8d0e53714ba3b53db3e7c046da994313d7ed0d192028bc7c228b0",
    decode: (log) => ({
      handler: log.topics[1]
    })
  },
  // Guard
  ChangedGuard: {
    signature: "ChangedGuard(address)",
    topic: "0x1151116914515bc0891ff9047a6cb32cf902546f83066499bcf8ba33d2353fa2",
    decode: (log) => ({
      guard: log.topics[1]
    })
  },
  // Safe setup
  SafeSetup: {
    signature: "SafeSetup(address,address[],uint256,address,address)",
    topic: "0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8",
    decode: (log) => ({
      initiator: log.topics[1]
      // Other parameters are in data, would need full ABI decoding
    })
  },
  // Safe reception
  SafeReceived: {
    signature: "SafeReceived(address,uint256)",
    topic: "0x3d0ce9bfc3ed7d6862dbb28b2dea94561fe714a1b4d019aa8af39730d1ad7c3d",
    decode: (log) => ({
      sender: log.topics[1],
      value: log.data ? parseInt(log.data, 16) : 0
    })
  },
  // Module transaction
  ExecutionFromModuleSuccess: {
    signature: "ExecutionFromModuleSuccess(address)",
    topic: "0x6895c13664aa4f67288b25d7a21d7aaa34916e355fb9b6fae0a139a9085becb8",
    decode: (log) => ({
      module: log.topics[1]
    })
  },
  ExecutionFromModuleFailure: {
    signature: "ExecutionFromModuleFailure(address)",
    topic: "0xacd2c8702804128fdb0db2bb49f6d127dd0181c13fd45dbfe16de0930e2bd375",
    decode: (log) => ({
      module: log.topics[1]
    })
  }
};
function getSafeEventTopics() {
  return Object.values(SAFE_EVENTS).map((event) => event.topic);
}
function identifySafeEvent(log) {
  if (!log.topics || log.topics.length === 0) return null;
  const topic = log.topics[0];
  for (const [name, event] of Object.entries(SAFE_EVENTS)) {
    if (event.topic.toLowerCase() === topic.toLowerCase()) {
      return name;
    }
  }
  return null;
}
function parseSafeEvent(log, currentBlock) {
  const eventName = identifySafeEvent(log);
  if (!eventName) return null;
  const event = SAFE_EVENTS[eventName];
  const blockNumber = typeof log.blockNumber === "string" ? parseInt(log.blockNumber, 16) : log.blockNumber;
  const confirmations = Math.max(0, currentBlock - blockNumber);
  return {
    eventName,
    address: log.address,
    blockNumber,
    transactionHash: log.transactionHash,
    logIndex: typeof log.logIndex === "string" ? parseInt(log.logIndex, 16) : log.logIndex,
    data: event.decode(log),
    confirmed: confirmations >= 19,
    // One full SR cycle
    confirmations
  };
}
var EventCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  // safeAddress -> lastBlockQueried
  getLastBlock(safeAddress) {
    return this.cache.get(safeAddress.toLowerCase()) || 0;
  }
  setLastBlock(safeAddress, blockNumber) {
    this.cache.set(safeAddress.toLowerCase(), blockNumber);
  }
  clear(safeAddress) {
    if (safeAddress) {
      this.cache.delete(safeAddress.toLowerCase());
    } else {
      this.cache.clear();
    }
  }
};
var globalEventCache = new EventCache();
async function pollSafeEvents(tw, safeAddress, options = {}) {
  const {
    fromBlock,
    toBlock = "latest",
    eventNames,
    includeUnconfirmed = true
  } = options;
  const currentBlockData = await tw.trx.getCurrentBlock();
  const currentBlock = currentBlockData?.block_header?.raw_data?.number ?? 0;
  const lastQueriedBlock = fromBlock ?? globalEventCache.getLastBlock(safeAddress);
  const startBlock = Math.max(0, lastQueriedBlock + 1);
  const endBlock = toBlock === "latest" ? currentBlock : toBlock;
  if (startBlock > endBlock) {
    return [];
  }
  const tronAddress = safeAddress.startsWith("T") ? safeAddress : tw.address.fromHex(safeAddress.startsWith("0x") ? `41${strip0x(safeAddress)}` : safeAddress);
  try {
    const events = await tw.event.getEventsByContractAddress(tronAddress, {
      minBlockTimestamp: 0,
      // Use block numbers instead
      maxBlockTimestamp: Date.now(),
      eventName: "",
      // Get all events
      onlyConfirmed: false,
      onlyUnconfirmed: false,
      limit: 200
      // Max per request
    });
    if (!events || !Array.isArray(events)) {
      return [];
    }
    const parsedEvents = [];
    for (const event of events) {
      const blockNum = event.block_number;
      if (blockNum < startBlock || blockNum > endBlock) continue;
      const log = {
        address: to0x(event.contract_address || tronAddress),
        topics: [event.event_name || "", ...event.result?._topics || []],
        data: event.result?._data || "0x",
        blockNumber: toHex7(blockNum),
        transactionHash: to0x(event.transaction_id),
        logIndex: toHex7(event.log_index ?? 0)
      };
      const parsed = parseSafeEvent(log, currentBlock);
      if (parsed) {
        if (eventNames && !eventNames.includes(parsed.eventName)) {
          continue;
        }
        if (!includeUnconfirmed && !parsed.confirmed) {
          continue;
        }
        parsedEvents.push(parsed);
      }
    }
    globalEventCache.setLastBlock(safeAddress, endBlock);
    return parsedEvents;
  } catch (error) {
    console.error("Error polling Safe events:", error);
    return [];
  }
}
async function getSafeTransactionStatus(tw, safeAddress, safeTxHash) {
  const events = await pollSafeEvents(tw, safeAddress, {
    eventNames: ["ExecutionSuccess", "ExecutionFailure"],
    includeUnconfirmed: false
    // Only confirmed events
  });
  for (const event of events) {
    if (event.data.txHash?.toLowerCase() === safeTxHash.toLowerCase()) {
      return {
        executed: true,
        success: event.eventName === "ExecutionSuccess",
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
    }
  }
  return { executed: false };
}
async function getSafeTransactionSignatures(tw, safeAddress, safeTxHash) {
  const events = await pollSafeEvents(tw, safeAddress, {
    eventNames: ["ApproveHash"]
  });
  const signers = [];
  for (const event of events) {
    if (event.data.approvedHash?.toLowerCase() === safeTxHash.toLowerCase()) {
      signers.push(event.data.owner);
    }
  }
  return signers;
}
function clearSafeEventCache(safeAddress) {
  globalEventCache.clear(safeAddress);
}
function computeEventTopic(signature) {
  return keccak256(Buffer.from(signature, "utf8"));
}

// src/tronWeb/utils/events.ts
function convertEventTopics(event) {
  const topics = [];
  if (event.event) {
    const signature = event.event.replace(/indexed /g, "").replace(/\s+/g, " ").trim();
    const match = signature.match(/^(\w+)\((.*)\)$/);
    if (match) {
      const name = match[1];
      const params = match[2];
      const canonicalParams = params.split(",").map((p) => p.trim().split(" ")[0]).join(",");
      const canonicalSig = `${name}(${canonicalParams})`;
      topics.push(keccak2562(viemToHex(canonicalSig)));
    }
  } else if (event.event_name) {
    const safeEvent = Object.values(SAFE_EVENTS).find(
      (e) => e.signature.startsWith(event.event_name + "(")
    );
    if (safeEvent) {
      topics.push(safeEvent.topic);
    } else if (event.event_name === "Transfer") {
      topics.push("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
    } else if (event.event_name === "Approval") {
      topics.push("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925");
    } else {
      topics.push(keccak2562(viemToHex(event.event_name + "()")));
    }
  }
  if (event.result && event.result_type && event.event) {
    const eventSig = event.event;
    for (const key of Object.keys(event.result_type)) {
      if (/^\d+$/.test(key)) continue;
      const regex = new RegExp(`${event.result_type[key]}\\s+indexed\\s+${key}`);
      if (regex.test(eventSig)) {
        const value = event.result[key];
        if (value) {
          if (event.result_type[key] === "address") {
            const cleaned = strip0x(value);
            topics.push("0x" + cleaned.padStart(64, "0"));
          } else {
            const cleaned = strip0x(value);
            topics.push("0x" + cleaned.padStart(64, "0"));
          }
        }
      }
    }
  }
  return topics;
}
function convertEventData(event) {
  let data = "0x";
  if (event.result && event.result_type && event.event) {
    const nonIndexedValues = [];
    const eventSig = event.event;
    for (const key of Object.keys(event.result_type)) {
      if (/^\d+$/.test(key)) continue;
      const regex = new RegExp(`${event.result_type[key]}\\s+indexed\\s+${key}`);
      if (!regex.test(eventSig)) {
        const value = event.result[key];
        if (value !== void 0) {
          if (event.result_type[key] === "address") {
            const cleaned = strip0x(String(value));
            nonIndexedValues.push(cleaned.padStart(64, "0"));
          } else if (event.result_type[key].startsWith("uint") || event.result_type[key].startsWith("int")) {
            const num = BigInt(value);
            nonIndexedValues.push(num.toString(16).padStart(64, "0"));
          } else if (event.result_type[key] === "bool") {
            const boolVal = value ? "1" : "0";
            nonIndexedValues.push(boolVal.padStart(64, "0"));
          } else if (event.result_type[key].startsWith("bytes")) {
            nonIndexedValues.push(strip0x(String(value)));
          } else {
            nonIndexedValues.push(strip0x(String(value)));
          }
        }
      }
    }
    if (nonIndexedValues.length > 0) {
      data = "0x" + nonIndexedValues.join("");
    }
  }
  return data;
}
function matchesTopicFilter(logTopics, filterTopics) {
  if (filterTopics.length === 0) return true;
  for (let i = 0; i < filterTopics.length; i++) {
    const filterTopic = filterTopics[i];
    if (filterTopic === null) continue;
    const logTopic = logTopics[i];
    if (!logTopic) return false;
    if (Array.isArray(filterTopic)) {
      if (!filterTopic.includes(logTopic)) return false;
    } else {
      if (filterTopic !== logTopic) return false;
    }
  }
  return true;
}

// src/tronWeb/methods/logs.ts
var eth_getLogs = async (params, { tw }) => {
  const filter = params[0];
  if (!filter) {
    throw new Error("eth_getLogs requires a filter object");
  }
  const fromBlock = filter.fromBlock ?? "latest";
  const toBlock = filter.toBlock ?? "latest";
  const addresses = Array.isArray(filter.address) ? filter.address : filter.address ? [filter.address] : [];
  const topics = filter.topics ?? [];
  const fromBlockNum = await resolveBlockNumber(tw, fromBlock);
  const toBlockNum = await resolveBlockNumber(tw, toBlock);
  const logs = [];
  for (const addr of addresses) {
    if (!addr) continue;
    const address0x = assertAddress(tw, addr, {
      method: "eth_getLogs",
      parameter: 0,
      property: "filter.address"
    });
    const tronAddr = tronBase58FromEvm(tw, address0x);
    try {
      const options = {
        since: fromBlockNum,
        to: toBlockNum
      };
      if (filter.eventName) {
        options.eventName = filter.eventName;
      }
      const response = await tw.event.getEventsByContractAddress(
        tronAddr,
        options
      );
      let events = [];
      if (response && response.data && Array.isArray(response.data)) {
        events = response.data;
      } else if (Array.isArray(response)) {
        events = response;
      }
      if (events.length > 0) {
        for (const event of events) {
          const log = {
            address: tronAddressTo0x(tw, event.contract_address || event.contract) ?? ZERO_ADDRESS,
            topics: convertEventTopics(event),
            data: convertEventData(event),
            blockNumber: event.block_number != null ? toHex8(event.block_number) : event.block != null ? toHex8(event.block) : null,
            blockHash: null,
            // Tron doesn't provide block hash in events
            transactionHash: event.transaction_id ? `0x${event.transaction_id}` : null,
            transactionIndex: "0x0",
            logIndex: toHex8(event.event_index ?? event.log_index ?? logs.length),
            removed: false
          };
          if (matchesTopicFilter(log.topics, topics)) {
            logs.push(log);
          }
        }
      }
    } catch {
    }
  }
  return logs;
};

// src/tronWeb/methods/gas.ts
import { toHex as toHex9 } from "viem";
var eth_gasPrice = async (_params, { tw }) => {
  try {
    const chainParams = await tw.trx.getChainParameters();
    const energyParam = chainParams?.find((p) => p.key === "getEnergyFee");
    const energyPrice = energyParam?.value || 100;
    return toHex9(energyPrice);
  } catch {
    return toHex9(100);
  }
};
var eth_maxPriorityFeePerGas = async () => {
  return "0x0";
};
var eth_feeHistory = async (params, { tw }) => {
  const blockCount = Number(params[0] || 1);
  const newestBlock = params[1] || "latest";
  const rewardPercentiles = params[2] || [];
  let endBlockNumber;
  if (newestBlock === "latest" || newestBlock === "pending") {
    const block = await tw.trx.getCurrentBlock();
    endBlockNumber = block?.block_header?.raw_data?.number || 0;
  } else {
    endBlockNumber = typeof newestBlock === "string" ? parseInt(newestBlock, 16) : Number(newestBlock);
  }
  const startBlockNumber = Math.max(0, endBlockNumber - blockCount + 1);
  let energyPrice = 100;
  try {
    const chainParams = await tw.trx.getChainParameters();
    const energyParam = chainParams?.find((p) => p.key === "getEnergyFee");
    if (energyParam?.value) {
      energyPrice = energyParam.value;
    }
  } catch {
  }
  const baseFeePerGas = [];
  const gasUsedRatio = [];
  const reward = [];
  for (let i = 0; i < blockCount; i++) {
    baseFeePerGas.push(toHex9(energyPrice));
    gasUsedRatio.push(0.5);
    if (rewardPercentiles && rewardPercentiles.length > 0) {
      reward.push(rewardPercentiles.map(() => "0x0"));
    }
  }
  const response = {
    oldestBlock: toHex9(startBlockNumber),
    baseFeePerGas,
    gasUsedRatio
  };
  if (reward.length > 0) {
    response.reward = reward;
  }
  return response;
};

// src/tronWeb/methods/registry.ts
var METHOD_REGISTRY = {
  // Chain methods
  "eth_chainId": async (_params, { getChainIdHex }) => getChainIdHex(),
  // Block methods
  "eth_blockNumber": eth_blockNumber,
  "eth_getBlockByNumber": eth_getBlockByNumber,
  "eth_getBlockByHash": eth_getBlockByHash,
  // Account methods
  "eth_getBalance": eth_getBalance,
  "eth_getTransactionCount": eth_getTransactionCount,
  "eth_accounts": eth_accounts,
  "net_version": net_version,
  // Transaction methods
  "eth_sendTransaction": eth_sendTransaction,
  "eth_sendRawTransaction": eth_sendRawTransaction,
  "eth_getTransactionReceipt": eth_getTransactionReceipt,
  "eth_getTransaction": eth_getTransaction,
  "eth_getTransactionByHash": eth_getTransactionByHash,
  "eth_sign": eth_sign,
  "personal_sign": personal_sign,
  "eth_signTypedData": eth_signTypedData,
  "eth_signTypedData_v3": eth_signTypedData_v3,
  "eth_signTypedData_v4": eth_signTypedData_v4,
  // Contract methods
  "eth_call": eth_call,
  "eth_estimateGas": eth_estimateGas,
  "eth_getCode": eth_getCode,
  "eth_getStorageAt": eth_getStorageAt,
  // Log methods
  "eth_getLogs": eth_getLogs,
  // Gas and fee methods
  "eth_gasPrice": eth_gasPrice,
  "eth_maxPriorityFeePerGas": eth_maxPriorityFeePerGas,
  "eth_feeHistory": eth_feeHistory,
  // Unsupported filter methods (throw error)
  "eth_newFilter": async () => {
    throw new Error("Method not supported by Tron transport: eth_newFilter");
  },
  "eth_getFilterChanges": async () => {
    throw new Error("Method not supported by Tron transport: eth_getFilterChanges");
  },
  "eth_getFilterLogs": async () => {
    throw new Error("Method not supported by Tron transport: eth_getFilterLogs");
  },
  "eth_uninstallFilter": async () => {
    throw new Error("Method not supported by Tron transport: eth_uninstallFilter");
  }
};

// src/tronWeb/utils/signature-validation.ts
async function validateSignature(tw, message, signature, expectedSigner, mode = "tron") {
  try {
    const messageBytes = typeof message === "string" ? Buffer.from(strip0x(message), "hex") : message;
    let prefixedMessage;
    if (mode === "ethereum") {
      const prefix = `Ethereum Signed Message:
${messageBytes.length}`;
      const prefixBytes = Buffer.from(prefix, "utf8");
      prefixedMessage = Buffer.concat([prefixBytes, messageBytes]);
    } else {
      prefixedMessage = messageBytes;
    }
    const recovered = await recoverSigner(tw, prefixedMessage, signature, mode);
    if (!recovered) {
      return {
        valid: false,
        error: "Failed to recover signer from signature",
        hints: [
          "Signature may be malformed",
          "Check that signature is in correct format (0x-prefixed hex, 65 bytes)",
          "Verify v value is 27 or 28 (or 0/1 before adjustment)"
        ],
        mode
      };
    }
    const recoveredNormalized = normalizeAddress(tw, recovered);
    const expectedNormalized = normalizeAddress(tw, expectedSigner);
    const valid = recoveredNormalized.toLowerCase() === expectedNormalized.toLowerCase();
    if (!valid) {
      return {
        valid: false,
        recoveredAddress: recoveredNormalized,
        error: `Signature verification failed: recovered ${recoveredNormalized}, expected ${expectedNormalized}`,
        hints: generateValidationHints(mode, recoveredNormalized, expectedNormalized),
        mode
      };
    }
    return {
      valid: true,
      recoveredAddress: recoveredNormalized,
      mode
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
      hints: [
        "Check that TronWeb instance is properly initialized",
        "Verify message format is correct",
        "Ensure signature is valid hex string"
      ],
      mode
    };
  }
}
async function validateTypedDataSignature(tw, typedData, signature, expectedSigner, mode = "tron") {
  try {
    const parsed = typeof typedData === "string" ? parseTypedData(typedData) : typedData;
    const digest = createEIP712Digest(parsed);
    const digestBytes = Buffer.from(strip0x(digest), "hex");
    const recovered = await recoverSigner(tw, digestBytes, signature, mode);
    if (!recovered) {
      return {
        valid: false,
        error: "Failed to recover signer from EIP-712 signature",
        hints: [
          "Check EIP-712 domain separator matches contract",
          "Verify all type definitions are correct",
          "Ensure message fields match exactly"
        ],
        mode
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
          "EIP-712 domain may not match Safe contract configuration",
          `Check chainId in domain (parsed: ${parsed.domain.chainId})`,
          `Check verifyingContract matches Safe address`,
          `Verify signature mode (${mode}) matches contract expectations`
        ],
        mode
      };
    }
    return {
      valid: true,
      recoveredAddress: recoveredNormalized,
      mode
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
      hints: [
        "EIP-712 typed data may be malformed",
        "Check that all required fields are present",
        "Verify types match contract ABI"
      ],
      mode
    };
  }
}
async function validateSignatureBothModes(tw, message, signature, expectedSigner) {
  const [tronResult, ethereumResult] = await Promise.all([
    validateSignature(tw, message, signature, expectedSigner, "tron"),
    validateSignature(tw, message, signature, expectedSigner, "ethereum")
  ]);
  let recommendation;
  if (tronResult.valid && !ethereumResult.valid) {
    recommendation = "Use Tron mode (signatureCompatibility.useEthereumPrefix: false)";
  } else if (!tronResult.valid && ethereumResult.valid) {
    recommendation = "Use Ethereum mode (signatureCompatibility.useEthereumPrefix: true)";
  } else if (tronResult.valid && ethereumResult.valid) {
    recommendation = "Both modes work - use Tron mode for better performance";
  } else {
    recommendation = "Neither mode works - check message and signature are correct";
  }
  return {
    tron: tronResult,
    ethereum: ethereumResult,
    recommendation
  };
}
async function recoverSigner(tw, message, signature, mode) {
  try {
    const formattedSig = ensureEthereumSignatureFormat(signature);
    const sigHex = strip0x(formattedSig);
    if (sigHex.length !== 130) {
      return null;
    }
    const r = "0x" + sigHex.slice(0, 64);
    const s = "0x" + sigHex.slice(64, 128);
    let v = parseInt(sigHex.slice(128, 130), 16);
    if (v < 27) {
      v += 27;
    }
    const messageHash = tw.utils.code.generateHashedMessage(message);
    if (typeof tw.trx.verifyMessage === "function") {
      try {
        const recovered = await tw.trx.verifyMessage(message, formattedSig);
        if (recovered) {
          return to0x(tw.address.toHex(recovered));
        }
      } catch {
      }
    }
    return null;
  } catch {
    return null;
  }
}
function normalizeAddress(tw, address) {
  try {
    if (address.startsWith("0x")) {
      return address.toLowerCase();
    }
    if (address.startsWith("T")) {
      const hex = tw.address.toHex(address);
      return to0x(hex.slice(2)).toLowerCase();
    }
    if (address.startsWith("41")) {
      return to0x(address.slice(2)).toLowerCase();
    }
    return address.toLowerCase();
  } catch {
    return address.toLowerCase();
  }
}
function generateValidationHints(mode, recovered, expected) {
  const hints = [];
  hints.push(`Recovered address: ${recovered}`);
  hints.push(`Expected address: ${expected}`);
  if (mode === "tron") {
    hints.push("Currently using Tron signature mode (\\x19TRON Signed Message)");
    hints.push("Try Ethereum mode if Safe contract expects Ethereum signatures:");
    hints.push("  Set signatureCompatibility.useEthereumPrefix: true");
  } else {
    hints.push("Currently using Ethereum signature mode (\\x19Ethereum Signed Message)");
    hints.push("Try Tron mode if Safe contract is Tron-adapted:");
    hints.push("  Set signatureCompatibility.useEthereumPrefix: false");
  }
  hints.push("Other possible causes:");
  hints.push("  - Wrong private key used for signing");
  hints.push("  - Message content does not match what was signed");
  hints.push("  - Signature v value needs adjustment");
  return hints;
}
async function createTestSignature(tw, message, mode = "tron") {
  const messageBytes = typeof message === "string" ? Buffer.from(strip0x(message), "hex") : message;
  if (mode === "ethereum") {
    return await signWithEthereumPrefix(tw, messageBytes);
  } else {
    const signature = await tw.trx.signMessageV2(messageBytes);
    return ensureEthereumSignatureFormat(signature);
  }
}
function formatValidationResult(result) {
  const lines = [];
  lines.push(`
=== Signature Validation Result (${result.mode} mode) ===`);
  lines.push(`Valid: ${result.valid ? "\u2713 YES" : "\u2717 NO"}`);
  if (result.recoveredAddress) {
    lines.push(`Recovered: ${result.recoveredAddress}`);
  }
  if (result.error) {
    lines.push(`
Error: ${result.error}`);
  }
  if (result.hints && result.hints.length > 0) {
    lines.push("\nHints:");
    result.hints.forEach((hint) => lines.push(`  \u2022 ${hint}`));
  }
  lines.push("");
  return lines.join("\n");
}

// src/tronWeb/utils/tron-account.ts
import { toAccount } from "viem/accounts";
function createTronAccount(address) {
  const account = toAccount({
    address,
    async signMessage({ message }) {
      throw new Error(
        "signMessage should be handled by Tron transport. Ensure your transport is properly configured."
      );
    },
    async signTransaction(transaction) {
      throw new Error(
        'signTransaction should be handled by Tron transport. This error means viem is trying to sign locally instead of delegating to the transport. Ensure the account type is "json-rpc".'
      );
    },
    async signTypedData(typedData) {
      throw new Error(
        "signTypedData should be handled by Tron transport. Ensure your transport is properly configured."
      );
    }
  });
  account.type = "json-rpc";
  return account;
}
function createTronAccountFromTronWeb(tw) {
  const tronHex41 = tw.defaultAddress?.hex;
  if (!tronHex41) {
    throw new Error(
      "TronWeb instance does not have a default address. Ensure TronWeb is initialized with a private key or default address."
    );
  }
  const address = tronHex41To0x(tronHex41);
  if (!address) {
    throw new Error(
      `Failed to convert TronWeb address to EVM format. Got: ${tronHex41}`
    );
  }
  return createTronAccount(address);
}
function isTronAccount(account) {
  return account.type === "json-rpc";
}

// src/tronWeb/utils/safe-protocol-kit.ts
import Safe from "@safe-global/protocol-kit";

// src/tronWeb/utils/safe-address-prediction.ts
import {
  concat,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256 as keccak2563,
  parseAbi,
  parseAbiParameters
} from "viem";
var SAFE_PROXY_CREATION_CODE = "0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564";
var SAFE_SETUP_ABI = parseAbi([
  "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)"
]);
function predictSafeAddress(tronWeb2, factoryAddress, singletonAddress, setupConfig, saltNonce) {
  const factoryTronHex = tronWeb2.address.toHex(factoryAddress);
  if (!factoryTronHex.startsWith("41")) {
    throw new Error("Factory address must be in Tron format (should start with 41 when converted)");
  }
  const singletonEvmHex = tronWeb2.address.toHex(singletonAddress);
  const singletonEvm = "0x" + singletonEvmHex.slice(2);
  const ownersEvm = setupConfig.owners.map((owner) => {
    const hex = tronWeb2.address.toHex(owner);
    return "0x" + hex.slice(2);
  });
  const toEvm = setupConfig.to ? "0x" + tronWeb2.address.toHex(setupConfig.to).slice(2) : "0x0000000000000000000000000000000000000000";
  const fallbackHandlerEvm = setupConfig.fallbackHandler ? "0x" + tronWeb2.address.toHex(setupConfig.fallbackHandler).slice(2) : "0x0000000000000000000000000000000000000000";
  const paymentTokenEvm = setupConfig.paymentToken ? "0x" + tronWeb2.address.toHex(setupConfig.paymentToken).slice(2) : "0x0000000000000000000000000000000000000000";
  const paymentReceiverEvm = setupConfig.paymentReceiver ? "0x" + tronWeb2.address.toHex(setupConfig.paymentReceiver).slice(2) : "0x0000000000000000000000000000000000000000";
  const initializer = encodeFunctionData({
    abi: SAFE_SETUP_ABI,
    functionName: "setup",
    args: [
      ownersEvm,
      BigInt(setupConfig.threshold),
      toEvm,
      setupConfig.data || "0x",
      fallbackHandlerEvm,
      paymentTokenEvm,
      setupConfig.payment || 0n,
      paymentReceiverEvm
    ]
  });
  const initializerHash = keccak2563(initializer);
  const finalSaltNonce = saltNonce || getDefaultSaltNonce();
  const salt = keccak2563(encodePacked(
    ["bytes32", "uint256"],
    [initializerHash, finalSaltNonce]
  ));
  const singletonEncoded = encodeAbiParameters(
    parseAbiParameters("address"),
    [singletonEvm]
  );
  const deploymentData = concat([
    SAFE_PROXY_CREATION_CODE,
    singletonEncoded
  ]);
  const deploymentCodeHash = keccak2563(deploymentData);
  const create2Input = concat([
    "0x" + factoryTronHex,
    // 21-byte factory (with 41 prefix)
    salt,
    deploymentCodeHash
  ]);
  const create2Hash = keccak2563(create2Input);
  return "0x" + create2Hash.slice(-40);
}
function getDefaultSaltNonce() {
  throw new Error("Salt nonce must be provided for Tron Safe address prediction. Protocol Kit generates random salts that we cannot predict.");
}
function extractSaltNonceFromTransaction(transactionData) {
  const params = "0x" + transactionData.slice(10);
  const [, , saltNonce] = decodeAbiParameters(
    parseAbiParameters("address, bytes, uint256"),
    params
  );
  return saltNonce;
}

// src/tronWeb/utils/safe-protocol-kit.ts
var TRON_NILE_SAFE_ADDRESSES = {
  safeSingletonAddress: "TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7",
  safeProxyFactoryAddress: "TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4",
  multiSendAddress: "TA6aGB9RuMhQmb6posn2CAuVP1v59umMyK",
  multiSendCallOnlyAddress: "TUwaFFMwfksrBBhZvgSrpHeRgTzknV7Kxo",
  fallbackHandlerAddress: "TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC",
  signMessageLibAddress: "TRT4fbYAxrE84vN5yLyQD4G43LE6vvYSV3",
  createCallAddress: "TCBuMSa41FJUpW3afFQQgW5r4xYCnjdhPa",
  simulateTxAccessorAddress: "TJKPHTNkYKcb9nDgULdrZFF17gQipTXMVy"
};
async function initSafeProtocolKit(config, safeAddress) {
  const { tronWeb: tronWeb2, walletClient, contractNetworks } = config;
  const convertedNetworks = contractNetworks ? {} : void 0;
  if (contractNetworks && convertedNetworks) {
    for (const [chainId, addresses] of Object.entries(contractNetworks)) {
      convertedNetworks[chainId] = {};
      for (const [key, address] of Object.entries(addresses)) {
        if (address) {
          const evmAddress = tronAddressTo0x(tronWeb2, address);
          if (!evmAddress) {
            throw new Error(`Failed to convert address ${address} to EVM format`);
          }
          convertedNetworks[chainId][key] = evmAddress;
        }
      }
    }
  }
  const initConfig = {
    provider: walletClient,
    contractNetworks: convertedNetworks
  };
  if (safeAddress) {
    const evmSafeAddress = tronAddressTo0x(tronWeb2, safeAddress);
    if (!evmSafeAddress) {
      throw new Error(`Failed to convert Safe address ${safeAddress} to EVM format`);
    }
    initConfig.safeAddress = evmSafeAddress;
  }
  return await Safe.init(initConfig);
}
function createPredictedSafe(tronWeb2, owners, threshold, setupOptions, safeDeploymentConfig) {
  const ownersEvm = owners.map((owner) => {
    const evmAddr = tronAddressTo0x(tronWeb2, owner);
    if (!evmAddr) {
      throw new Error(`Failed to convert Tron address to EVM format: ${owner}`);
    }
    return evmAddr;
  });
  const safeAccountConfig = {
    owners: ownersEvm,
    threshold
  };
  if (setupOptions?.to) {
    const toEvm = tronAddressTo0x(tronWeb2, setupOptions.to);
    if (!toEvm) throw new Error(`Failed to convert to address: ${setupOptions.to}`);
    safeAccountConfig.to = toEvm;
  }
  if (setupOptions?.data) {
    safeAccountConfig.data = setupOptions.data;
  }
  if (setupOptions?.fallbackHandler) {
    const fallbackEvm = tronAddressTo0x(tronWeb2, setupOptions.fallbackHandler);
    if (!fallbackEvm) throw new Error(`Failed to convert fallback handler: ${setupOptions.fallbackHandler}`);
    safeAccountConfig.fallbackHandler = fallbackEvm;
  }
  if (setupOptions?.paymentToken) {
    const tokenEvm = tronAddressTo0x(tronWeb2, setupOptions.paymentToken);
    if (!tokenEvm) throw new Error(`Failed to convert payment token: ${setupOptions.paymentToken}`);
    safeAccountConfig.paymentToken = tokenEvm;
  }
  if (setupOptions?.payment !== void 0) {
    safeAccountConfig.payment = setupOptions.payment;
  }
  if (setupOptions?.paymentReceiver) {
    const receiverEvm = tronAddressTo0x(tronWeb2, setupOptions.paymentReceiver);
    if (!receiverEvm) throw new Error(`Failed to convert payment receiver: ${setupOptions.paymentReceiver}`);
    safeAccountConfig.paymentReceiver = receiverEvm;
  }
  return {
    safeAccountConfig,
    safeDeploymentConfig
  };
}
async function deploySafeWithProtocolKit(config, owners, threshold, setupOptions, saltNonce) {
  const { tronWeb: tronWeb2, walletClient, contractNetworks } = config;
  const convertedNetworks = contractNetworks ? {} : void 0;
  if (contractNetworks && convertedNetworks) {
    for (const [chainId2, addresses] of Object.entries(contractNetworks)) {
      convertedNetworks[chainId2] = {};
      for (const [key, address] of Object.entries(addresses)) {
        if (address) {
          const evmAddress = tronAddressTo0x(tronWeb2, address);
          if (!evmAddress) {
            throw new Error(`Failed to convert address ${address} to EVM format`);
          }
          convertedNetworks[chainId2][key] = evmAddress;
        }
      }
    }
  }
  const safeDeploymentConfig = saltNonce ? { saltNonce } : void 0;
  const predictedSafe = createPredictedSafe(tronWeb2, owners, threshold, setupOptions, safeDeploymentConfig);
  const protocolKit = await Safe.init({
    provider: walletClient,
    predictedSafe,
    contractNetworks: convertedNetworks
  });
  const chainId = await walletClient.getChainId();
  const contracts = contractNetworks?.[chainId.toString()];
  if (!contracts) {
    throw new Error(`No contract addresses configured for chainId ${chainId}`);
  }
  if (!contracts.safeProxyFactoryAddress || !contracts.safeSingletonAddress) {
    throw new Error("Missing required contract addresses: safeProxyFactoryAddress and safeSingletonAddress");
  }
  const setupConfig = {
    owners,
    threshold
  };
  if (setupOptions?.to) setupConfig.to = setupOptions.to;
  if (setupOptions?.data) setupConfig.data = setupOptions.data;
  if (setupOptions?.fallbackHandler) {
    setupConfig.fallbackHandler = setupOptions.fallbackHandler;
  } else if (contracts.fallbackHandlerAddress) {
    setupConfig.fallbackHandler = contracts.fallbackHandlerAddress;
  }
  if (setupOptions?.paymentToken) setupConfig.paymentToken = setupOptions.paymentToken;
  if (setupOptions?.payment !== void 0) setupConfig.payment = BigInt(setupOptions.payment);
  if (setupOptions?.paymentReceiver) setupConfig.paymentReceiver = setupOptions.paymentReceiver;
  const safeAddress = predictSafeAddress(
    tronWeb2,
    contracts.safeProxyFactoryAddress,
    contracts.safeSingletonAddress,
    setupConfig,
    saltNonce ? BigInt(saltNonce) : void 0
  );
  return {
    protocolKit,
    safeAddress
    // This now uses Tron CREATE2 and will match actual deployment!
  };
}
async function connectToSafe(config, safeAddress) {
  return initSafeProtocolKit(config, safeAddress);
}

// src/tronWeb/utils/safe-address-prediction-bytecode-agnostic.ts
import {
  concat as concat2,
  decodeAbiParameters as decodeAbiParameters2,
  encodeAbiParameters as encodeAbiParameters2,
  encodeFunctionData as encodeFunctionData2,
  encodePacked as encodePacked2,
  keccak256 as keccak2564,
  parseAbi as parseAbi2,
  parseAbiParameters as parseAbiParameters2
} from "viem";
var SAFE_SETUP_ABI2 = parseAbi2([
  "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)"
]);
var PROXY_FACTORY_ABI = parseAbi2([
  "function proxyCreationCode() public pure returns (bytes memory)"
]);
var PROXY_CODE_CACHE = /* @__PURE__ */ new Map();
async function getProxyCreationCode(walletClient, factoryAddress, useCache = true) {
  if (useCache && PROXY_CODE_CACHE.has(factoryAddress)) {
    return PROXY_CODE_CACHE.get(factoryAddress);
  }
  const data = encodeFunctionData2({
    abi: PROXY_FACTORY_ABI,
    functionName: "proxyCreationCode"
  });
  const result = await walletClient.request({
    method: "eth_call",
    params: [{
      to: factoryAddress,
      data
    }, "latest"]
  });
  const decoded = decodeAbiParameters2(
    parseAbiParameters2("bytes"),
    result
  );
  const proxyCode = decoded[0];
  PROXY_CODE_CACHE.set(factoryAddress, proxyCode);
  return proxyCode;
}
async function predictSafeAddressWithBytecode(tronWeb2, walletClient, factoryAddress, singletonAddress, setupConfig, saltNonce, options = {}) {
  const { useCache = true } = options;
  const factoryTronHex = tronWeb2.address.toHex(factoryAddress);
  if (!factoryTronHex.startsWith("41")) {
    throw new Error("Factory address must be in Tron format (should start with 41 when converted)");
  }
  const factoryEvm = "0x" + factoryTronHex.slice(2);
  const proxyCreationCode = await getProxyCreationCode(walletClient, factoryEvm, useCache);
  const singletonEvmHex = tronWeb2.address.toHex(singletonAddress);
  const singletonEvm = "0x" + singletonEvmHex.slice(2);
  const ownersEvm = setupConfig.owners.map((owner) => {
    const hex = tronWeb2.address.toHex(owner);
    return "0x" + hex.slice(2);
  });
  const toEvm = setupConfig.to ? "0x" + tronWeb2.address.toHex(setupConfig.to).slice(2) : "0x0000000000000000000000000000000000000000";
  const fallbackHandlerEvm = setupConfig.fallbackHandler ? "0x" + tronWeb2.address.toHex(setupConfig.fallbackHandler).slice(2) : "0x0000000000000000000000000000000000000000";
  const paymentTokenEvm = setupConfig.paymentToken ? "0x" + tronWeb2.address.toHex(setupConfig.paymentToken).slice(2) : "0x0000000000000000000000000000000000000000";
  const paymentReceiverEvm = setupConfig.paymentReceiver ? "0x" + tronWeb2.address.toHex(setupConfig.paymentReceiver).slice(2) : "0x0000000000000000000000000000000000000000";
  const initializer = encodeFunctionData2({
    abi: SAFE_SETUP_ABI2,
    functionName: "setup",
    args: [
      ownersEvm,
      BigInt(setupConfig.threshold),
      toEvm,
      setupConfig.data || "0x",
      fallbackHandlerEvm,
      paymentTokenEvm,
      setupConfig.payment || 0n,
      paymentReceiverEvm
    ]
  });
  const initializerHash = keccak2564(initializer);
  const salt = keccak2564(encodePacked2(
    ["bytes32", "uint256"],
    [initializerHash, saltNonce]
  ));
  const singletonEncoded = encodeAbiParameters2(
    parseAbiParameters2("address"),
    [singletonEvm]
  );
  const deploymentData = concat2([
    proxyCreationCode,
    singletonEncoded
  ]);
  const deploymentCodeHash = keccak2564(deploymentData);
  const create2Input = concat2([
    "0x" + factoryTronHex,
    // 21-byte factory (with 41 prefix)
    salt,
    deploymentCodeHash
  ]);
  const create2Hash = keccak2564(create2Input);
  return "0x" + create2Hash.slice(-40);
}
function clearProxyCodeCache() {
  PROXY_CODE_CACHE.clear();
}

// src/tronWeb/index.ts
function tronWeb(tw, cfg = {}) {
  const {
    key = "tronWeb",
    name = "TronWeb",
    methods,
    retryDelay,
    timeout
  } = cfg;
  return ({ chain, retryCount: defaultRetryCount }) => createTransport(
    {
      key,
      methods,
      name,
      request: buildEip1193Request(tw, {
        chainId: cfg.chainId,
        chain,
        config: cfg
      }),
      retryCount: cfg.retryCount ?? defaultRetryCount,
      retryDelay,
      timeout,
      type: "tronWeb"
    },
    { tronWeb: tw }
  );
}
function buildEip1193Request(tw, opts) {
  const config = opts.config;
  const getChainIdHex = () => {
    if (typeof opts.chainId === "number") return toHex10(opts.chainId);
    if (opts.chain?.id != null) return toHex10(opts.chain.id);
    throw new Error("eth_chainId not configured for Tron transport");
  };
  const req = async ({ method, params }) => {
    const p = Array.isArray(params) ? params : params ? [params] : [];
    const context = {
      tw,
      config,
      getChainIdHex
    };
    const handler = METHOD_REGISTRY[method];
    if (handler) {
      return await handler(p, context);
    }
    throw new Error(`Method not supported by Tron transport: ${method}`);
  };
  return req;
}
export {
  BASE58_REGEX,
  ConfirmationTimeoutError,
  DEFAULT_COMPATIBILITY_CONFIG,
  DEFAULT_FEE_LIMIT,
  SAFE_EVENTS,
  TRON_HEX_PREFIX,
  TRON_NILE_SAFE_ADDRESSES,
  TransactionNotFoundError,
  TransactionRevertedError,
  ZERO_ADDRESS,
  clearProxyCodeCache,
  clearSafeEventCache,
  computeEventTopic,
  connectToSafe,
  createEIP712Digest,
  createEthereumMessageHash,
  createPredictedSafe,
  createTestSignature,
  createTronAccount,
  createTronAccountFromTronWeb,
  decodeTronMessage,
  deploySafeWithProtocolKit,
  ensureEthereumSignatureFormat,
  extractFromAddress,
  extractInputData,
  extractSaltNonceFromTransaction,
  extractSignatureComponents,
  extractToAddress,
  extractTronErrorMessage,
  extractValue,
  formatSafeTransaction,
  formatValidationResult,
  getSafeEventTopics,
  getSafeTransactionSignatures,
  getSafeTransactionStatus,
  getTransactionConfirmations,
  identifySafeEvent,
  initSafeProtocolKit,
  isEthereumCompatibleSignature,
  isTransactionConfirmed,
  isTronAccount,
  isTronBase58,
  normalizeHex,
  normalizeReceipt,
  parseSafeEvent,
  parseTypedData,
  pollSafeEvents,
  predictSafeAddress,
  predictSafeAddressWithBytecode,
  signMessageWithConfig,
  strip0x,
  to0x,
  toBigIntLike,
  toOptionalNumber,
  toSun,
  tronAddressTo0x,
  tronBase58FromEvm,
  tronBase58ToHex41,
  tronHex41To0x,
  tronWeb,
  validateSignature,
  validateSignatureBothModes,
  validateTypedDataSignature,
  waitForTransactionReceipt
};

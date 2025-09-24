import {
  createTransport,
  type EIP1193RequestFn,
  type Transport,
  type TransportConfig,
} from "viem";

type TronWebLike = {
  trx: any;
  transactionBuilder: any;
  address: { fromHex(hex: string): string; toHex(base58: string): string };
  event?: any;
  defaultAddress?: any;
};

export type TronWebSignerContext = {
  tronWeb: TronWebLike;
  request: { method: string; params: any[] };
};

export type TronWebSigner = (
  transaction: any,
  context: TronWebSignerContext,
) => Promise<any>;

type Address = `0x${string}`;

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";
const TRON_HEX_PREFIX = "41";
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;
const DEFAULT_FEE_LIMIT = 15_000_000;

export type TronWebTransportConfig = {
  /** Value to return for `eth_chainId`. If omitted, falls back to `chain.id`. */
  chainId?: number | `0x${string}`;
  /** The key of the transport. */
  key?: TransportConfig["key"] | undefined;
  /** Methods to include or exclude from executing RPC requests. */
  methods?: TransportConfig["methods"] | undefined;
  /** The name of the transport. */
  name?: TransportConfig["name"] | undefined;
  /** The max number of times to retry. */
  retryCount?: TransportConfig["retryCount"] | undefined;
  /** The base delay (in ms) between retries. */
  retryDelay?: TransportConfig["retryDelay"] | undefined;
  /** The timeout (in ms) for requests. */
  timeout?: TransportConfig["timeout"] | undefined;
  /** Default address used when requests omit `from`. Accepts 0x, base58, or 41-hex. */
  defaultFrom?: string | undefined;
  /** Options controlling constant contract calls (`eth_call`). */
  callOptions?: {
    /** Fee limit (SUN) applied when invoking constant calls. */
    feeLimit?: number | undefined;
  };
  /** Options controlling state-changing transactions. */
  sendOptions?: {
    /** Fee limit (SUN) applied when building transactions. */
    feeLimit?: number | undefined;
    /** Custom signer invoked before broadcasting. */
    signer?: TronWebSigner | undefined;
  };
};

export type TronWebTransport = Transport<
  "tronWeb",
  { tronWeb: TronWebLike },
  EIP1193RequestFn
>;

/**
 * @description Creates a transport backed by a TronWeb instance.
 * Note: Only a subset of Ethereum JSON-RPC methods are currently supported.
 */
export function tronWeb(
  tw: TronWebLike,
  cfg: TronWebTransportConfig = {},
): TronWebTransport {
  const {
    key = "tronWeb",
    name = "TronWeb",
    methods,
    retryDelay,
    timeout,
  } = cfg;
  return ({ chain, retryCount: defaultRetryCount }) =>
    createTransport(
      {
        key,
        methods,
        name,
        request: buildEip1193Request(tw, {
          chainId: cfg.chainId,
          chain,
          config: cfg,
        }),
        retryCount: cfg.retryCount ?? defaultRetryCount,
        retryDelay,
        timeout,
        type: "tronWeb",
      },
      { tronWeb: tw },
    );
}

function buildEip1193Request(
  tw: TronWebLike,
  opts: {
    chainId?: number | `0x${string}`;
    chain?: { id: number } | undefined;
    config?: TronWebTransportConfig | undefined;
  },
): EIP1193RequestFn {
  const config = opts.config;
  const getChainIdHex = () => {
    if (typeof opts.chainId === "string") return opts.chainId;
    if (typeof opts.chainId === "number") return toHex(opts.chainId);
    if (opts.chain?.id != null) return toHex(opts.chain.id);
    throw new Error("eth_chainId not configured for Tron transport");
  };

  const req = async ({ method, params }: any) => {
    const p = Array.isArray(params) ? params : params ? [params] : [];

    switch (method) {
      case "eth_chainId":
        return getChainIdHex();

      case "eth_blockNumber": {
        const block = await tw.trx.getCurrentBlock();
        const n =
          block?.block_header?.raw_data?.number ?? block?.block_header?.number;
        return toHex(n ?? 0);
      }

      case "eth_getBalance": {
        const address0x = assertAddress(tw, p[0], { method, parameter: 0 });
        p[0] = address0x;
        const tronAddress = tronBase58FromEvm(tw, address0x);
        const balanceSun = await tw.trx.getBalance(tronAddress);
        return toHex(balanceSun ?? 0);
      }

      case "eth_call":
        return handleEthCall(tw, config, p[0], p[1]);

      case "eth_sendTransaction":
        return handleEthSendTransaction(tw, config, p[0], {
          method,
          params: p,
        });

      case "eth_sendRawTransaction": {
        const raw = strip0x(p[0]);
        const res = await tw.trx.sendRawTransaction(raw);
        const txid = res?.txid ?? res?.transaction?.txID;
        if (!txid) throw new Error("sendRawTransaction: unexpected response");
        return to0x(txid);
      }

      case "eth_getTransactionReceipt": {
        const txid = strip0x(p[0]);
        const info = await tw.trx.getTransactionInfo(txid);
        return info ? normalizeReceipt(tw, info) : null;
      }

      case "eth_getBlockByNumber": {
        const tag = p[0];
        const includeTxs = !!p[1];
        if (tag === "latest" || tag == null) {
          const block = await tw.trx.getCurrentBlock();
          return normalizeBlock(tw, block, includeTxs);
        }
        const n =
          typeof tag === "string" && tag.startsWith("0x")
            ? Number(BigInt(tag))
            : Number(tag);
        const block = await tw.trx.getBlock(n);
        return normalizeBlock(tw, block, includeTxs);
      }

      case "eth_getBlockByHash": {
        const id = strip0x(p[0]);
        const block = await tw.trx.getBlock(id).catch(() => null);
        return block ? normalizeBlock(tw, block, !!p[1]) : null;
      }

      // TODO: Implement these with Tron specifics where possible.
      case "eth_getCode": {
        const address0x = assertAddress(tw, p[0], { method, parameter: 0 });
        const tronAddress = tronBase58FromEvm(tw, address0x);
        const blockTag = p[1] ?? "latest";

        // Note: Block tag support is limited in Tron, only supporting latest
        if (blockTag !== "latest" && blockTag !== "pending") {
          console.warn(`eth_getCode: Block tag ${blockTag} not fully supported, using latest`);
        }

        try {
          // Get contract info
          const contract = await tw.trx.getContract(tronAddress);

          if (!contract || !contract.bytecode) {
            // Not a contract address, return empty
            return "0x";
          }

          // Return the contract bytecode
          return to0x(contract.bytecode);
        } catch (error) {
          // If error fetching contract, assume it's not a contract
          return "0x";
        }
      }

      case "eth_getTransactionCount": {
        const address0x = assertAddress(tw, p[0], { method, parameter: 0 });
        const blockTag = p[1] ?? "latest";

        // Tron doesn't use nonces like Ethereum
        // We return the account's transaction count as a substitute
        const tronAddress = tronBase58FromEvm(tw, address0x);

        try {
          // Get account info
          const account = await tw.trx.getAccount(tronAddress);

          // Use transaction count if available, otherwise return 0
          // Note: This is a conceptual difference - Tron doesn't require nonces
          const count = account?.transactions?.length ?? 0;

          return toHex(count);
        } catch {
          // If account doesn't exist, return 0
          return "0x0";
        }
      }

      case "eth_getTransaction":
      case "eth_getTransactionByHash": {
        const txid = strip0x(p[0]);

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
            from: from ?? ZERO_ADDRESS,
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
      }

      case "eth_accounts": {
        // Return configured default addresses if available
        const addresses: Address[] = [];

        // Check configured default address
        if (config?.defaultFrom) {
          const addr = toCanonicalAddress(tw, config.defaultFrom);
          if (addr) addresses.push(addr);
        }

        // Check TronWeb default addresses
        const candidates = getTronDefaultAddressCandidates(tw);
        for (const candidate of candidates) {
          const addr = toCanonicalAddress(tw, candidate);
          if (addr && !addresses.includes(addr)) {
            addresses.push(addr);
          }
        }

        return addresses;
      }

      case "net_version": {
        // Return network ID (same as chain ID for Tron)
        const chainId = getChainIdHex();
        return String(parseInt(chainId, 16));
      }

      case "eth_getLogs": {
        const filter = p[0];
        if (!filter) {
          throw new Error("eth_getLogs requires a filter object");
        }

        const fromBlock = filter.fromBlock ?? "latest";
        const toBlock = filter.toBlock ?? "latest";
        const addresses = Array.isArray(filter.address)
          ? filter.address
          : filter.address ? [filter.address] : [];
        const topics = filter.topics ?? [];

        // Convert block tags to numbers
        const fromBlockNum = await resolveBlockNumber(tw, fromBlock);
        const toBlockNum = await resolveBlockNumber(tw, toBlock);

        const logs: any[] = [];

        // For each address, get events
        for (const addr of addresses) {
          if (!addr) continue;

          const address0x = assertAddress(tw, addr, {
            method,
            parameter: 0,
            property: "filter.address"
          });
          const tronAddr = tronBase58FromEvm(tw, address0x);

          try {
            // Use TronWeb's event API
            const options: any = {
              since: fromBlockNum,
              to: toBlockNum,
            };

            // Add event name if specified
            if (filter.eventName) {
              options.eventName = filter.eventName;
            }

            const events = await tw.event.getEventsByContractAddress(
              tronAddr,
              options
            );

            // Convert Tron events to Ethereum log format
            if (Array.isArray(events)) {
              for (const event of events) {
                const log = {
                  address: tronAddressTo0x(tw, event.contract) ?? ZERO_ADDRESS,
                  topics: convertEventTopics(event),
                  data: event.data ? to0x(event.data) : "0x",
                  blockNumber: event.block != null ? toHex(event.block) : null,
                  blockHash: event.block_hash ? to0x(event.block_hash) : null,
                  transactionHash: event.transaction_id ? to0x(event.transaction_id) : null,
                  transactionIndex: toHex(event.transaction_index ?? 0),
                  logIndex: toHex(event.log_index ?? logs.length),
                  removed: false
                };

                // Filter by topics if specified
                if (matchesTopicFilter(log.topics, topics)) {
                  logs.push(log);
                }
              }
            }
          } catch (error) {
            // Continue with next address if this one fails
            console.warn(`Failed to get logs for address ${addr}:`, error);
          }
        }

        return logs;
      }

      case "eth_estimateGas": {
        const txRequest = p[0];
        if (!txRequest) {
          throw new Error("eth_estimateGas requires a transaction object");
        }

        // For simple transfers, return standard gas estimate
        if (!txRequest.data || strip0x(txRequest.data).length === 0) {
          return toHex(21000); // Standard ETH transfer gas
        }

        // For contract calls, estimate based on complexity
        const toAddress = assertAddress(tw, txRequest.to, {
          method,
          parameter: 0,
          property: "transaction.to"
        });
        const fromAddress = resolveFromAddress(tw, config, txRequest.from, {
          method: "eth_estimateGas",
          property: "transaction.from",
          allowZeroFallback: true,
        });

        try {
          // Try to execute as constant call to estimate energy usage
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

          // Return estimated energy usage as gas
          const energyUsed = result?.energy_used ?? 100000;
          return toHex(Math.max(energyUsed, 21000)); // Minimum 21000
        } catch (error) {
          // If estimation fails, return a default high estimate
          return toHex(100000);
        }
      }

      case "eth_getStorageAt": {
        const address0x = assertAddress(tw, p[0], { method, parameter: 0 });
        const position = p[1] ? strip0x(p[1]) : "0";
        const blockTag = p[2] ?? "latest";

        const tronAddress = tronBase58FromEvm(tw, address0x);

        // Note: Tron doesn't provide direct storage slot access like Ethereum
        // This is a limitation that may require alternative approaches
        // For now, return zeros as a placeholder
        console.warn(
          "eth_getStorageAt: Direct storage access not available in Tron. " +
          "Consider using contract getter methods instead."
        );

        // Return 32 bytes of zeros
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
      }

      case "eth_gasPrice": {
        // Tron uses bandwidth and energy, not gas price
        // Return a fixed value that works for conversions
        return toHex(1); // 1 wei equivalent
      }

      case "eth_sign": {
        const address0x = assertAddress(tw, p[0], { method, parameter: 0 });
        const message = p[1];

        if (!message) {
          throw new Error("eth_sign requires a message to sign");
        }

        // Check if we have a signer configured
        if (!config?.sendOptions?.signer) {
          throw new Error("eth_sign requires a signer to be configured");
        }

        const tronAddress = tronBase58FromEvm(tw, address0x);

        try {
          // Use TronWeb's sign method
          const signature = await tw.trx.sign(message);
          return to0x(signature);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new Error(`eth_sign failed: ${msg}`);
        }
      }

      case "eth_feeHistory":
      case "eth_maxPriorityFeePerGas":
      case "eth_newFilter":
      case "eth_getFilterChanges":
      case "eth_getFilterLogs":
      case "eth_uninstallFilter":
        throw new Error(`Method not supported by Tron transport: ${method}`);

      default:
        throw new Error(`Unknown method for Tron transport: ${method}`);
    }
  };
  return req as EIP1193RequestFn;
}

/* Helpers */

function toHex(v: bigint | number | string | undefined): `0x${string}` {
  const b = typeof v === "bigint" ? v : v == null ? 0n : BigInt(v);
  return `0x${b.toString(16)}`;
}

function to0x(hex: string): `0x${string}` {
  return `0x${strip0x(hex).toLowerCase()}`;
}

function strip0x(hex: string): string {
  if (typeof hex !== "string") return String(hex ?? "");
  const value = hex.trim();
  return value.startsWith("0x") || value.startsWith("0X")
    ? value.slice(2)
    : value;
}

function normalizeBlock(tw: TronWebLike, block: any, includeTxs: boolean) {
  const raw = block?.block_header?.raw_data ?? {};
  const number = raw.number ?? block?.number ?? 0;
  const timestamp = raw.timestamp ?? block?.timestamp ?? 0;
  const hash = block?.blockID ? to0x(block.blockID) : null;
  const parentHash = block?.parentID ? to0x(block.parentID) : null;

  const txs = Array.isArray(block?.transactions) ? block.transactions : [];
  const transactions = includeTxs
    ? []
    : txs
        .map((tx: any) => tx?.txID)
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.length > 0,
        )
        .map((id) => to0x(id));

  return {
    baseFeePerGas: null,
    difficulty: "0x0",
    extraData: "0x",
    gasLimit: "0x0",
    gasUsed: "0x0",
    hash,
    logsBloom: "0x",
    miner: tronAddressTo0x(tw, raw.witness_address) ?? ZERO_ADDRESS,
    mixHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
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
    uncles: [],
  };
}

function normalizeReceipt(tw: TronWebLike, info: any) {
  const status =
    (info?.receipt?.result ?? info?.result) === "SUCCESS" ? "0x1" : "0x0";
  const logsArray = Array.isArray(info?.log) ? info.log : [];
  const logs = logsArray.map((l: any, i: number) => ({
    address: tronAddressTo0x(tw, l.address) ?? ZERO_ADDRESS,
    blockHash: null,
    blockNumber: info.blockNumber != null ? toHex(info.blockNumber) : null,
    data:
      typeof l?.data === "string" && l.data.length > 0 ? to0x(l.data) : "0x",
    logIndex: toHex(i),
    removed: false,
    topics: Array.isArray(l?.topics)
      ? l.topics
          .filter(
            (topic: unknown): topic is string => typeof topic === "string",
          )
          .map((topic: string) => to0x(topic))
      : [],
    transactionHash: info.id ? to0x(info.id) : null,
    transactionIndex: "0x0",
  }));

  return {
    blockHash: null,
    blockNumber: info.blockNumber != null ? toHex(info.blockNumber) : null,
    contractAddress: tronAddressTo0x(tw, info.contract_address),
    cumulativeGasUsed: toHex(
      info.receipt?.energy_usage_total ?? info.energy_usage_total ?? 0,
    ),
    effectiveGasPrice: "0x0",
    from: null,
    gasUsed: toHex(info.receipt?.energy_usage ?? info.energy_usage ?? 0),
    logs,
    logsBloom: "0x",
    status,
    to: null,
    transactionHash: info.id ? to0x(info.id) : null,
    transactionIndex: "0x0",
    type: "0x0",
  };
}

async function handleEthCall(
  tw: TronWebLike,
  config: TronWebTransportConfig | undefined,
  callRequest: any,
  blockTag: any,
): Promise<`0x${string}`> {
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
}

async function handleEthSendTransaction(
  tw: TronWebLike,
  config: TronWebTransportConfig | undefined,
  txRequest: any,
  context: { method: string; params: any[] },
): Promise<`0x${string}`> {
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
  const dataHex = normalizeHex(txRequest.data ?? txRequest.input);
  const hasData = strip0x(dataHex).length > 0;
  const permissionId = toOptionalNumber(txRequest.permissionId);

  let transaction: any;

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
    const rawParameter = strip0x(dataHex);
    if (rawParameter.length > 0) options.rawParameter = rawParameter;
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
}

type ResolveAddressContext = {
  method: string;
  property: string;
  allowZeroFallback: boolean;
};

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveFromAddress(
  tw: TronWebLike,
  config: TronWebTransportConfig | undefined,
  candidate: unknown,
  ctx: ResolveAddressContext,
): { evm: Address; base58: string } {
  const candidates: string[] = [];
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
    `${ctx.method} ${ctx.property} is required. Provide a valid address or configure defaultFrom on the TronWeb transport.`,
  );
}

function getTronDefaultAddressCandidates(tw: TronWebLike): string[] {
  const defaults = new Set<string>();
  const address = (tw as any)?.defaultAddress;
  if (address) {
    const maybe = [address.base58, address.b58, address.hex, address.hexString];
    for (const value of maybe) {
      if (typeof value === "string" && value.length > 0) defaults.add(value);
    }
  }
  return Array.from(defaults);
}

function resolveFeeLimit(
  provided: number | undefined,
  fallback: number,
  label: string,
): number {
  const value = provided ?? fallback;
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`Tron transport ${label} must be a positive number.`);
  return Math.trunc(value);
}

function toSun(value: unknown, label: string): number {
  let amount: bigint;
  try {
    amount = toBigIntLike(value);
  } catch {
    throw new Error(`Tron transport ${label} must be a valid numeric value.`);
  }
  if (amount < 0)
    throw new Error(`Tron transport ${label} must be a non-negative integer.`);
  if (amount === 0n) return 0;
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error(
      `Tron transport ${label} exceeds the max safe integer supported for Sun values.`,
    );
  return Number(amount);
}

function toBigIntLike(value: unknown): bigint {
  if (value == null) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Value must be finite.");
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return 0n;
    const normalized =
      trimmed.startsWith("0x") || trimmed.startsWith("0X")
        ? `0x${strip0x(trimmed)}`
        : trimmed;
    if (normalized === "0x") return 0n;
    return BigInt(normalized);
  }
  throw new Error("Value must be bigint, number, or hex string.");
}

function normalizeHex(value: unknown): `0x${string}` {
  if (typeof value !== "string") return "0x";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "0x" || trimmed === "0X") return "0x";
  return `0x${strip0x(trimmed)}`;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const numeric = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const truncated = Math.trunc(numeric);
  if (truncated < 0) return undefined;
  return truncated;
}

async function signTransaction(
  tw: TronWebLike,
  config: TronWebTransportConfig | undefined,
  transaction: any,
  context: { method: string; params: any[] },
): Promise<any> {
  try {
    if (config?.sendOptions?.signer)
      return await config.sendOptions.signer(transaction, {
        tronWeb: tw,
        request: context,
      });
    return await tw.trx.sign(transaction);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`eth_sendTransaction signing failed: ${message}`);
  }
}

function extractTronErrorMessage(value: any): string | null {
  if (!value) return null;
  const candidates = [
    value?.result?.message,
    value?.message,
    value?.Error,
    value?.code,
  ];
  for (const item of candidates) {
    if (typeof item === "string" && item.length > 0)
      return decodeTronMessage(item);
  }
  const ret = Array.isArray(value?.transaction?.ret)
    ? value.transaction.ret[0]
    : undefined;
  if (ret) {
    const retMessage =
      (typeof ret?.ret_message === "string" && ret.ret_message) ||
      (typeof ret?.retMsg === "string" && ret.retMsg) ||
      (typeof ret?.ret_msg === "string" && ret.ret_msg) ||
      (typeof ret?.message === "string" && ret.message);
    if (retMessage) return decodeTronMessage(retMessage);
  }
  return null;
}

function decodeTronMessage(message: string): string {
  if (isLikelyBase64(message)) {
    const decoded = decodeBase64String(message);
    if (decoded && decoded.length > 0) return decoded;
  }
  return message;
}

function isLikelyBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) return false;
  return /^[0-9A-Za-z+/=]+$/.test(value);
}

function decodeBase64String(value: string): string {
  try {
    const globalObj: any =
      typeof globalThis !== "undefined" ? globalThis : undefined;
    if (globalObj?.atob) return globalObj.atob(value);
    if (globalObj?.Buffer)
      return globalObj.Buffer.from(value, "base64").toString("utf8");
  } catch {}
  return value;
}

function assertAddress(
  tw: TronWebLike,
  value: unknown,
  ctx: { method: string; parameter: number; property?: string },
): Address {
  const address = toCanonicalAddress(tw, value);
  if (address) return address;
  const target = ctx.property ?? `param[${ctx.parameter}]`;
  throw new Error(
    `${ctx.method} ${target} must be an address in 0x-prefixed 20-byte hex, Tron base58 (T...), or Tron 41-hex form. Received ${formatParamValue(value)}.`,
  );
}

function tronBase58FromEvm(tw: TronWebLike, address: Address): string {
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

function tronAddressTo0x(tw: TronWebLike, value: unknown): Address | null {
  return toCanonicalAddress(tw, value);
}

function toCanonicalAddress(tw: TronWebLike, value: unknown): Address | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (trimmed === "") return null;

  const hex = strip0x(trimmed);
  if (/^[0-9a-fA-F]{40}$/.test(hex)) return `0x${hex.toLowerCase()}` as Address;

  if (
    /^[0-9a-fA-F]{42}$/.test(hex) &&
    hex.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX
  )
    return `0x${hex.slice(2).toLowerCase()}` as Address;

  if (isTronBase58(trimmed)) {
    const hex41 = tronBase58ToHex41(tw, trimmed);
    if (!hex41) return null;
    return tronHex41To0x(hex41);
  }

  return null;
}

function tronHex41To0x(value: string): Address | null {
  const hex = strip0x(value).toLowerCase();
  if (hex.length !== 42 || !hex.startsWith(TRON_HEX_PREFIX)) return null;
  const body = hex.slice(2);
  if (!/^[0-9a-f]{40}$/.test(body)) return null;
  return `0x${body}` as Address;
}

function tronBase58ToHex41(tw: TronWebLike, value: string): string | null {
  try {
    const hex = tw.address.toHex(value);
    const normalized = strip0x(hex);
    if (
      normalized.length === 42 &&
      normalized.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX &&
      /^[0-9a-fA-F]+$/.test(normalized)
    )
      return `0x${normalized.toLowerCase()}`;
  } catch {
    return null;
  }
  return null;
}

function formatParamValue(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  if (value == null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isTronBase58(value: string): boolean {
  if (!value || value[0] !== "T") return false;
  if (value.length < 34 || value.length > 36) return false;
  return BASE58_REGEX.test(value);
}

// Helper function to resolve block numbers from tags
async function resolveBlockNumber(tw: TronWebLike, blockTag: string | number): Promise<number> {
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

// Helper to extract transaction input data
function extractInputData(tw: TronWebLike, tx: any): string | null {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;

  const parameter = contract.parameter?.value;
  if (parameter?.data) {
    return to0x(parameter.data);
  }

  return null;
}

// Helper to extract from address from transaction
function extractFromAddress(tw: TronWebLike, tx: any): Address | null {
  const contract = tx?.raw_data?.contract?.[0];
  if (!contract) return null;

  const parameter = contract.parameter?.value;
  if (parameter?.owner_address) {
    return tronAddressTo0x(tw, parameter.owner_address);
  }

  return null;
}

// Helper to extract to address from transaction
function extractToAddress(tw: TronWebLike, tx: any): Address | null {
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

// Helper to extract value from transaction
function extractValue(tw: TronWebLike, tx: any): number {
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

// Helper to convert Tron event topics to Ethereum format
function convertEventTopics(event: any): string[] {
  const topics: string[] = [];

  // First topic is usually the event signature
  if (event.event_name) {
    // This is a simplification - in production you'd compute the keccak256 hash
    // For now, we'll use the event name as a placeholder
    topics.push(to0x(event.event_name));
  }

  // Add any additional topics from the event
  if (Array.isArray(event.topics)) {
    for (const topic of event.topics) {
      if (typeof topic === "string") {
        topics.push(to0x(topic));
      }
    }
  }

  return topics;
}

// Helper to match log topics against filter
function matchesTopicFilter(logTopics: string[], filterTopics: (string | string[] | null)[]): boolean {
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

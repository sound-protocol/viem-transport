import type { MethodHandler } from "./types";
import type { TronBlock, TronTransaction, TronWebLike } from "../types";
import { toHex, to0x } from "../utils/hex";
import { tronAddressTo0x } from "../utils/address";
import { ZERO_ADDRESS } from "../constants";

export const eth_blockNumber: MethodHandler = async (_params, { tw }) => {
  const block = await tw.trx.getCurrentBlock();
  const n = block?.block_header?.raw_data?.number ?? block?.block_header?.number;
  return toHex(n ?? 0);
};

export const eth_getBlockByNumber: MethodHandler = async (params, { tw }) => {
  const tag = params[0];
  const includeTxs = !!params[1];

  if (tag === "latest" || tag == null) {
    const block = await tw.trx.getCurrentBlock();
    return normalizeBlock(tw, block, includeTxs);
  }

  const n = typeof tag === "string" && tag.startsWith("0x")
    ? Number(BigInt(tag))
    : Number(tag);
  const block = await tw.trx.getBlock(n);
  return normalizeBlock(tw, block, includeTxs);
};

export const eth_getBlockByHash: MethodHandler = async (params, { tw }) => {
  const id = params[0] as string;
  const idClean = id.startsWith("0x") ? id.slice(2) : id;
  const block = await tw.trx.getBlock(idClean).catch(() => null);
  return block ? normalizeBlock(tw, block, !!params[1]) : null;
};

// Helper function to normalize block data
function normalizeBlock(tw: TronWebLike, block: TronBlock, includeTxs: boolean) {
  const raw = block?.block_header?.raw_data ?? {};
  const number = raw.number ?? block?.number ?? 0;
  const timestamp = raw.timestamp ?? block?.timestamp ?? 0;
  const hash = block?.blockID ? to0x(block.blockID) : null;
  const parentHash = block?.parentID ? to0x(block.parentID) : null;

  const txs = Array.isArray(block?.transactions) ? block.transactions : [];
  const transactions = includeTxs
    ? []
    : txs
        .map((tx: TronTransaction) => tx?.txID)
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

export async function resolveBlockNumber(tw: TronWebLike, blockTag: string | number): Promise<number> {
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
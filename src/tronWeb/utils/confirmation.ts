import type { TronWebLike } from "../types";
import { toHex, strip0x, to0x } from "./hex";

/**
 * Options for waiting for transaction confirmation
 */
export interface WaitForReceiptOptions {
  /**
   * Number of block confirmations to wait for
   * Default: 19 (one full Super Representative cycle on Tron)
   */
  confirmations?: number;

  /**
   * Maximum time to wait in milliseconds
   * Default: 60000 (60 seconds)
   */
  timeout?: number;

  /**
   * Polling interval in milliseconds
   * Default: 3000 (3 seconds, Tron's block time)
   */
  pollingInterval?: number;

  /**
   * Callback fired on each confirmation
   * Useful for updating UI with progress
   */
  onConfirmation?: (currentConfirmations: number, required: number) => void;
}

/**
 * Transaction receipt returned by waitForTransactionReceipt
 */
export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  blockNumber: string;
  from: string;
  to: string | null;
  cumulativeGasUsed: string;
  gasUsed: string;
  contractAddress: string | null;
  logs: any[];
  status: "0x1" | "0x0"; // 0x1 = success, 0x0 = failed
  effectiveGasPrice: string;
  confirmations: number;
}

/**
 * Error thrown when transaction confirmation times out
 */
export class ConfirmationTimeoutError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly timeout: number
  ) {
    super(`Transaction ${txHash} confirmation timed out after ${timeout}ms`);
    this.name = "ConfirmationTimeoutError";
  }
}

/**
 * Error thrown when transaction is not found
 */
export class TransactionNotFoundError extends Error {
  constructor(public readonly txHash: string) {
    super(`Transaction ${txHash} not found on the blockchain`);
    this.name = "TransactionNotFoundError";
  }
}

/**
 * Error thrown when transaction execution reverted
 */
export class TransactionRevertedError extends Error {
  constructor(
    public readonly txHash: string,
    public readonly reason?: string
  ) {
    super(
      `Transaction ${txHash} reverted${reason ? `: ${reason}` : ""}`
    );
    this.name = "TransactionRevertedError";
  }
}

/**
 * Get transaction receipt with confirmation count
 */
async function getTransactionReceiptWithConfirmations(
  tw: TronWebLike,
  txHash: string
): Promise<TransactionReceipt | null> {
  const txid = strip0x(txHash);

  // Get transaction info
  const [txInfo, tx] = await Promise.all([
    tw.trx.getTransactionInfo(txid),
    tw.trx.getTransaction(txid),
  ]);

  // Transaction not found yet
  if (!txInfo || !txInfo.id) {
    return null;
  }

  // Get current block number for confirmation calculation
  const currentBlock = await tw.trx.getCurrentBlock();
  const currentBlockNumber =
    currentBlock?.block_header?.raw_data?.number ?? 0;
  const txBlockNumber = txInfo.blockNumber ?? 0;
  const confirmations = Math.max(0, currentBlockNumber - txBlockNumber);

  // Check transaction status
  const contractResult = txInfo.result ?? "SUCCESS";
  const status = contractResult === "SUCCESS" ? "0x1" : "0x0";

  // Extract from address
  const fromAddress = tx?.raw_data?.contract?.[0]?.parameter?.value
    ?.owner_address
    ? tw.address.fromHex(
        tx.raw_data.contract[0].parameter.value.owner_address
      )
    : "";

  // Extract to address
  let toAddress: string | null = null;
  if (tx?.raw_data?.contract?.[0]?.parameter?.value?.to_address) {
    toAddress = tw.address.fromHex(
      tx.raw_data.contract[0].parameter.value.to_address
    );
  } else if (
    tx?.raw_data?.contract?.[0]?.parameter?.value?.contract_address
  ) {
    toAddress = tw.address.fromHex(
      tx.raw_data.contract[0].parameter.value.contract_address
    );
  }

  // Convert to Ethereum format (0x addresses)
  const fromEth = fromAddress ? to0x(tw.address.toHex(fromAddress)) : "";
  const toEth = toAddress ? to0x(tw.address.toHex(toAddress)) : null;

  // Extract logs
  const logs = (txInfo.log ?? []).map((log: any) => ({
    address: to0x(log.address),
    topics: log.topics?.map((t: string) => to0x(t)) ?? [],
    data: to0x(log.data ?? ""),
    blockNumber: toHex(txBlockNumber),
    transactionHash: to0x(txInfo.id),
    transactionIndex: "0x0", // Tron doesn't have tx index within block
    blockHash: to0x(txInfo.blockHash ?? ""),
    logIndex: toHex(log.index ?? 0),
    removed: false,
  }));

  const receipt: TransactionReceipt = {
    transactionHash: to0x(txInfo.id),
    transactionIndex: "0x0", // Tron doesn't have tx index
    blockHash: to0x(txInfo.blockHash ?? ""),
    blockNumber: toHex(txBlockNumber),
    from: fromEth,
    to: toEth,
    cumulativeGasUsed: toHex(txInfo.energy_usage_total ?? 0),
    gasUsed: toHex(txInfo.energy_usage ?? 0),
    contractAddress:
      txInfo.contract_address
        ? to0x(txInfo.contract_address)
        : null,
    logs,
    status,
    effectiveGasPrice: toHex(100), // Tron's energy price
    confirmations,
  };

  return receipt;
}

/**
 * Wait for a transaction to be confirmed on the blockchain
 *
 * This function polls the blockchain until the transaction reaches the desired
 * number of confirmations or times out. Essential for Safe contracts to ensure
 * transactions are finalized before showing "Executed" status.
 *
 * @param tw - TronWeb instance
 * @param txHash - Transaction hash (with or without 0x prefix)
 * @param options - Configuration options
 * @returns Transaction receipt with confirmation count
 * @throws {TransactionNotFoundError} If transaction is not found after timeout
 * @throws {TransactionRevertedError} If transaction execution reverted
 * @throws {ConfirmationTimeoutError} If confirmations not reached within timeout
 *
 * @example
 * ```typescript
 * // Wait for 19 confirmations (one full SR cycle)
 * const receipt = await waitForTransactionReceipt(tw, txHash, {
 *   confirmations: 19,
 *   onConfirmation: (current, required) => {
 *     console.log(`${current}/${required} confirmations`);
 *   }
 * });
 *
 * if (receipt.status === '0x1') {
 *   console.log('Transaction confirmed successfully');
 * }
 * ```
 */
export async function waitForTransactionReceipt(
  tw: TronWebLike,
  txHash: string,
  options: WaitForReceiptOptions = {}
): Promise<TransactionReceipt> {
  const {
    confirmations = 19, // One full SR cycle
    timeout = 60000, // 60 seconds
    pollingInterval = 3000, // 3 seconds (Tron block time)
    onConfirmation,
  } = options;

  const startTime = Date.now();
  let lastConfirmationCount = -1;

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new ConfirmationTimeoutError(txHash, timeout);
    }

    try {
      const receipt = await getTransactionReceiptWithConfirmations(
        tw,
        txHash
      );

      if (!receipt) {
        // Transaction not found yet, keep polling
        await sleep(pollingInterval);
        continue;
      }

      // Check if transaction reverted
      if (receipt.status === "0x0") {
        // Try to extract revert reason from logs if available
        const reason = extractRevertReason(receipt);
        throw new TransactionRevertedError(txHash, reason);
      }

      // Fire confirmation callback if confirmations increased
      if (
        onConfirmation &&
        receipt.confirmations !== lastConfirmationCount
      ) {
        lastConfirmationCount = receipt.confirmations;
        onConfirmation(receipt.confirmations, confirmations);
      }

      // Check if we have enough confirmations
      if (receipt.confirmations >= confirmations) {
        return receipt;
      }

      // Wait before next poll
      await sleep(pollingInterval);
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof TransactionRevertedError ||
        error instanceof ConfirmationTimeoutError
      ) {
        throw error;
      }

      // For other errors, continue polling (might be transient network issue)
      await sleep(pollingInterval);
    }
  }
}

/**
 * Helper to sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempt to extract revert reason from transaction logs
 */
function extractRevertReason(receipt: TransactionReceipt): string | undefined {
  // Check logs for Error(string) event
  // This is a best-effort attempt, may not always work
  for (const log of receipt.logs) {
    if (log.topics[0] === "0x08c379a0") {
      // Error(string) selector
      try {
        // Decode the revert reason (simplified, would need full ABI decoding)
        const data = log.data.slice(2);
        if (data.length > 64) {
          // Skip offset and length
          const reason = Buffer.from(data.slice(128), "hex").toString(
            "utf8"
          );
          return reason.replace(/\0/g, ""); // Remove null bytes
        }
      } catch {
        // Ignore decoding errors
      }
    }
  }
  return undefined;
}

/**
 * Get the current number of confirmations for a transaction
 *
 * @param tw - TronWeb instance
 * @param txHash - Transaction hash
 * @returns Number of confirmations, or null if transaction not found
 */
export async function getTransactionConfirmations(
  tw: TronWebLike,
  txHash: string
): Promise<number | null> {
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

/**
 * Check if a transaction has been confirmed with at least N confirmations
 *
 * @param tw - TronWeb instance
 * @param txHash - Transaction hash
 * @param requiredConfirmations - Number of required confirmations (default: 19)
 * @returns true if confirmed, false otherwise
 */
export async function isTransactionConfirmed(
  tw: TronWebLike,
  txHash: string,
  requiredConfirmations: number = 19
): Promise<boolean> {
  const confirmations = await getTransactionConfirmations(tw, txHash);
  return confirmations !== null && confirmations >= requiredConfirmations;
}
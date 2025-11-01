import type { TronWebLike } from '../types';
import { strip0x, to0x } from './hex';
import { toHex } from './hex';
import { keccak256 } from 'viem';

/**
 * Safe (Gnosis Safe) contract events registry
 *
 * These event signatures are used to detect and parse Safe contract events.
 * Event topics[0] is the keccak256 hash of the event signature.
 */
export const SAFE_EVENTS = {
  // Core execution events
  ExecutionSuccess: {
    signature: 'ExecutionSuccess(bytes32,uint256)',
    topic: '0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e',
    decode: (log: any) => ({
      txHash: log.topics[1],
      payment: log.data ? parseInt(log.data, 16) : 0,
    }),
  },

  ExecutionFailure: {
    signature: 'ExecutionFailure(bytes32,uint256)',
    topic: '0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23',
    decode: (log: any) => ({
      txHash: log.topics[1],
      payment: log.data ? parseInt(log.data, 16) : 0,
    }),
  },

  // Signature events
  ApproveHash: {
    signature: 'ApproveHash(bytes32,address)',
    topic: '0xf2a0eb156472d1440255b0d7c1e19cc07115d1051fe605b0dce69acfec884d9c',
    decode: (log: any) => ({
      approvedHash: log.topics[1],
      owner: log.topics[2],
    }),
  },

  SignMsg: {
    signature: 'SignMsg(bytes32)',
    topic: '0xe7f4675038f4f6034dfcbbb24c4dc08e4ebf10eb9d257d3d02c0f2d3f1a0e9d8',
    decode: (log: any) => ({
      msgHash: log.topics[1],
    }),
  },

  // Owner management events
  AddedOwner: {
    signature: 'AddedOwner(address)',
    topic: '0x9465fa0c962cc76958e6373a993326400c1c94f8be2fe3a952adfa7f60b2ea26',
    decode: (log: any) => ({
      owner: log.topics[1],
    }),
  },

  RemovedOwner: {
    signature: 'RemovedOwner(address)',
    topic: '0xf8d49fc529812e9a7c5c50e69c20f0dccc0db8fa95c98bc58cc9a4f1c1299eaf',
    decode: (log: any) => ({
      owner: log.topics[1],
    }),
  },

  ChangedThreshold: {
    signature: 'ChangedThreshold(uint256)',
    topic: '0x610f7ff2b304ae8903c3de74c60c6ab1f7d6226b3f52c5161905bb5ad4039c93',
    decode: (log: any) => ({
      threshold: log.data ? parseInt(log.data, 16) : 0,
    }),
  },

  // Module management events
  EnabledModule: {
    signature: 'EnabledModule(address)',
    topic: '0xecdf3a3effea5783a3c4c2140e677577666428d44ed9d474a0b3a4c9943f8440',
    decode: (log: any) => ({
      module: log.topics[1],
    }),
  },

  DisabledModule: {
    signature: 'DisabledModule(address)',
    topic: '0xaab4fa2b463f581b2b32cb3b7e3b704b9ce37cc209b5fb4d77e593ace4054276',
    decode: (log: any) => ({
      module: log.topics[1],
    }),
  },

  // Fallback handler
  ChangedFallbackHandler: {
    signature: 'ChangedFallbackHandler(address)',
    topic: '0x5ac6c46c93c8d0e53714ba3b53db3e7c046da994313d7ed0d192028bc7c228b0',
    decode: (log: any) => ({
      handler: log.topics[1],
    }),
  },

  // Guard
  ChangedGuard: {
    signature: 'ChangedGuard(address)',
    topic: '0x1151116914515bc0891ff9047a6cb32cf902546f83066499bcf8ba33d2353fa2',
    decode: (log: any) => ({
      guard: log.topics[1],
    }),
  },

  // Safe setup
  SafeSetup: {
    signature: 'SafeSetup(address,address[],uint256,address,address)',
    topic: '0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8',
    decode: (log: any) => ({
      initiator: log.topics[1],
      // Other parameters are in data, would need full ABI decoding
    }),
  },

  // Safe reception
  SafeReceived: {
    signature: 'SafeReceived(address,uint256)',
    topic: '0x3d0ce9bfc3ed7d6862dbb28b2dea94561fe714a1b4d019aa8af39730d1ad7c3d',
    decode: (log: any) => ({
      sender: log.topics[1],
      value: log.data ? parseInt(log.data, 16) : 0,
    }),
  },

  // Module transaction
  ExecutionFromModuleSuccess: {
    signature: 'ExecutionFromModuleSuccess(address)',
    topic: '0x6895c13664aa4f67288b25d7a21d7aaa34916e355fb9b6fae0a139a9085becb8',
    decode: (log: any) => ({
      module: log.topics[1],
    }),
  },

  ExecutionFromModuleFailure: {
    signature: 'ExecutionFromModuleFailure(address)',
    topic: '0xacd2c8702804128fdb0db2bb49f6d127dd0181c13fd45dbfe16de0930e2bd375',
    decode: (log: any) => ({
      module: log.topics[1],
    }),
  },
} as const;

/**
 * Safe event names for type safety
 */
export type SafeEventName = keyof typeof SAFE_EVENTS;

/**
 * Parsed Safe event
 */
export interface ParsedSafeEvent {
  eventName: SafeEventName;
  address: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  data: any;
  confirmed: boolean;
  confirmations: number;
}

/**
 * Get all Safe event topics for filtering
 */
export function getSafeEventTopics(): string[] {
  return Object.values(SAFE_EVENTS).map(event => event.topic);
}

/**
 * Identify which Safe event a log represents
 */
export function identifySafeEvent(log: any): SafeEventName | null {
  if (!log.topics || log.topics.length === 0) return null;

  const topic = log.topics[0];

  for (const [name, event] of Object.entries(SAFE_EVENTS)) {
    if (event.topic.toLowerCase() === topic.toLowerCase()) {
      return name as SafeEventName;
    }
  }

  return null;
}

/**
 * Parse a Safe event log into a structured format
 */
export function parseSafeEvent(
  log: any,
  currentBlock: number
): ParsedSafeEvent | null {
  const eventName = identifySafeEvent(log);
  if (!eventName) return null;

  const event = SAFE_EVENTS[eventName];
  const blockNumber = typeof log.blockNumber === 'string'
    ? parseInt(log.blockNumber, 16)
    : log.blockNumber;

  const confirmations = Math.max(0, currentBlock - blockNumber);

  return {
    eventName,
    address: log.address,
    blockNumber,
    transactionHash: log.transactionHash,
    logIndex: typeof log.logIndex === 'string'
      ? parseInt(log.logIndex, 16)
      : log.logIndex,
    data: event.decode(log),
    confirmed: confirmations >= 19, // One full SR cycle
    confirmations,
  };
}

/**
 * Event polling cache to avoid re-fetching old events
 */
class EventCache {
  private cache = new Map<string, number>(); // safeAddress -> lastBlockQueried

  getLastBlock(safeAddress: string): number {
    return this.cache.get(safeAddress.toLowerCase()) || 0;
  }

  setLastBlock(safeAddress: string, blockNumber: number): void {
    this.cache.set(safeAddress.toLowerCase(), blockNumber);
  }

  clear(safeAddress?: string): void {
    if (safeAddress) {
      this.cache.delete(safeAddress.toLowerCase());
    } else {
      this.cache.clear();
    }
  }
}

// Global event cache instance
const globalEventCache = new EventCache();

/**
 * Poll for new Safe events since last check
 *
 * Uses caching to avoid re-fetching old events. Only queries new blocks
 * since the last poll.
 *
 * @param tw - TronWeb instance
 * @param safeAddress - Safe contract address
 * @param options - Polling options
 * @returns Array of new Safe events
 */
export async function pollSafeEvents(
  tw: TronWebLike,
  safeAddress: string,
  options: {
    fromBlock?: number;
    toBlock?: number | 'latest';
    eventNames?: SafeEventName[];
    includeUnconfirmed?: boolean;
  } = {}
): Promise<ParsedSafeEvent[]> {
  const {
    fromBlock,
    toBlock = 'latest',
    eventNames,
    includeUnconfirmed = true,
  } = options;

  // Get current block
  const currentBlockData = await tw.trx.getCurrentBlock();
  const currentBlock = currentBlockData?.block_header?.raw_data?.number ?? 0;

  // Determine block range
  const lastQueriedBlock = fromBlock ?? globalEventCache.getLastBlock(safeAddress);
  const startBlock = Math.max(0, lastQueriedBlock + 1);
  const endBlock = toBlock === 'latest' ? currentBlock : toBlock;

  // If no new blocks, return empty
  if (startBlock > endBlock) {
    return [];
  }

  // Convert address to Tron format
  const tronAddress = safeAddress.startsWith('T')
    ? safeAddress
    : tw.address.fromHex(safeAddress.startsWith('0x')
        ? `41${strip0x(safeAddress)}`
        : safeAddress);

  // Query events from TronGrid
  try {
    const events = await tw.event.getEventsByContractAddress(tronAddress, {
      minBlockTimestamp: 0, // Use block numbers instead
      maxBlockTimestamp: Date.now(),
      eventName: '', // Get all events
      onlyConfirmed: false,
      onlyUnconfirmed: false,
      limit: 200, // Max per request
    });

    if (!events || !Array.isArray(events)) {
      return [];
    }

    // Filter to our block range and Safe events
    const parsedEvents: ParsedSafeEvent[] = [];

    for (const event of events) {
      const blockNum = event.block_number;

      // Skip if outside our range
      if (blockNum < startBlock || blockNum > endBlock) continue;

      // Convert to eth_getLogs format
      const log = {
        address: to0x(event.contract_address || tronAddress),
        topics: [event.event_name || '', ...(event.result?._topics || [])],
        data: event.result?._data || '0x',
        blockNumber: toHex(blockNum),
        transactionHash: to0x(event.transaction_id),
        logIndex: toHex(event.log_index ?? 0),
      };

      const parsed = parseSafeEvent(log, currentBlock);

      if (parsed) {
        // Filter by event name if specified
        if (eventNames && !eventNames.includes(parsed.eventName)) {
          continue;
        }

        // Filter unconfirmed if requested
        if (!includeUnconfirmed && !parsed.confirmed) {
          continue;
        }

        parsedEvents.push(parsed);
      }
    }

    // Update cache
    globalEventCache.setLastBlock(safeAddress, endBlock);

    return parsedEvents;
  } catch (error) {
    console.error('Error polling Safe events:', error);
    return [];
  }
}

/**
 * Get the execution status of a Safe transaction
 *
 * @param tw - TronWeb instance
 * @param safeAddress - Safe contract address
 * @param safeTxHash - Safe transaction hash (bytes32)
 * @returns Execution status
 */
export async function getSafeTransactionStatus(
  tw: TronWebLike,
  safeAddress: string,
  safeTxHash: string
): Promise<{
  executed: boolean;
  success?: boolean;
  blockNumber?: number;
  transactionHash?: string;
}> {
  const events = await pollSafeEvents(tw, safeAddress, {
    eventNames: ['ExecutionSuccess', 'ExecutionFailure'],
    includeUnconfirmed: false, // Only confirmed events
  });

  // Look for execution event matching this Safe tx hash
  for (const event of events) {
    if (event.data.txHash?.toLowerCase() === safeTxHash.toLowerCase()) {
      return {
        executed: true,
        success: event.eventName === 'ExecutionSuccess',
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      };
    }
  }

  return { executed: false };
}

/**
 * Get all signatures for a Safe transaction
 *
 * @param tw - TronWeb instance
 * @param safeAddress - Safe contract address
 * @param safeTxHash - Safe transaction hash
 * @returns Array of owner addresses that have signed
 */
export async function getSafeTransactionSignatures(
  tw: TronWebLike,
  safeAddress: string,
  safeTxHash: string
): Promise<string[]> {
  const events = await pollSafeEvents(tw, safeAddress, {
    eventNames: ['ApproveHash'],
  });

  const signers: string[] = [];

  for (const event of events) {
    if (event.data.approvedHash?.toLowerCase() === safeTxHash.toLowerCase()) {
      signers.push(event.data.owner);
    }
  }

  return signers;
}

/**
 * Clear event cache for a Safe (or all Safes)
 *
 * Use this when you want to re-fetch all historical events
 */
export function clearSafeEventCache(safeAddress?: string): void {
  globalEventCache.clear(safeAddress);
}

/**
 * Compute Safe event topic from signature
 *
 * Useful for adding custom events not in the registry
 */
export function computeEventTopic(signature: string): string {
  return keccak256(Buffer.from(signature, 'utf8'));
}

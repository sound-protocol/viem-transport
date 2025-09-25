import type { MethodHandler } from "./types";
import { assertAddress, tronBase58FromEvm, tronAddressTo0x } from "../utils/address";
import { toHex } from "../utils/hex";
import { convertEventTopics, convertEventData, matchesTopicFilter } from "../utils/events";
import { resolveBlockNumber } from "./blocks";
import { ZERO_ADDRESS } from "../constants";

export const eth_getLogs: MethodHandler = async (params, { tw }) => {
  const filter = params[0] as any;
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

  const logs: Array<{
    address: string;
    topics: string[];
    data: string;
    blockNumber: string | null;
    blockHash: string | null;
    transactionHash: string | null;
    transactionIndex: string;
    logIndex: string;
    removed: boolean;
  }> = [];

  // For each address, get events
  for (const addr of addresses) {
    if (!addr) continue;

    const address0x = assertAddress(tw, addr, {
      method: "eth_getLogs",
      parameter: 0,
      property: "filter.address"
    });
    const tronAddr = tronBase58FromEvm(tw, address0x);

    try {
      // Use TronWeb's event API
      const options: Record<string, unknown> = {
        since: fromBlockNum,
        to: toBlockNum,
      };

      // Add event name if specified
      if (filter.eventName) {
        options.eventName = filter.eventName;
      }

      const response = await tw.event.getEventsByContractAddress(
        tronAddr,
        options
      );

      // Handle the response format - it has a 'data' field
      let events: any[] = [];
      if (response && (response as any).data && Array.isArray((response as any).data)) {
        events = (response as any).data;
      } else if (Array.isArray(response)) {
        events = response;
      }

      // Convert Tron events to Ethereum log format
      if (events.length > 0) {
        for (const event of events) {
          const log = {
            address: tronAddressTo0x(tw, event.contract_address || event.contract) ?? ZERO_ADDRESS,
            topics: convertEventTopics(event),
            data: convertEventData(event),
            blockNumber: event.block_number != null ? toHex(event.block_number) :
                        event.block != null ? toHex(event.block) : null,
            blockHash: null, // Tron doesn't provide block hash in events
            transactionHash: event.transaction_id ? `0x${event.transaction_id}` : null,
            transactionIndex: "0x0",
            logIndex: toHex(event.event_index ?? event.log_index ?? logs.length),
            removed: false
          };

          // Filter by topics if specified
          if (matchesTopicFilter(log.topics, topics)) {
            logs.push(log);
          }
        }
      }
    } catch {
      // Continue with next address if this one fails
    }
  }

  return logs;
};
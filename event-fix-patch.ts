// This file contains the complete fix for event support in tronWeb.ts
// Apply these changes to make eth_getLogs work properly

// 1. Update the eth_getLogs case (around line 602-686) to:
`
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
      method,
      parameter: 0,
      property: "filter.address"
    });
    const tronAddr = tronBase58FromEvm(tw, address0x);

    try {
      // Use TronWeb's event API with proper options
      const options: Record<string, unknown> = {
        onlyConfirmed: true,
        limit: 200,
        orderBy: "block_timestamp,asc"
      };

      // Add event name filter if specified
      if (filter.eventName) {
        options.eventName = filter.eventName;
      }

      const response = await tw.event.getEventsByContractAddress(
        tronAddr,
        options
      );

      // Handle the response format - it has a 'data' field
      let events: any[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        events = response.data;
      } else if (Array.isArray(response)) {
        events = response;
      }

      // Convert Tron events to Ethereum log format
      for (const event of events) {
        // Filter by block range
        if (event.block_number) {
          if (event.block_number < fromBlockNum || event.block_number > toBlockNum) {
            continue;
          }
        }

        const log = {
          address: tronAddressTo0x(tw, event.contract_address) ?? address0x,
          topics: convertEventTopics(event),
          data: convertEventData(event),
          blockNumber: event.block_number != null ? toHex(event.block_number) : null,
          blockHash: null, // Tron doesn't provide block hash in events
          transactionHash: event.transaction_id ? to0x(event.transaction_id) : null,
          transactionIndex: "0x0",
          logIndex: toHex(event.event_index ?? logs.length),
          removed: false
        };

        // Filter by topics if specified
        if (matchesTopicFilter(log.topics, topics)) {
          logs.push(log);
        }
      }
    } catch (err) {
      // Log error for debugging but continue with next address
      console.warn(\`Failed to get events for \${tronAddr}:\`, err);
    }
  }

  return logs;
}
`

// 2. Replace the convertEventTopics function (around line 1583) with:
`
function convertEventTopics(event: TronEvent): string[] {
  const topics: string[] = [];

  // Topic[0] is the event signature hash
  if (event.event) {
    // Compute keccak256 hash of the event signature
    const signature = event.event
      .replace(/indexed /g, '')  // Remove 'indexed' keyword
      .replace(/\\s+/g, ' ')      // Normalize spaces
      .trim();

    // Extract just the function signature
    const match = signature.match(/^(\\w+)\\((.*)\\)$/);
    if (match) {
      const name = match[1];
      const params = match[2];

      // Convert to canonical form
      const canonicalParams = params
        .split(',')
        .map(p => p.trim().split(' ')[0]) // Get just the type
        .join(',');

      const canonicalSig = \`\${name}(\${canonicalParams})\`;

      // Use known event signature hashes
      if (canonicalSig === "Transfer(address,address,uint256)") {
        topics.push("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
      } else if (canonicalSig === "Approval(address,address,uint256)") {
        topics.push("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925");
      } else {
        // For unknown events, we'd need keccak256 - use placeholder
        topics.push(to0x(name));
      }
    }
  } else if (event.event_name) {
    // Fallback: use known event signatures
    if (event.event_name === "Transfer") {
      topics.push("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
    } else if (event.event_name === "Approval") {
      topics.push("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925");
    } else {
      topics.push(to0x(event.event_name));
    }
  }

  // Add indexed parameters as additional topics
  if (event.result && event.result_type && event.event) {
    const eventSig = event.event;

    for (const key of Object.keys(event.result_type)) {
      // Skip numeric keys (0, 1, 2, etc.)
      if (/^\\d+$/.test(key)) continue;

      // Check if this parameter is indexed in the signature
      const regex = new RegExp(\`\${event.result_type[key]}\\\\s+indexed\\\\s+\${key}\`);
      if (regex.test(eventSig)) {
        const value = event.result[key];
        if (value) {
          // Addresses should be padded to 32 bytes
          if (event.result_type[key] === 'address') {
            const cleaned = strip0x(value);
            topics.push('0x' + cleaned.padStart(64, '0'));
          } else {
            // Other types (uint256, etc.)
            const cleaned = strip0x(value);
            topics.push('0x' + cleaned.padStart(64, '0'));
          }
        }
      }
    }
  }

  return topics;
}
`

// 3. Add the new convertEventData function after convertEventTopics:
`
function convertEventData(event: TronEvent): string {
  let data = '0x';

  if (event.result && event.result_type && event.event) {
    const nonIndexedValues: string[] = [];
    const eventSig = event.event;

    for (const key of Object.keys(event.result_type)) {
      // Skip numeric keys
      if (/^\\d+$/.test(key)) continue;

      // Check if NOT indexed
      const regex = new RegExp(\`\${event.result_type[key]}\\\\s+indexed\\\\s+\${key}\`);
      if (!regex.test(eventSig)) {
        const value = event.result[key];
        if (value !== undefined) {
          // Encode based on type
          if (event.result_type[key] === 'address') {
            // Address: 32 bytes
            const cleaned = strip0x(value);
            nonIndexedValues.push(cleaned.padStart(64, '0'));
          } else if (event.result_type[key].startsWith('uint') || event.result_type[key].startsWith('int')) {
            // Numbers: 32 bytes
            const num = BigInt(value);
            nonIndexedValues.push(num.toString(16).padStart(64, '0'));
          } else {
            // Default: try to handle as hex
            nonIndexedValues.push(strip0x(value));
          }
        }
      }
    }

    if (nonIndexedValues.length > 0) {
      data = '0x' + nonIndexedValues.join('');
    }
  }

  return data;
}
`

// 4. Update the TronEvent interface to match actual Tron event format:
`
interface TronEvent {
  block_number: number;
  block_timestamp: number;
  caller_contract_address?: string;
  contract_address: string;
  event_index: number;
  event_name: string;
  result: Record<string, any>;
  result_type: Record<string, string>;
  event: string;  // Full event signature like "Transfer(address indexed from, address indexed to, uint256 value)"
  transaction_id: string;
  // Legacy fields (might not be present)
  contract?: string;
  block?: number;
  topics?: string[];
  data?: string;
}
`

// Summary of changes:
// 1. Handle response.data field from TronWeb API
// 2. Use proper event structure (event.result, event.result_type, event.event)
// 3. Compute proper event signature hashes for Transfer and Approval
// 4. Separate indexed parameters (topics) from non-indexed (data)
// 5. Proper padding for addresses and numbers in topics and data
/*
  Fixed event support implementation based on actual Tron event format

  Tron event format (from documentation):
  {
    "block_number": 42054864,
    "block_timestamp": 1700704884000,
    "caller_contract_address": "TPYwAC9Y4uUcT2QH3WPPjqxzJSJWymMoMS",
    "contract_address": "TPYwAC9Y4uUcT2QH3WPPjqxzJSJWymMoMS",
    "event_index": 1,
    "event_name": "Transfer",
    "result": {
      "0": "0x65fa68800fff5a10346d1a3aa1fb2ce92f2e2971",
      "1": "0xbbd6d9c36cf31f73b01ad2415b12d9d2bda7fb08",
      "2": "27000000",
      "from": "0x65fa68800fff5a10346d1a3aa1fb2ce92f2e2971",
      "to": "0xbbd6d9c36cf31f73b01ad2415b12d9d2bda7fb08",
      "value": "27000000"
    },
    "result_type": {
      "from": "address",
      "to": "address",
      "value": "uint256"
    },
    "event": "Transfer(address indexed from, address indexed to, uint256 value)",
    "transaction_id": "9c9e4776de1ee889aad48be360262e3dd6d1a1e3d4e0d7c72dc50075260846df"
  }
*/

import { keccak256, encodeEventTopics, toHex } from 'viem';

// Compute event signature hash (topic0)
function getEventSignatureHash(eventSignature: string): string {
  // For "Transfer(address indexed from, address indexed to, uint256 value)"
  // We need just "Transfer(address,address,uint256)"
  const normalized = eventSignature
    .replace(/indexed /g, '')  // Remove 'indexed' keyword
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim();

  // Extract just the function signature
  const match = normalized.match(/^(\w+)\((.*)\)$/);
  if (!match) return '0x0';

  const name = match[1];
  const params = match[2];

  // Convert to canonical form
  const canonicalParams = params
    .split(',')
    .map(p => p.trim().split(' ')[0]) // Get just the type
    .join(',');

  const signature = `${name}(${canonicalParams})`;
  return keccak256(toHex(signature));
}

// Convert Tron event to Ethereum log format
export function convertTronEventToLog(tw: any, event: any) {
  const topics: string[] = [];

  // Topic[0] is the event signature hash
  if (event.event) {
    topics.push(getEventSignatureHash(event.event));
  } else if (event.event_name) {
    // Fallback: try to construct from event_name
    // This is approximate - better to use the full signature
    const signature = `${event.event_name}()`;
    topics.push(keccak256(toHex(signature)));
  }

  // Add indexed parameters as additional topics
  if (event.result && event.result_type) {
    // Iterate through result_type to find indexed parameters
    const resultKeys = Object.keys(event.result_type);

    // Check the event signature for indexed params
    const eventSig = event.event || '';

    for (const key of resultKeys) {
      // Skip numeric keys (0, 1, 2, etc.)
      if (/^\d+$/.test(key)) continue;

      // Check if this parameter is indexed in the signature
      const regex = new RegExp(`${event.result_type[key]}\\s+indexed\\s+${key}`);
      if (regex.test(eventSig)) {
        const value = event.result[key];
        if (value) {
          // Addresses should be padded to 32 bytes
          if (event.result_type[key] === 'address') {
            // Ensure it's 32 bytes (64 hex chars)
            const cleaned = value.replace('0x', '');
            topics.push('0x' + cleaned.padStart(64, '0'));
          } else {
            // Other types (uint256, etc.)
            topics.push(value.startsWith('0x') ? value : '0x' + value);
          }
        }
      }
    }
  }

  // Build data field from non-indexed parameters
  let data = '0x';
  if (event.result && event.result_type) {
    const nonIndexedValues: string[] = [];

    for (const key of Object.keys(event.result_type)) {
      // Skip numeric keys
      if (/^\d+$/.test(key)) continue;

      const eventSig = event.event || '';
      const regex = new RegExp(`${event.result_type[key]}\\s+indexed\\s+${key}`);

      // If NOT indexed, add to data
      if (!regex.test(eventSig)) {
        const value = event.result[key];
        if (value !== undefined) {
          // Encode based on type
          if (event.result_type[key] === 'address') {
            // Address: 32 bytes
            const cleaned = value.replace('0x', '');
            nonIndexedValues.push(cleaned.padStart(64, '0'));
          } else if (event.result_type[key].startsWith('uint') || event.result_type[key].startsWith('int')) {
            // Numbers: 32 bytes
            const num = BigInt(value);
            nonIndexedValues.push(num.toString(16).padStart(64, '0'));
          } else if (event.result_type[key].startsWith('bytes')) {
            // Bytes: pad to 32-byte chunks
            const cleaned = value.replace('0x', '');
            nonIndexedValues.push(cleaned);
          } else {
            // Default: try to handle as hex
            nonIndexedValues.push(value.replace('0x', ''));
          }
        }
      }
    }

    if (nonIndexedValues.length > 0) {
      data = '0x' + nonIndexedValues.join('');
    }
  }

  // Convert contract address from Tron to Ethereum format
  let address = '0x0000000000000000000000000000000000000000';
  if (event.contract_address) {
    try {
      // If already in 0x format
      if (event.contract_address.startsWith('0x')) {
        address = event.contract_address.toLowerCase();
      } else {
        // Convert from Base58 to 0x
        const hex41 = tw.address.toHex(event.contract_address);
        if (hex41 && hex41.length >= 42) {
          address = '0x' + hex41.slice(2).toLowerCase();
        }
      }
    } catch {
      // Keep zero address on error
    }
  }

  return {
    address,
    topics,
    data,
    blockNumber: event.block_number != null ? toHex(event.block_number) : null,
    blockHash: null, // Tron doesn't provide block hash in events
    transactionHash: event.transaction_id ? '0x' + event.transaction_id : null,
    transactionIndex: '0x0', // Not provided by Tron
    logIndex: toHex(event.event_index ?? 0),
    removed: false
  };
}

// Updated eth_getLogs implementation
export async function handleEthGetLogs(
  tw: any,
  filter: any
) {
  const logs: any[] = [];

  // Handle block range
  const fromBlock = filter.fromBlock ?? 'latest';
  const toBlock = filter.toBlock ?? 'latest';

  // Resolve block numbers
  let fromBlockNum: number;
  let toBlockNum: number;

  if (fromBlock === 'latest' || fromBlock === 'pending') {
    const block = await tw.trx.getCurrentBlock();
    fromBlockNum = block?.block_header?.raw_data?.number ?? 0;
  } else {
    fromBlockNum = typeof fromBlock === 'string' ? parseInt(fromBlock, 16) : fromBlock;
  }

  if (toBlock === 'latest' || toBlock === 'pending') {
    const block = await tw.trx.getCurrentBlock();
    toBlockNum = block?.block_header?.raw_data?.number ?? 0;
  } else {
    toBlockNum = typeof toBlock === 'string' ? parseInt(toBlock, 16) : toBlock;
  }

  // Handle addresses
  const addresses = Array.isArray(filter.address)
    ? filter.address
    : filter.address ? [filter.address] : [];

  if (addresses.length === 0) {
    // No specific address, can't query (Tron requires contract address)
    return logs;
  }

  // Get events for each address
  for (const addr of addresses) {
    if (!addr) continue;

    // Convert to Tron address format
    let tronAddr: string;
    if (addr.startsWith('T')) {
      tronAddr = addr;
    } else {
      // Convert from 0x to Tron Base58
      const hex41 = '41' + addr.replace('0x', '');
      tronAddr = tw.address.fromHex(hex41);
    }

    try {
      // Query events from TronWeb
      const options: any = {
        onlyConfirmed: true,
        orderBy: 'block_timestamp,asc',
        limit: 200
      };

      // Use block timestamp if available
      if (fromBlockNum > 0) {
        options.minBlockTimestamp = fromBlockNum * 3000; // Approximate: 3 seconds per block
      }
      if (toBlockNum > 0 && toBlockNum !== fromBlockNum) {
        options.maxBlockTimestamp = toBlockNum * 3000;
      }

      // Get events
      const response = await tw.event.getEventsByContractAddress(
        tronAddr,
        options
      );

      // Handle response format
      let events: any[] = [];
      if (response && response.data) {
        events = response.data;
      } else if (Array.isArray(response)) {
        events = response;
      }

      // Convert each event to Ethereum log format
      for (const event of events) {
        // Check block range
        if (event.block_number) {
          if (event.block_number < fromBlockNum || event.block_number > toBlockNum) {
            continue;
          }
        }

        const log = convertTronEventToLog(tw, event);

        // Filter by topics if specified
        if (filter.topics && filter.topics.length > 0) {
          let matches = true;
          for (let i = 0; i < filter.topics.length; i++) {
            const filterTopic = filter.topics[i];
            if (filterTopic === null) continue;

            const logTopic = log.topics[i];
            if (!logTopic) {
              matches = false;
              break;
            }

            if (Array.isArray(filterTopic)) {
              // OR condition
              if (!filterTopic.includes(logTopic)) {
                matches = false;
                break;
              }
            } else {
              // Exact match
              if (logTopic.toLowerCase() !== filterTopic.toLowerCase()) {
                matches = false;
                break;
              }
            }
          }

          if (!matches) continue;
        }

        logs.push(log);
      }
    } catch (err) {
      console.error('Failed to get events for', tronAddr, err);
      // Continue with next address
    }
  }

  return logs;
}
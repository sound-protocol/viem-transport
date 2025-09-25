import { keccak256, toHex as viemToHex } from "viem";
import type { TronWebLike } from "../types";
import { strip0x, toHex } from "./hex";
import { tronAddressTo0x } from "./address";
import { ZERO_ADDRESS } from "../constants";

export function convertEventTopics(event: any): string[] {
  const topics: string[] = [];

  // First topic is the event signature hash
  if (event.event) {
    // Extract the canonical signature from the full event string
    // "Transfer(address indexed from, address indexed to, uint256 value)" -> "Transfer(address,address,uint256)"
    const signature = event.event
      .replace(/indexed /g, '')  // Remove 'indexed' keyword
      .replace(/\s+/g, ' ')      // Normalize spaces
      .trim();

    // Extract just the function signature
    const match = signature.match(/^(\w+)\((.*)\)$/);
    if (match) {
      const name = match[1];
      const params = match[2];

      // Convert to canonical form
      const canonicalParams = params
        .split(',')
        .map((p: string) => p.trim().split(' ')[0]) // Get just the type
        .join(',');

      const canonicalSig = `${name}(${canonicalParams})`;
      // Compute the keccak256 hash of the signature
      topics.push(keccak256(viemToHex(canonicalSig)));
    }
  } else if (event.event_name) {
    // Fallback: if we only have event_name, try common signatures
    if (event.event_name === "Transfer") {
      topics.push("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
    } else if (event.event_name === "Approval") {
      topics.push("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925");
    } else {
      // For unknown events, compute hash of just the name (not ideal but better than raw name)
      topics.push(keccak256(viemToHex(event.event_name + "()")));
    }
  }

  // Add indexed parameters as additional topics
  if (event.result && event.result_type && event.event) {
    const eventSig = event.event;

    // Parse indexed parameters from the event signature
    for (const key of Object.keys(event.result_type)) {
      // Skip numeric keys (0, 1, 2, etc.)
      if (/^\d+$/.test(key)) continue;

      // Check if this parameter is indexed in the signature
      const regex = new RegExp(`${event.result_type[key]}\\s+indexed\\s+${key}`);
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

export function convertEventData(event: any): string {
  let data = '0x';

  if (event.result && event.result_type && event.event) {
    const nonIndexedValues: string[] = [];
    const eventSig = event.event;

    // Parse non-indexed parameters from the event signature
    for (const key of Object.keys(event.result_type)) {
      // Skip numeric keys
      if (/^\d+$/.test(key)) continue;

      // Check if NOT indexed
      const regex = new RegExp(`${event.result_type[key]}\\s+indexed\\s+${key}`);
      if (!regex.test(eventSig)) {
        const value = event.result[key];
        if (value !== undefined) {
          // Encode based on type
          if (event.result_type[key] === 'address') {
            // Address: 32 bytes
            const cleaned = strip0x(String(value));
            nonIndexedValues.push(cleaned.padStart(64, '0'));
          } else if (event.result_type[key].startsWith('uint') || event.result_type[key].startsWith('int')) {
            // Numbers: 32 bytes
            const num = BigInt(value);
            nonIndexedValues.push(num.toString(16).padStart(64, '0'));
          } else if (event.result_type[key] === 'bool') {
            // Boolean: 32 bytes (0 or 1)
            const boolVal = value ? '1' : '0';
            nonIndexedValues.push(boolVal.padStart(64, '0'));
          } else if (event.result_type[key].startsWith('bytes')) {
            // Bytes: already in hex
            nonIndexedValues.push(strip0x(String(value)));
          } else {
            // Default: try to handle as hex
            nonIndexedValues.push(strip0x(String(value)));
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

export function matchesTopicFilter(logTopics: string[], filterTopics: (string | string[] | null)[]): boolean {
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
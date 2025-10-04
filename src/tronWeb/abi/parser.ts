import type { Address, FunctionInfo, ParsedCallData, ParsedParam, TronWebLike } from "../types";
import { FUNCTION_REGISTRY } from "./registry";
import { tronBase58FromEvm } from "../utils/address";

export function parseCallData(rawParameter: string): ParsedCallData | null {
  if (rawParameter.length < 8) return null;

  const selector = rawParameter.substring(0, 8).toLowerCase();
  const functionInfo = FUNCTION_REGISTRY[selector];

  if (!functionInfo) return null;

  const params: ParsedParam[] = [];
  let offset = 8; // Skip the 4-byte selector (8 hex chars)

  for (const paramType of functionInfo.params) {
    if (offset >= rawParameter.length) {
      // Not enough data for all parameters
      break;
    }

    if (paramType === 'address') {
      // Address is 32 bytes (64 hex chars), but only last 20 bytes are the address
      if (offset + 64 <= rawParameter.length) {
        const addressHex = rawParameter.substring(offset + 24, offset + 64);
        params.push({ type: 'address', value: addressHex });
        offset += 64;
      }
    } else if (paramType === 'uint256' || paramType === 'uint') {
      // uint256 is 32 bytes (64 hex chars)
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset, offset + 64);
        params.push({ type: 'uint256', value: `0x${value}` });
        offset += 64;
      }
    } else if (paramType === 'uint8') {
      // uint8 is still padded to 32 bytes
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset + 62, offset + 64); // Last byte
        params.push({ type: 'uint8', value: parseInt(value, 16) });
        offset += 64;
      }
    } else if (paramType === 'bool') {
      // bool is 32 bytes, with 0 or 1 in the last byte
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset + 63, offset + 64);
        params.push({ type: 'bool', value: value === '1' });
        offset += 64;
      }
    } else if (paramType === 'bytes32') {
      // bytes32 is 32 bytes
      if (offset + 64 <= rawParameter.length) {
        const value = rawParameter.substring(offset, offset + 64);
        params.push({ type: 'bytes32', value: `0x${value}` });
        offset += 64;
      }
    } else if (paramType === 'bytes') {
      // Dynamic bytes - offset pointer followed by length and data
      if (offset + 64 <= rawParameter.length) {
        const offsetPointer = parseInt(rawParameter.substring(offset, offset + 64), 16) * 2 + 8;
        params.push({ type: 'bytes', value: offsetPointer }); // Store offset for later processing
        offset += 64;
      }
    }
  }

  // Process dynamic data types (bytes) if present
  for (let i = 0; i < params.length; i++) {
    if (params[i].type === 'bytes' && typeof params[i].value === 'number') {
      const dataOffset = params[i].value as number;
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

export function convertParamsToTron(params: ParsedParam[], tw: TronWebLike): any[] {
  return params.map(param => {
    // Convert addresses from EVM to Tron base58
    if (param.type === 'address' && typeof param.value === 'string') {
      const ethAddress = `0x${param.value}` as Address;
      const tronAddress = tronBase58FromEvm(tw, ethAddress);
      // TronWeb expects plain values, not {type, value} objects
      return tronAddress;
    }

    // Convert uint256 hex strings to numbers
    if (param.type === 'uint256' && typeof param.value === 'string') {
      // Parse hex string to number
      // For very large numbers, keep as hex string (TronWeb handles both)
      const hexValue = param.value.startsWith('0x') ? param.value.slice(2) : param.value;
      const bigIntValue = BigInt('0x' + hexValue);
      // If it fits in a safe integer, return as number, otherwise as string
      if (bigIntValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(bigIntValue);
      }
      return bigIntValue.toString();
    }

    // Return plain value for all other types
    // (uint8 is already a number, bytes is already a string, etc.)
    return param.value;
  });
}

export function extractDynamicBytes(data: string, offset: number): string {
  const lengthHex = data.substring(offset, offset + 64);
  const length = parseInt(lengthHex, 16) * 2;
  return data.substring(offset + 64, offset + 64 + length);
}
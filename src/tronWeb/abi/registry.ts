import type { FunctionInfo } from "../types";

export const FUNCTION_REGISTRY: Record<string, FunctionInfo> = {
  // ERC-20 Standard Functions
  'a9059cbb': { signature: 'transfer(address,uint256)', params: ['address', 'uint256'] },
  '095ea7b3': { signature: 'approve(address,uint256)', params: ['address', 'uint256'] },
  '23b872dd': { signature: 'transferFrom(address,address,uint256)', params: ['address', 'address', 'uint256'] },
  '70a08231': { signature: 'balanceOf(address)', params: ['address'] },
  'dd62ed3e': { signature: 'allowance(address,address)', params: ['address', 'address'] },
  '18160ddd': { signature: 'totalSupply()', params: [] },
  '313ce567': { signature: 'decimals()', params: [] },
  '95d89b41': { signature: 'symbol()', params: [] },
  '06fdde03': { signature: 'name()', params: [] },

  // Safe Contract Functions
  '6a761202': { signature: 'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)', params: ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'bytes'] },
  '0d582f13': { signature: 'addOwnerWithThreshold(address,uint256)', params: ['address', 'uint256'] },
  'f8dc5dd9': { signature: 'removeOwner(address,address,uint256)', params: ['address', 'address', 'uint256'] },
  'e009cfde': { signature: 'swapOwner(address,address,address)', params: ['address', 'address', 'address'] },
  '694e80c3': { signature: 'changeThreshold(uint256)', params: ['uint256'] },
  '610b5925': { signature: 'enableModule(address)', params: ['address'] },
  'e009cfdf': { signature: 'disableModule(address,address)', params: ['address', 'address'] },
  'd4d9bdcd': { signature: 'approveHash(bytes32)', params: ['bytes32'] },
  '20c13b0b': { signature: 'isValidSignature(bytes,bytes)', params: ['bytes', 'bytes'] },
  '2f54bf6e': { signature: 'isOwner(address)', params: ['address'] },
  'a0e67e2b': { signature: 'getOwners()', params: [] },
  'e75235b8': { signature: 'getThreshold()', params: [] },
  'affed0e0': { signature: 'nonce()', params: [] },
};
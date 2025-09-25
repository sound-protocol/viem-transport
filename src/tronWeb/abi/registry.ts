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

  // Safe Contract Functions - Core
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

  // Safe Contract Functions - Transaction Building
  'bb8310d2': { signature: 'getTransactionHash(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)', params: ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'] },
  '934f3a11': { signature: 'checkSignatures(bytes32,bytes,bytes)', params: ['bytes32', 'bytes', 'bytes'] },
  'a85594bf': { signature: 'checkNSignatures(bytes32,bytes,bytes,uint256)', params: ['bytes32', 'bytes', 'bytes', 'uint256'] },

  // Safe Contract Functions - Modules
  '468721a7': { signature: 'execTransactionFromModule(address,uint256,bytes,uint8)', params: ['address', 'uint256', 'bytes', 'uint8'] },
  'ccafc387': { signature: 'execTransactionFromModuleReturnData(address,uint256,bytes,uint8)', params: ['address', 'uint256', 'bytes', 'uint8'] },
  'aa8c217c': { signature: 'getModulesPaginated(address,uint256)', params: ['address', 'uint256'] },
  'b2494df3': { signature: 'getModules()', params: [] },
  '2d9ad53d': { signature: 'isModuleEnabled(address)', params: ['address'] },

  // Safe Contract Functions - Guards
  'e19a9dd9': { signature: 'setGuard(address)', params: ['address'] },
  '58401ed8': { signature: 'getGuard()', params: [] },

  // Safe Contract Functions - Fallback
  'f698da25': { signature: 'domainSeparator()', params: [] },
  '60b3cbf8': { signature: 'getChainId()', params: [] },
  '1624f6c6': { signature: 'setup(address[],uint256,address,bytes,address,address,uint256,address)', params: ['address[]', 'uint256', 'address', 'bytes', 'address', 'address', 'uint256', 'address'] },
  '0a1028c4': { signature: 'encodeTransactionData(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,uint256)', params: ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'] },

  // Safe Contract Functions - EIP-1271
  '1626ba7e': { signature: 'isValidSignature(bytes32,bytes)', params: ['bytes32', 'bytes'] },

  // Safe Contract Functions - Storage
  'bd79b86d': { signature: 'getStorageAt(uint256,uint256)', params: ['uint256', 'uint256'] },
  '93271368': { signature: 'simulateAndRevert(address,bytes)', params: ['address', 'bytes'] },
};
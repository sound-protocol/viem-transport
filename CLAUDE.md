# CLAUDE.md - AI Assistant Guide for Viem-Transport

## 🎯 Project Overview

**Purpose**: Bridge between TronWeb and Viem, enabling Ethereum-compatible RPC calls on the Tron blockchain.

**Core Value**: Allows developers to use familiar Ethereum tools (Viem, Wagmi, etc.) with Tron blockchain by translating Ethereum JSON-RPC methods to TronWeb equivalents.

## 🏗️ Architecture

### Modular Structure
```
src/tronWeb/                 # Main transport implementation
├── index.ts                 # Transport factory & main export
├── types/                   # TypeScript definitions
│   ├── index.ts            # Core interfaces (TronBlock, TronTransaction, etc.)
│   └── config.ts           # Transport configuration types
├── constants.ts            # Shared constants (addresses, limits)
├── utils/                  # Reusable utilities
│   ├── address.ts          # Tron ↔ EVM address conversions
│   ├── errors.ts           # Error extraction & decoding
│   ├── events.ts           # Event log processing
│   ├── hex.ts              # Hex string utilities
│   ├── numeric.ts          # Number/BigInt conversions
│   ├── signing.ts          # Transaction signing
│   ├── transactions.ts     # Transaction helpers
│   └── validation.ts       # Input validation
├── abi/                    # Contract interaction
│   ├── registry.ts         # Function signatures (ERC-20, Safe, etc.)
│   └── parser.ts           # ABI parsing & encoding
└── methods/                # RPC method handlers
    ├── registry.ts         # Method routing
    ├── types.ts           # Handler types
    ├── accounts.ts        # Balance, nonce, accounts
    ├── blocks.ts          # Block queries
    ├── contracts.ts       # eth_call, estimateGas, getCode
    ├── gas.ts             # Gas pricing & fee history
    ├── logs.ts            # Event filtering
    └── transactions.ts    # Send, receipt, get transaction
```

### Key Design Patterns

1. **Method Registry Pattern**: Each RPC method maps to a handler function
2. **Context Passing**: Handlers receive `MethodContext` with TronWeb instance, config, and helpers
3. **Address Duality**: Always handle both Tron (base58) and Ethereum (0x) formats
4. **Error Translation**: Convert Tron errors to Ethereum-compatible format

## 🔧 Common Development Tasks

### Adding a New RPC Method

1. Create handler in appropriate `methods/` file:
```typescript
// methods/myfeature.ts
export const eth_myMethod: MethodHandler = async (params, { tw, config }) => {
  // Implementation
  return result;
};
```

2. Register in `methods/registry.ts`:
```typescript
import { eth_myMethod } from "./myfeature";
export const METHOD_REGISTRY = {
  // ... existing
  "eth_myMethod": eth_myMethod,
};
```

### Adding Contract Function Support

Add to `abi/registry.ts`:
```typescript
export const FUNCTION_REGISTRY = {
  // ... existing
  'abc12345': {
    signature: 'myFunction(address,uint256)',
    params: ['address', 'uint256']
  },
};
```

### Working with Addresses

```typescript
import { assertAddress, tronBase58FromEvm, toCanonicalAddress } from "./utils/address";

// Validate and convert
const addr = assertAddress(tw, input, { method: "eth_call", parameter: 0 });
const tronAddr = tronBase58FromEvm(tw, addr);
const evmAddr = toCanonicalAddress(tw, tronAddr);
```

## 🧪 Testing

### Test Structure
- `tronWeb.test.ts` - Main transport tests (27 test cases)
- `test-transport-events.ts` - Event handling tests
- `tronweb-demo.ts` - Integration demo

### Running Tests
```bash
npm run test:run    # Run all tests
npm test           # Run tests in watch mode
npx tsx tronweb-demo.ts  # Run demo (requires .env)
```

### Test Coverage Areas
- ✅ Block methods (eth_blockNumber, eth_getBlockByNumber, etc.)
- ✅ Account methods (eth_getBalance, eth_accounts, etc.)
- ✅ Transaction methods (eth_sendTransaction, eth_getTransactionReceipt)
- ✅ Contract calls (eth_call, eth_estimateGas)
- ✅ Event logs (eth_getLogs)
- ✅ Error handling
- ✅ Address conversion

## ⚠️ Important Gotchas

### 1. Tron vs Ethereum Differences
- **No nonces**: Tron doesn't use nonces; we generate pseudo-nonces for compatibility
- **No storage slots**: eth_getStorageAt always returns zeros
- **Energy vs Gas**: 1 Energy ≈ 1 Gas unit for mapping
- **No priority fees**: eth_maxPriorityFeePerGas returns 0x0

### 2. Address Handling
- **Always validate**: Use `assertAddress()` for user inputs
- **Three formats exist**:
  - Ethereum: `0x1234...` (20 bytes)
  - Tron hex: `411234...` (21 bytes, starts with 41)
  - Tron base58: `TAbcd...` (starts with T)

### 3. Transaction Signing
- **Private key required**: TronWeb instance must have privateKey configured
- **Custom signers**: Can override via `config.sendOptions.signer`
- **Returns object not string**: `tw.trx.sign()` returns transaction object

### 4. Error Messages
- **Base64 encoded**: Some Tron errors are base64 encoded
- **Multiple formats**: Check `result.message`, `Error`, `transaction.ret`
- **Smart contract errors**: "Smart contract is not exist" = contract not deployed

## 📝 Code Conventions

### TypeScript
- Use `type` for object shapes, `interface` for extensible contracts
- Export types from index files for clean imports
- Use `any` sparingly, only for dynamic RPC parameters

### Error Handling
```typescript
// Always provide context
throw new Error(`eth_call reverted: ${reason}`);

// Use error extraction utility
const message = extractTronErrorMessage(error);
```

### Constants
- Define in `constants.ts` for reusability
- Use UPPER_CASE for constants
- Document units (e.g., `DEFAULT_FEE_LIMIT = 15_000_000 // SUN`)

## 🔑 Key Files to Understand

1. **src/tronWeb/index.ts** - Entry point, transport factory
2. **src/tronWeb/methods/registry.ts** - All supported RPC methods
3. **src/tronWeb/utils/address.ts** - Critical address conversion logic
4. **src/tronWeb/abi/registry.ts** - Supported contract functions

## 🚀 Performance Considerations

1. **Batch operations**: Use Promise.all() for parallel TronWeb calls
2. **Cache when possible**: TronWeb responses can be cached (15min for web fetches)
3. **Minimize conversions**: Cache address conversions when used multiple times

## 🔄 Migration Notes

- **From monolithic** (tronWeb.original.ts - 1735 lines) to **modular** structure
- **API unchanged**: External interface remains identical
- **Better tree-shaking**: Consumers can import only needed utilities
- **Easier testing**: Each utility can be tested in isolation

## 📦 Dependencies

Critical dependencies:
- `viem`: Ethereum library we're integrating with
- `tronweb`: Official Tron SDK
- `vitest`: Testing framework

## 🐛 Debugging Tips

1. **Enable debug mode**: Set `DEBUG_TRANSPORT=true` for function call logging
2. **Check addresses**: Most errors are address format mismatches
3. **Verify contract exists**: Use TronGrid to check contract deployment
4. **Test on Nile**: Use Nile testnet for development (faucet available)

## 📋 Checklist for Code Changes

- [ ] Tests pass: `npm run test:run`
- [ ] Demo works: `npx tsx tronweb-demo.ts`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] New methods registered in registry
- [ ] Error messages are descriptive
- [ ] Address conversions handled properly
- [ ] Constants extracted to constants.ts
- [ ] Types exported from appropriate index

## 🔗 Useful Resources

- [Tron Documentation](https://developers.tron.network/)
- [Viem Documentation](https://viem.sh/)
- [TronGrid API](https://www.trongrid.io/)
- [Nile Testnet Faucet](https://nileex.io/faucet)

## 💡 AI Assistant Tips

When working on this codebase:
1. **Always check existing patterns** before implementing new features
2. **Test with real transactions** on Nile testnet
3. **Preserve API compatibility** - external interface should not change
4. **Use modular structure** - add to existing modules rather than creating new files
5. **Document Tron-specific behavior** in comments when it differs from Ethereum

## 🎯 Project Goals

1. **100% API compatibility** with Viem's Ethereum transport
2. **Comprehensive method support** for common DeFi operations
3. **Developer-friendly** error messages and debugging
4. **Production-ready** performance and reliability
5. **Well-documented** for both users and contributors

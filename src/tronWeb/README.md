# TronWeb Viem Transport - Modular Architecture

## Overview

The TronWeb Viem transport has been refactored from a single 1700+ line file into a modular, maintainable library structure. This makes it easier to:

- Add new RPC methods
- Test individual components
- Maintain and debug code
- Reuse utilities across projects
- Tree-shake unused code

## Directory Structure

```
src/tronWeb/
├── index.ts                    # Main export & transport factory
├── types/
│   ├── index.ts               # Core TypeScript interfaces
│   └── config.ts              # Transport configuration types
├── constants.ts               # Shared constants (addresses, limits, etc.)
├── utils/
│   ├── address.ts             # Address conversion utilities
│   ├── errors.ts              # Error extraction & decoding
│   ├── events.ts              # Event log processing
│   ├── hex.ts                 # Hex conversion utilities
│   ├── numeric.ts             # Number/bigint conversions
│   └── validation.ts          # Input validation helpers
├── abi/
│   ├── registry.ts            # Function signature registry
│   └── parser.ts              # ABI parsing & parameter conversion
└── methods/
    ├── registry.ts            # Method handler registry
    ├── types.ts               # Handler type definitions
    ├── blocks.ts              # Block-related RPC methods
    ├── transactions.ts        # Transaction methods (to be implemented)
    ├── accounts.ts            # Account & balance methods (to be implemented)
    ├── contracts.ts           # Contract interaction methods (to be implemented)
    └── logs.ts                # Event log methods (to be implemented)
```

## Migration Guide

### From Monolithic to Modular

**Before (monolithic):**
```typescript
import { tronWeb } from "./tronWeb";
```

**After (modular):**
```typescript
import { tronWeb } from "./tronWeb";  // Same API, modular internals
```

The external API remains the same - only the internal structure has changed.

## Adding New Features

### Adding a New RPC Method

1. **Create or update the appropriate method handler file** in `methods/`:

```typescript
// methods/myfeature.ts
import type { MethodHandler } from "./types";

export const eth_myNewMethod: MethodHandler = async (params, { tw, config }) => {
  // Implementation here
  return result;
};
```

2. **Register the method** in `methods/registry.ts`:

```typescript
import { eth_myNewMethod } from "./myfeature";

export const METHOD_REGISTRY = {
  // ... existing methods
  "eth_myNewMethod": eth_myNewMethod,
};
```

### Adding a New Utility

1. **Create the utility** in the appropriate `utils/` file:

```typescript
// utils/mynewutil.ts
export function myUtility(param: string): string {
  // Implementation
}
```

2. **Export it** from the main index if needed externally:

```typescript
// index.ts
export { myUtility } from "./utils/mynewutil";
```

### Adding ABI Support for New Contract Functions

1. **Add to the function registry** in `abi/registry.ts`:

```typescript
export const FUNCTION_REGISTRY = {
  // ... existing functions
  'abc12345': {
    signature: 'myFunction(address,uint256)',
    params: ['address', 'uint256']
  },
};
```

## Benefits of Modular Structure

### 1. **Maintainability**
- Each module has a single responsibility
- Easier to locate and fix bugs
- Clear separation of concerns

### 2. **Testability**
- Test individual utilities in isolation
- Mock dependencies easily
- Better test coverage

### 3. **Extensibility**
- Add new methods without touching core logic
- Plugin-style architecture for RPC handlers
- Easy to add new contract function support

### 4. **Reusability**
- Utilities can be imported separately
- Share code between different transports
- Build additional tools using the same utilities

### 5. **Performance**
- Better tree-shaking with modern bundlers
- Load only what you need
- Smaller bundle sizes in production

## Example: Complete Method Implementation

Here's how to implement a complete RPC method using the modular structure:

```typescript
// methods/accounts.ts
import type { MethodHandler } from "./types";
import { assertAddress, tronBase58FromEvm } from "../utils/address";
import { toHex } from "../utils/hex";

export const eth_getBalance: MethodHandler = async (params, { tw }) => {
  // Use utility for address validation
  const address0x = assertAddress(tw, params[0], {
    method: "eth_getBalance",
    parameter: 0
  });

  // Use address conversion utility
  const tronAddress = tronBase58FromEvm(tw, address0x);

  // Call TronWeb method
  const balanceSun = await tw.trx.getBalance(tronAddress);

  // Use hex conversion utility
  return toHex(balanceSun ?? 0);
};
```

## Testing

The modular structure makes testing much easier:

```typescript
// __tests__/utils/address.test.ts
import { tronBase58FromEvm, toCanonicalAddress } from "../utils/address";

describe("Address utilities", () => {
  test("converts EVM address to Tron base58", () => {
    const result = tronBase58FromEvm(mockTw, "0x1234...");
    expect(result).toBe("T...");
  });
});
```

## Next Steps

To complete the migration, implement the remaining method handlers:

1. `methods/transactions.ts` - Transaction sending and retrieval
2. `methods/accounts.ts` - Account queries and balances
3. `methods/contracts.ts` - Contract calls and gas estimation
4. `methods/logs.ts` - Event log filtering

Each can be implemented independently following the established patterns.
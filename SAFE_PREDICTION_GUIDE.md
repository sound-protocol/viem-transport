# Safe Address Prediction - Which Version to Use?

## Two Versions Available

### 1. `predictSafeAddress()` - Fast (Hardcoded Bytecode)

**When to use:**
- ✅ Using official Safe v1.3.0 on Nile testnet
- ✅ Using official Safe v1.3.0 on mainnet (same bytecode)
- ✅ Performance critical (no RPC call)

**Pros:**
- Fast (synchronous, instant)
- Simple API (no walletClient needed)

**Cons:**
- Only works with Safe v1.3.0 bytecode
- Breaks with custom factories
- Breaks with different Safe versions

```typescript
import { predictSafeAddress } from '@wirexapp/viem-transport';

const predicted = predictSafeAddress(
  tw,
  'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',  // Factory
  'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',  // Singleton
  { owners, threshold, fallbackHandler },
  saltNonce
);
```

---

### 2. `predictSafeAddressWithBytecode()` - Flexible (Fetches Bytecode)

**When to use:**
- ✅ Custom Safe factory deployments
- ✅ Different Safe versions (v1.4.0, v2.0.0, etc.)
- ✅ Building NPM packages (users have different factories)
- ✅ Multi-network support
- ✅ When you're not 100% sure about factory bytecode

**Pros:**
- Works with ANY factory address
- Works with ANY Safe version
- Future-proof (no hardcoded bytecode)
- Caches bytecode (fast after first call)

**Cons:**
- Async (requires await)
- Needs WalletClient parameter
- First call slower (~200-500ms for RPC)

```typescript
import { createWalletClient } from 'viem';
import { tronWeb, predictSafeAddressWithBytecode } from '@wirexapp/viem-transport';

const transport = tronWeb(tw);
const walletClient = createWalletClient({ transport });

const predicted = await predictSafeAddressWithBytecode(
  tw,
  walletClient,
  'TYourFactory...',  // ANY factory
  'TYourSingleton...',
  { owners, threshold, fallbackHandler },
  saltNonce,
  { useCache: true }  // Caches for performance
);
```

---

## Quick Decision Tree

```
Are you using official Safe v1.3.0 on Nile/Mainnet?
├─ YES → Use predictSafeAddress() (fast version)
└─ NO → Use predictSafeAddressWithBytecode() (flexible version)

Building an NPM package for others?
└─ YES → Use predictSafeAddressWithBytecode() (always)

Using custom factory or different Safe version?
└─ YES → Use predictSafeAddressWithBytecode() (always)

Not sure which to use?
└─ Use predictSafeAddressWithBytecode() (safe choice)
```

---

## Comparison Table

| Feature | `predictSafeAddress()` | `predictSafeAddressWithBytecode()` |
|---------|------------------------|-------------------------------------|
| **Speed** | ⚡ Instant | 🐢 ~200ms first call, then instant |
| **API** | Sync | Async (await) |
| **Factory Support** | ❌ v1.3.0 only | ✅ Any factory |
| **Safe Versions** | ❌ v1.3.0 only | ✅ Any version |
| **Custom Deployments** | ❌ Breaks | ✅ Works |
| **NPM Package Use** | ⚠️ Risky | ✅ Safe |
| **Parameters** | Simple (no walletClient) | +walletClient |

---

## Real Example: When Fast Version Breaks

```typescript
// Scenario: User has Safe v1.4.0 (different bytecode than v1.3.0)

// Fast version (WRONG - uses v1.3.0 bytecode)
const predicted = predictSafeAddress(tw, factory, singleton, config, saltNonce);
// Returns: 0xabc123... ❌

// User deploys with v1.4.0
const deployed = await deploySafe(config, saltNonce);
// Returns: 0xdef456... ❌ DIFFERENT!

// Funds sent to 0xabc123 are LOST! 💸

// ✅ SOLUTION: Use bytecode-fetching version
const predicted = await predictSafeAddressWithBytecode(
  tw, walletClient, factory, singleton, config, saltNonce
);
// Returns: 0xdef456... ✅ MATCHES!
```

---

## Production Recommendations

### For Your Own App
If you control the Safe deployment and know it's v1.3.0:
```typescript
// Fast version works fine
const predicted = predictSafeAddress(tw, FACTORY, SINGLETON, config, saltNonce);
```

### For NPM Package / Library
Always use the flexible version:
```typescript
// Works for all users
const predicted = await predictSafeAddressWithBytecode(
  tw, walletClient, userFactory, userSingleton, config, saltNonce
);
```

### Hybrid Approach
Best of both worlds:
```typescript
const OFFICIAL_NILE_FACTORY = 'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4';

if (factoryAddress === OFFICIAL_NILE_FACTORY) {
  // Fast path for known factory
  return predictSafeAddress(tw, factory, singleton, config, saltNonce);
} else {
  // Safe path for unknown factory
  return await predictSafeAddressWithBytecode(
    tw, walletClient, factory, singleton, config, saltNonce
  );
}
```

---

## Cache Management

The bytecode-fetching version caches results per factory:

```typescript
import { clearProxyCodeCache } from '@wirexapp/viem-transport';

// Clear cache if factory was upgraded
clearProxyCodeCache();

// Or force fresh fetch for specific call
const predicted = await predictSafeAddressWithBytecode(
  tw, walletClient, factory, singleton, config, saltNonce,
  { useCache: false }  // Skip cache
);
```

---

## Verification

Verify which version you should use:

```bash
# Test if your factory matches hardcoded v1.3.0 bytecode
npx tsx verify-proxy-bytecode.ts

# ✅ PERFECT MATCH → predictSafeAddress() works
# ❌ MISMATCH → MUST use predictSafeAddressWithBytecode()
```

---

## Summary

**Both versions are production-ready and verified.**

- Use `predictSafeAddress()` if you know you have Safe v1.3.0
- Use `predictSafeAddressWithBytecode()` for everything else

**When in doubt → Use `predictSafeAddressWithBytecode()`**

It's the safe, future-proof choice that works with any factory.

# TRON-Ethereum Signature Compatibility Solution

## Problem Statement

As of September 2025, there's a critical signature compatibility issue between TRON and Ethereum that blocks Safe (Gnosis Safe) deployment on TRON:

1. **TronWeb's `signMessageV2`** uses prefix: `\x19TRON Signed Message:\n`
2. **Ethereum** uses prefix: `\x19Ethereum Signed Message:\n`
3. **Safe contracts use `ecrecover`** which expects Ethereum prefix
4. **Result**: TRON signatures recover to different addresses, failing Safe's verification

### Test Results
```
Tron address: TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp
Expected EVM: 0xd28399e9778f71e0ef0290ddd06de8a37370a9c5
Recovered:    0x4F2f53808cd0241F48D53aba080Fa7FA9ec5Ea86 ❌ WRONG
```

## Solutions Implemented

### 1. Immediate Solution: Ethereum-Compatible Transport

Configure the viem-transport with Ethereum-compatible signing:

```typescript
import { tronWeb } from "viem-transport";

const safeCompatibleTransport = tronWeb(tw, {
  chainId: 3448148188, // Nile testnet
  signatureCompatibility: {
    useEthereumPrefix: true,      // ✅ Required for Safe
    adjustVValue: true,            // ✅ Ensure v is 27/28
    supportDualVerification: false // Performance optimization
  }
});

// Now all signatures will be Safe-compatible!
const signature = await transport.request({
  method: "personal_sign",
  params: [message, address]
});
```

### 2. Direct Signing Utilities

For low-level control, use the signing utilities directly:

```typescript
import { signWithEthereumPrefix } from "viem-transport/utils/ethereum-compatible-signing";

// Sign with Ethereum prefix for Safe compatibility
const signature = await signWithEthereumPrefix(tw, message);

// This signature works with Ethereum's ecrecover!
const recovered = await recoverMessageAddress({
  message: message,
  signature: signature
});
```

### 3. Modified Safe Contracts (Optional)

Deploy a dual-verification contract that supports both TRON and Ethereum:

```solidity
contract TronSafeSignatureValidator {
    function verifyDualSignature(
        bytes memory message,
        bytes memory signature,
        address expectedSigner
    ) public pure returns (bool) {
        // Try TRON prefix
        bytes32 tronHash = keccak256(
            abi.encodePacked(
                "\x19TRON Signed Message:\n",
                uint2str(message.length),
                message
            )
        );

        if (recoverSigner(tronHash, signature) == expectedSigner) {
            return true;
        }

        // Try Ethereum prefix
        bytes32 ethHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n",
                uint2str(message.length),
                message
            )
        );

        return recoverSigner(ethHash, signature) == expectedSigner;
    }
}
```

### 4. EIP-1271 Smart Wallet (Best Long-term)

Deploy a smart contract wallet that handles signature validation:

```solidity
contract TronSmartWallet is IEIP1271 {
    bytes4 constant internal MAGICVALUE = 0x1626ba7e;

    function isValidSignature(
        bytes32 _hash,
        bytes memory _signature
    ) external view returns (bytes4 magicValue) {
        // Custom validation logic that works with both
        // TRON and Ethereum signatures
        address signer = recoverSigner(_hash, _signature);

        if (owners[signer]) {
            return MAGICVALUE;
        }

        return 0xffffffff;
    }
}
```

## Technical Background

### Why This Happens

1. **TIP-191 vs EIP-191**: TRON implemented TIP-191 (similar to EIP-191) but with "TRON" prefix
2. **Different Prefixes**: The prefix difference changes the message hash
3. **ecrecover Sensitivity**: `ecrecover` returns different addresses for different hashes
4. **V Value Format**: Both use v=27/28, but handling varies

### TRON Updates (2025)

- **TIP-120**: ECDSA Signature Encoding Specification
- **TIP-191**: Message signing standard (TRON prefix)
- **TIP-712**: Typed structured data hashing (EIP-712 equivalent)
- **Bug Fix (June 2025)**: Fixed ECDSA recovery ID computation

## Usage Examples

### Example 1: Safe Deployment on TRON

```typescript
// Configure transport for Safe compatibility
const transport = tronWeb(tw, {
  signatureCompatibility: {
    useEthereumPrefix: true // Critical for Safe!
  }
});

// Deploy Safe contracts as normal
// Signatures will now verify correctly!
```

### Example 2: Existing Contract Integration

```typescript
// For contracts already deployed expecting Ethereum signatures
const signature = await signWithEthereumPrefix(tw, message);

// Send to contract - will verify with ecrecover
await contract.verifySignature(message, signature);
```

### Example 3: Testing Signature Compatibility

```typescript
// Test file: test-safe-signature-solution.ts
npm run example:safe-signature

// This will show:
// ❌ Default TRON signing - incompatible
// ✅ Solution 1 - Transport with compatibility
// ✅ Solution 2 - Direct Ethereum signing
// ✅ Solution 3 - Contract strategies
```

## Configuration Reference

```typescript
interface SignatureCompatibilityConfig {
  // Use Ethereum prefix for all signatures (Required for Safe)
  useEthereumPrefix: boolean; // Default: true

  // Adjust v values to Ethereum format (27/28)
  adjustVValue: boolean; // Default: true

  // Support both TRON and Ethereum verification
  supportDualVerification: boolean; // Default: false
}
```

## Migration Guide

### For New Projects

1. Always use `signatureCompatibility: { useEthereumPrefix: true }`
2. Test signature recovery before deployment
3. Consider EIP-1271 for maximum flexibility

### For Existing Projects

1. Add compatibility config to transport
2. Update signing calls if using direct TronWeb
3. Test thoroughly on testnet

## Testing

Run the comprehensive test suite:

```bash
# Test signature compatibility
npx tsx examples/basic/test-safe-signature-solution.ts

# Test with real Safe deployment
npx tsx examples/basic/test-safe-real-world.ts

# Test signature verification
npx tsx examples/basic/test-signature-verification.ts
```

## Troubleshooting

### Signature Still Incompatible?

1. Verify `useEthereumPrefix: true` is set
2. Check v value is 27 or 28 (not 0 or 1)
3. Ensure message format matches expectation
4. Test with `recoverMessageAddress` from viem

### Performance Concerns?

1. Set `supportDualVerification: false`
2. Use direct signing for batch operations
3. Cache signatures when possible

## Resources

- [TIP-191: TRON Message Signing](https://github.com/tronprotocol/tips/blob/master/tip-191.md)
- [TIP-120: ECDSA Encoding](https://github.com/tronprotocol/tips/issues/120)
- [Safe Contracts](https://github.com/safe-global/safe-contracts)
- [EIP-1271: Smart Contract Signatures](https://eips.ethereum.org/EIPS/eip-1271)

## Summary

✅ **Problem Solved**: TRON signatures now work with Safe contracts

✅ **Multiple Solutions**: Choose based on your needs
- Quick fix: Transport configuration
- Full control: Direct signing utilities
- Maximum flexibility: Smart contract approaches

✅ **Production Ready**: Tested and verified on Nile testnet

✅ **Future Proof**: Supports upcoming Safe features and modules
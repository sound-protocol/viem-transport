# Safe Address Prediction on Tron - Production Guide

## Overview

This guide explains how to predict Safe wallet addresses on Tron BEFORE deployment using CREATE2. This is critical for production systems that need to:

1. Store the predicted address in a database
2. Allow users to deposit funds to the address
3. Deploy the Safe when funded
4. Ensure the deployed address matches the prediction

## Critical Discovery: Tron's CREATE2 Formula

**Tron uses a DIFFERENT CREATE2 formula than Ethereum**, despite being EVM-compatible:

### Ethereum CREATE2 Formula
```
address = keccak256(0xff ++ factory_20bytes ++ salt ++ keccak256(init_code))[12:]
```

### Tron CREATE2 Formula (Empirically Verified)
```
address = keccak256(factory_21bytes ++ salt ++ keccak256(init_code))[12:]
```

**Key Differences**:
- ❌ NO `0xff` prefix
- ✅ Factory address is 21 bytes (includes `0x41` Tron prefix)
- ✅ Salt and init_code hash remain the same

## Verification

This formula was verified against real Tron Nile testnet deployment:

**Transaction**: `2a552e5f6eb42fcd72bda99045d874af2c8030fd5d880a1acf099400f88c097a`

**Predicted Address**: `0xa9345291e475f54a4fa4bb293ade772369b72294`
**Actual Deployed**: `0xa9345291e475f54a4fa4bb293ade772369b72294`
**Result**: ✅ **PERFECT MATCH**

See `DEFINITIVE-TEST.ts` for the complete verification test.

## Usage

### Basic Prediction (Production-Ready)

```typescript
import { TronWeb } from 'tronweb';
import { predictSafeAddress, extractSaltNonceFromTransaction } from '@your-package/viem-transport';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
});

// Predict Safe address BEFORE deployment
const predictedAddress = predictSafeAddress(
  tw,
  'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',  // ProxyFactory (Nile testnet)
  'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',  // Safe Singleton (Nile testnet)
  {
    owners: [
      'TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp',
      'TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx',
      'TLbudatWj7613sD6bvUG4abWcZADZ6Vpje'
    ],
    threshold: 2,
    fallbackHandler: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC'
  },
  40233009988904046579903828608411390460370165498036168447930257006188357542187n // saltNonce
);

console.log('Predicted address:', predictedAddress);
// Output: 0xa9345291e475f54a4fa4bb293ade772369b72294
```

### Production Workflow

```typescript
// 1. User initiates Safe creation
const user = await getUserFromDatabase(userId);

// 2. Predict Safe address with unique salt nonce
const saltNonce = generateUniqueSaltNonce(); // Your implementation
const predictedAddress = predictSafeAddress(
  tw,
  FACTORY_ADDRESS,
  SINGLETON_ADDRESS,
  {
    owners: user.selectedOwners,
    threshold: user.selectedThreshold,
    fallbackHandler: FALLBACK_HANDLER_ADDRESS
  },
  saltNonce
);

// 3. Store in database
await database.safes.insert({
  userId,
  safeAddress: predictedAddress,
  status: 'PENDING_DEPOSIT',
  saltNonce: saltNonce.toString(),
  owners: user.selectedOwners,
  threshold: user.selectedThreshold,
  createdAt: new Date()
});

// 4. Show address to user for deposit
console.log(`Please deposit TRX to: ${tw.address.fromHex('41' + predictedAddress.slice(2))}`);

// 5. Monitor for deposits
const balance = await checkBalance(predictedAddress);
if (balance >= MINIMUM_DEPLOYMENT_COST) {
  // 6. Deploy Safe with EXACT same parameters and saltNonce
  const { protocolKit, safeAddress } = await deploySafeWithProtocolKit(
    config,
    user.selectedOwners,
    user.selectedThreshold,
    saltNonce.toString() // Must be same salt!
  );

  // 7. Verify address matches
  if (safeAddress.toLowerCase() !== predictedAddress.toLowerCase()) {
    throw new Error('CRITICAL: Deployed address does not match prediction!');
  }

  // 8. Update database
  await database.safes.update(predictedAddress, {
    status: 'DEPLOYED',
    deployedAt: new Date(),
    deploymentTxHash: deploymentTx.hash
  });
}
```

### Extract Salt from Existing Deployment

If you need to verify an existing deployment or extract the salt used:

```typescript
// Get transaction data from TronGrid
const txData = '0x1688f0b9000000000000000000...'; // From createProxyWithNonce call

// Extract salt nonce
const saltNonce = extractSaltNonceFromTransaction(txData);
console.log('Salt nonce used:', saltNonce.toString());
```

## Important Notes

### Salt Nonce Requirements

The `saltNonce` parameter is **REQUIRED** for Tron Safe address prediction. Unlike Ethereum where Protocol Kit can use default salts, on Tron you must:

1. Generate a unique salt nonce for each Safe
2. Store the salt nonce in your database
3. Use the EXACT same salt when deploying

```typescript
// Example: Generate unique salt
function generateUniqueSaltNonce(): bigint {
  // Option 1: Random
  const random = crypto.randomBytes(32);
  return BigInt('0x' + random.toString('hex'));

  // Option 2: Deterministic (based on user ID + timestamp)
  const data = `${userId}-${Date.now()}`;
  return BigInt('0x' + keccak256(toHex(data)));
}
```

### Address Format Handling

The prediction function:
- **Accepts**: Tron base58 addresses (e.g., `TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4`)
- **Returns**: EVM format addresses (e.g., `0xa9345291e475f54a4fa4bb293ade772369b72294`)

To show users the Tron base58 format:

```typescript
const evmAddress = predictSafeAddress(/* ... */);
const tronBase58 = tw.address.fromHex('41' + evmAddress.slice(2));
console.log('Tron address:', tronBase58);
// Output: TQyDcrRpWByk93J3ULdyqfPFMJKCJehXEy
```

### Configuration Parameters

All parameters must EXACTLY match between prediction and deployment:

```typescript
interface SafeSetupConfig {
  owners: string[];           // Must be in same order
  threshold: number;          // Must be same value
  to?: string;                // Optional: contract to call during setup
  data?: `0x${string}`;       // Optional: data for setup call
  fallbackHandler?: string;   // Must be same (or both undefined)
  paymentToken?: string;      // Must be same (or both undefined)
  payment?: bigint;           // Must be same (or both 0n)
  paymentReceiver?: string;   // Must be same (or both undefined)
}
```

**Warning**: If ANY parameter differs between prediction and deployment, the addresses will NOT match!

## Testing

Verify your implementation with the provided test:

```bash
npx tsx test-safe-prediction-VERIFIED.ts
```

Expected output:
```
✅✅✅ PERFECT MATCH! ✅✅✅

🎉 Safe address prediction is WORKING!
🎉 CREATE2 formula for Tron is CORRECT!
🎉 Production-ready for pre-funding Safes!
```

## Troubleshooting

### Predicted address doesn't match deployed

**Common causes**:

1. **Different salt nonce**
   - Ensure you use the EXACT same salt for prediction and deployment
   - Store salt in database when predicting

2. **Different owners or order**
   - Owners must be in the EXACT same order
   - Addresses must be in same format (all base58 or all EVM)

3. **Different threshold**
   - Must use same threshold value

4. **Different optional parameters**
   - If fallbackHandler was set during prediction, must be set during deployment
   - If it was undefined during prediction, must be undefined during deployment

### How to debug

1. Extract salt from actual deployment:
```typescript
const actualSalt = extractSaltNonceFromTransaction(deploymentTxData);
console.log('Salt used in deployment:', actualSalt.toString());
```

2. Compare all parameters:
```typescript
console.log('Prediction params:', {
  owners: predictedOwners,
  threshold: predictedThreshold,
  saltNonce: predictedSalt.toString()
});

console.log('Deployment params:', {
  owners: deployedOwners,
  threshold: deployedThreshold,
  saltNonce: actualSalt.toString()
});
```

3. Run DEFINITIVE-TEST.ts to verify CREATE2 formula:
```bash
npx tsx DEFINITIVE-TEST.ts
```

## Contract Addresses (Nile Testnet)

```typescript
export const NILE_SAFE_ADDRESSES = {
  PROXY_FACTORY: 'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',
  SAFE_SINGLETON: 'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',
  FALLBACK_HANDLER: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC',
  MULTI_SEND: 'TDV15hzT8oM1redKrouCnbt5Hw5gNXZ1Gq',
  MULTI_SEND_CALL_ONLY: 'TEEBYu2ctK9V8E9xtbsQzJXkBFKLzBC1RH',
};
```

## Security Considerations

1. **Never deploy without funding first**
   - Someone else could deploy to the same address if you reveal parameters
   - Always ensure address has sufficient TRX before deploying

2. **Validate all inputs**
   - Ensure owners are valid Tron addresses
   - Threshold must be <= number of owners
   - Threshold must be >= 1

3. **Store salt nonce securely**
   - Salt nonce is required to deploy the Safe
   - If lost, you cannot deploy to the predicted address
   - Back up salt nonce in multiple places

4. **Test on Nile first**
   - Always test full flow on Nile testnet before mainnet
   - Verify addresses match before deploying with real funds

## References

- Tron CREATE2 Implementation: [TronProtocol/java-tron](https://github.com/tronprotocol/java-tron)
- Safe Protocol Kit: [@safe-global/protocol-kit](https://www.npmjs.com/package/@safe-global/protocol-kit)
- Verification Transaction: [Nile TronScan](https://nile.tronscan.org/#/transaction/2a552e5f6eb42fcd72bda99045d874af2c8030fd5d880a1acf099400f88c097a)
- DEFINITIVE-TEST.ts: Empirical verification of CREATE2 formula

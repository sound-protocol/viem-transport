# Tron to Ethereum Gas Mapping Strategy

## Overview

This document explains how we map Tron's Energy and Bandwidth resource model to Ethereum's gas system for compatibility with tools like Gnosis Safe, viem, and other EVM-based infrastructure.

## Tron Resource Model

### Bandwidth
- **Purpose**: Used for simple transactions (transfers, account operations)
- **Cost**: 1 TRX = 1,000 bandwidth points
- **Free allocation**: 1,500 bandwidth daily per account
- **Consumption**:
  - Base transaction: ~265 bandwidth
  - Additional for memo: +1 bandwidth per byte
  - New account creation: +100 bandwidth

### Energy
- **Purpose**: Used for smart contract execution only
- **Cost**: Variable, currently ~420 SUN per energy unit (2025)
- **Free allocation**: None by default (must stake TRX)
- **Consumption**: Based on computational complexity

### Resource Priority
1. Free bandwidth (1,500 daily)
2. Staked bandwidth (from frozen TRX)
3. Burn TRX for bandwidth
4. Staked energy (from frozen TRX)
5. Burn TRX for energy

## Mapping Strategy

### 1. Gas Estimation (`eth_estimateGas`)

#### Simple Transfers
```javascript
// Input: TRX transfer without data
// Output: 21,000 gas (Ethereum standard)
// Rationale: Maintains compatibility with Ethereum tools
```

#### Contract Calls
```javascript
// Input: Transaction with calldata
// Process:
// 1. Call triggerConstantContract to get energy_used
// 2. Gas = 30,000 (base) + energy_used
// 3. Fallback: 30,000 + (calldata_bytes * 68)
```

#### Contract Deployment
```javascript
// Input: Transaction without 'to' address
// Gas = 500,000 + (bytecode_bytes * 68)
// Rationale: Deployments are expensive on Tron
```

### 2. Gas Price (`eth_gasPrice`)

```javascript
// Returns: Current energy price in SUN (typically 420)
// Source: getEnergyFee from chain parameters
// Fallback: 420 SUN (default 2025 price)
```

**Mapping Logic**:
- 1 SUN → 1 Wei (direct mapping)
- Energy price fluctuates with network demand
- Updated dynamically from chain parameters

### 3. Priority Fees (`eth_maxPriorityFeePerGas`)

```javascript
// Always returns: 0x0
// Reason: Tron has no priority fee mechanism
```

### 4. Fee History (`eth_feeHistory`)

```javascript
// Returns:
{
  oldestBlock: "0x...",
  baseFeePerGas: ["0x1a4", "0x1a4", ...], // Energy price for each block
  gasUsedRatio: [0.5, 0.5, ...], // Moderate usage (no block limits)
  reward: [["0x0"], ["0x0"], ...] // No priority fees
}
```

## Cost Calculation Examples

### Example 1: Simple Transfer
```
Transaction: Send 100 TRX
Bandwidth needed: 265
Free bandwidth available: 1,500

Ethereum equivalent:
- Gas: 21,000
- Gas Price: 420 SUN
- Displayed cost: 8.82 TRX (for compatibility)
- Actual cost: 0 TRX (using free bandwidth)
```

### Example 2: Token Transfer (TRC-20)
```
Transaction: Transfer TRC-20 tokens
Energy needed: 15,000
Energy available (staked): 50,000

Ethereum equivalent:
- Gas: 45,000 (30,000 + 15,000)
- Gas Price: 420 SUN
- Displayed cost: 18.9 TRX
- Actual cost: 0 TRX (using staked energy)
```

### Example 3: Complex Contract Call
```
Transaction: DeFi swap operation
Energy needed: 80,000
Energy available: 0

Ethereum equivalent:
- Gas: 110,000 (30,000 + 80,000)
- Gas Price: 420 SUN
- Displayed cost: 46.2 TRX
- Actual cost: 33.6 TRX (80,000 * 420 / 1,000,000)
```

## Integration with Gnosis Safe

### Safe Transaction Flow

1. **Gas Estimation Phase**
   ```javascript
   // Safe calls eth_estimateGas
   const gas = await client.estimateGas({
     from: safeAddress,
     to: targetContract,
     data: encodedData
   });
   // Returns: Energy usage + base gas
   ```

2. **Price Query Phase**
   ```javascript
   // Safe calls eth_gasPrice
   const gasPrice = await client.getGasPrice();
   // Returns: Current energy price (e.g., 420)
   ```

3. **Fee Calculation**
   ```javascript
   // Safe calculates: maxFee = gas * gasPrice
   const maxFee = 110000n * 420n; // 46,200,000 SUN
   const maxFeeTRX = 46.2; // Display to user
   ```

4. **Transaction Execution**
   ```javascript
   // Safe submits with calculated limits
   // Our transport maps to Tron fee_limit
   fee_limit = maxFee; // In SUN
   ```

### Important Considerations for Safe

1. **Fee Limits**: Always set appropriate `feeLimit` in transport config
2. **Resource Availability**: Safe doesn't know about free/staked resources
3. **Display vs Actual**: Displayed costs may differ from actual costs
4. **Signature Validation**: Tron uses different signature format

## Configuration Recommendations

### For DApps
```typescript
const transport = tronWeb(tronWebInstance, {
  chainId: 728126428, // Tron mainnet
  sendOptions: {
    feeLimit: 15_000_000, // 15 TRX default
  },
  callOptions: {
    feeLimit: 10_000_000, // 10 TRX for view functions
  }
});
```

### For Safe Deployments
```typescript
const transport = tronWeb(tronWebInstance, {
  chainId: 728126428,
  sendOptions: {
    feeLimit: 100_000_000, // 100 TRX for complex operations
    signer: customTronSigner, // Handle Tron-specific signing
  }
});
```

## Limitations and Workarounds

### Current Limitations
1. **Storage Access**: `eth_getStorageAt` not supported (returns zeros)
2. **Event Filtering**: Limited compared to Ethereum
3. **Block Tags**: Only 'latest' fully supported
4. **Nonces**: Not used in Tron (always return 0)

### Workarounds
1. **For Storage**: Use contract getter methods instead
2. **For Events**: Use TronWeb event API directly when needed
3. **For Historical Data**: Cache important data off-chain
4. **For Nonces**: Ignore in transaction building

## Network-Specific Constants (2025)

| Parameter | Value | Unit |
|-----------|-------|------|
| Energy Price | 420 | SUN/unit |
| Bandwidth Price | 1,000 | SUN/point |
| Free Bandwidth | 1,500 | points/day |
| Account Activation | 1.1 | TRX |
| TRC-10 Issue Fee | 1,024 | TRX |
| TRC-20 Deploy | ~30-100 | TRX (energy) |

## Testing Recommendations

1. **Test with Various Resource States**:
   - Account with free bandwidth
   - Account with staked resources
   - Account with no resources

2. **Test Edge Cases**:
   - Large calldata (>10KB)
   - Failed transactions
   - Out-of-energy scenarios

3. **Monitor Actual vs Estimated**:
   - Compare estimated gas with actual energy used
   - Track prediction accuracy
   - Adjust multipliers if needed

## Conclusion

This mapping strategy provides a practical bridge between Tron's resource model and Ethereum's gas system. While not perfect due to fundamental differences, it enables tools like Gnosis Safe to operate on Tron with reasonable cost estimates and transaction success rates.

Key success factors:
- Accurate energy estimation via `triggerConstantContract`
- Dynamic gas price from chain parameters
- Appropriate fee limits for different operation types
- Clear communication of actual vs displayed costs
# Tron-Ethereum Transport Layer for Viem

A transport layer that enables Ethereum applications (particularly Safe/Gnosis Safe) to interact with the Tron blockchain without modification.

## What Actually Works ✅

### Core Functionality (Production-Ready)
- **Address Conversion**: Seamless conversion between Ethereum (0x) and Tron (T...) addresses
- **Basic RPC Methods**:
  - `eth_chainId` - Returns configured chain ID
  - `eth_blockNumber` - Current block number
  - `eth_getBalance` - TRX balance queries
  - `eth_gasPrice` - Returns energy price (100 SUN/unit)
  - `eth_accounts` - Returns configured accounts
  - `eth_getTransactionCount` - Pseudo-nonce using block numbers

### Transaction Execution (Tested on Mainnet & Testnet)
- **TRX Transfers**: Native token transfers work reliably
- **ERC-20/TRC-20 Operations**:
  - ✅ `transfer()` - Tested with real USDT
  - ✅ `approve()` - Tested with real USDT
  - ✅ `balanceOf()` - Reading token balances
  - ✅ `decimals()`, `symbol()`, `name()` - Token metadata
- **Contract Calls**: `eth_call` for reading smart contract state
- **Gas Estimation**: `eth_estimateGas` provides reasonable estimates
- **Message Signing**: `eth_sign` for signing messages

### Event Support (Working!)
- **Event Logs**: `eth_getLogs` fully functional
  - ✅ Proper keccak256 event signature hashing
  - ✅ Indexed parameters as topics
  - ✅ Non-indexed parameters in data field
  - ✅ Topic filtering support
  - ✅ Block range queries
- **Real blockchain events** from TronGrid API
- **Tested with USDT** on both testnet and mainnet

### Function Registry (22 Functions Supported)
```javascript
// ERC-20 Standard (9 functions)
transfer, approve, transferFrom, balanceOf, allowance,
totalSupply, decimals, symbol, name

// Safe Multisig (13 functions)
execTransaction, addOwnerWithThreshold, removeOwner,
swapOwner, changeThreshold, disableModule, enableModule,
getOwners, getThreshold, isOwner, getModules,
nonce, getTransactionHash
```

## What Partially Works ⚠️

### Limited Implementation
- **Transaction Receipts**: Basic structure only, **no event logs**
- **Block Information**: Returns block data but missing many Ethereum fields
- **Transaction Details**: `eth_getTransaction` returns basic info only
- **Raw Transactions**: `eth_sendRawTransaction` works but requires pre-signed Tron format
- **Fee History**: `eth_feeHistory` returns static values

## What Doesn't Work ❌

### Missing Features
- **Contract Code**: `eth_getCode` - Returns empty (Tron API limitations)
  - Cannot verify if address is a contract
  - Contract deployment detection fails

- **Storage Access**: `eth_getStorageAt` - Always returns zeros
  - Cannot read raw contract storage
  - Advanced contract queries impossible

- **Filters**: All filter methods - **NOT IMPLEMENTED**
  - `eth_newFilter`
  - `eth_getFilterChanges`
  - `eth_getFilterLogs`
  - `eth_uninstallFilter`
  - Note: `eth_getLogs` works without filters

### Architectural Limitations
- **No Real Nonces**: Tron doesn't have nonces; we fake it with block numbers
  - High-frequency trading will break
  - Concurrent transactions may fail
  - Nonce management is impossible

- **No WebSocket Support**: Only HTTP RPC
  - No real-time updates
  - No subscription methods
  - Polling required for updates

- **No Pending Pool**: Tron has no mempool concept
  - Cannot query pending transactions
  - No transaction replacement (RBF)
  - No pending block simulation

## Known Issues 🐛

1. **Error Messages**: Sometimes cryptic, especially for contract reverts
2. **Gas Calculations**: Energy-to-gas conversion is approximation
3. **Type Handling**: Some complex ABI types may not convert properly
4. **Multicall**: Disabled due to Tron limitations
5. **EIP-712**: Typed data signing not implemented (permits)
6. **Transaction Receipts**: Don't include event logs (separate `eth_getLogs` call needed)

## Use Case Suitability

### ✅ Good For:
- Token transfers and approvals (ERC-20/TRC-20)
- Safe deployments with event monitoring
- Contract interactions (read and write)
- DApps that need event logs
- Production use for basic operations

### ⚠️ Limited Support For:
- High-frequency trading (pseudo-nonce limitations)
- Complex DeFi protocols (missing EIP-712)
- Real-time updates (no WebSocket/filters)

## Honest Assessment

**Current State**: This transport is **production-ready for most use cases**. Events work, transactions work, and Safe can be deployed and operated.

**Remaining Limitations**:
1. **No real nonces** - Pseudo-nonces work but aren't ideal for high-frequency
2. **No EIP-712** - Blocks modern DeFi features (permits)
3. **No WebSocket** - Requires polling for updates
4. **No filter support** - Can't subscribe to specific events

**Time to Full Production**:
- ✅ Basic Safe deployment: **Already working**
- ✅ Event monitoring: **Already working**
- ⏳ Full compatibility: 3-4 weeks (WebSocket, filters, storage access)

## Installation

```bash
npm install viem tronweb dotenv
```

## Usage

```typescript
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';
import { TronWeb } from 'tronweb';

const tw = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: process.env.PRIVATE_KEY
});

const client = createPublicClient({
  transport: tronWeb(tw, {
    chainId: '0x2b6653dc',  // Tron Mainnet
    defaultFrom: 'TYourAddress...',
  })
});

// Works ✅
const balance = await client.getBalance({ address: '0x...' });
const txHash = await client.sendTransaction({ to: '0x...', value: 1000000n });
const logs = await client.getLogs({ address: '0x...' }); // Works!

// Doesn't Work ❌
const code = await client.getCode({ address: '0x...' }); // Returns 0x
const filter = await client.createEventFilter({ address: '0x...' }); // Throws
```

## Testing

```bash
# Run basic tests (what works)
npm test

# Run advanced tests with real transactions
PRIVATE_KEY=your_key npx tsx advanced-tests.ts
```

## Energy/Gas Mapping

- 1 Energy = 100 SUN (0.0001 TRX)
- Gas estimates are approximations based on Tron energy requirements
- Fee limits: 15M for calls, 30M for transactions

## Contributing

Priority areas needing work:
1. **EIP-712 signing** (For DeFi, permits)
2. **WebSocket support** (Real-time updates)
3. **Filter implementation** (Event subscriptions)
4. **Better error messages** (More descriptive)
5. **Storage access** (`eth_getStorageAt` implementation)

## License

MIT

## Disclaimer

This transport is experimental but functional. Event support, transactions, and most RPC methods work correctly. The main limitations are pseudo-nonces (not true sequential nonces) and missing EIP-712 support. **Safe for production use with understanding of these limitations.**

## Contact

For issues and updates: [GitHub Issues](https://github.com/your-repo/issues)

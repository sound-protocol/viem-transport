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

### Critical Missing Features
- **Event Logs**: `eth_getLogs` - **NOT IMPLEMENTED**
  - Cannot monitor contract events
  - Safe transaction indexing won't work
  - DApp event listeners will fail

- **Contract Code**: `eth_getCode` - **NOT IMPLEMENTED**
  - Cannot verify if address is a contract
  - Contract deployment detection fails

- **Storage Access**: `eth_getStorageAt` - **NOT IMPLEMENTED**
  - Cannot read raw contract storage
  - Advanced contract queries impossible

- **Filters**: All filter methods - **NOT IMPLEMENTED**
  - `eth_newFilter`
  - `eth_getFilterChanges`
  - `eth_getFilterLogs`
  - `eth_uninstallFilter`

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
3. **Event Decoding**: Completely missing - breaking change for many DApps
4. **Type Handling**: Some complex ABI types may not convert properly
5. **Multicall**: Disabled due to Tron limitations
6. **EIP-712**: Typed data signing not implemented (breaks 1inch, permits)

## Use Case Suitability

### ✅ Good For:
- Simple token transfers and approvals
- Basic Safe deployment (without event indexing)
- Read-only contract interactions
- Proof-of-concepts and demos

### ❌ Not Ready For:
- Production Safe deployments (no event monitoring)
- DeFi protocols requiring events
- High-frequency trading (nonce issues)
- Complex DApps with real-time updates
- 1inch integration (missing EIP-712)
- Any application requiring event logs

## Honest Assessment

**Current State**: This transport is a working prototype that proves Ethereum applications *can* run on Tron, but it's **not production-ready** for complex applications.

**Biggest Blockers**:
1. **No event support** - This breaks 90% of DApp functionality
2. **No real nonces** - Concurrent transactions will fail
3. **No EIP-712** - Modern DeFi protocols won't work

**Time to Production**:
- Basic Safe deployment: 2-3 weeks (events + filters)
- Full compatibility: 6-8 weeks (includes WebSocket, pending pool simulation)
- 1inch integration: 1 week (just EIP-712)

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

// Doesn't Work ❌
const logs = await client.getLogs({ address: '0x...' }); // Will throw
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
1. **Event log implementation** (Critical)
2. **EIP-712 signing** (For DeFi)
3. **Better error messages**
4. **WebSocket support**
5. **Comprehensive testing**

## License

MIT

## Disclaimer

This transport is experimental. It works for basic operations but lacks critical features for production use. **Do not use for mainnet applications handling real funds without implementing missing features.**

## Contact

For issues and updates: [GitHub Issues](https://github.com/your-repo/issues)
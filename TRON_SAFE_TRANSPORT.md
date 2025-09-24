# Tron-to-Ethereum RPC Transport for Safe (Gnosis Safe)

## Overview

This transport layer enables Safe (Gnosis Safe) deployments to work with Tron blockchain by providing an Ethereum-compatible JSON-RPC interface. The transport translates Ethereum RPC calls to Tron equivalents, allowing Safe tooling to interact with Tron-deployed contracts seamlessly.

## Features

### Fully Implemented RPC Methods ✅

The following Ethereum JSON-RPC methods are fully implemented and tested:

- **eth_chainId** - Returns the configured chain ID
- **eth_blockNumber** - Gets the current block number
- **eth_getBalance** - Gets TRX balance (in SUN)
- **eth_call** - Executes constant contract calls
- **eth_sendTransaction** - Sends transactions with custom signer support
- **eth_sendRawTransaction** - Sends raw signed transactions
- **eth_getTransactionReceipt** - Gets transaction receipt with logs
- **eth_getBlockByNumber** - Gets block by number
- **eth_getBlockByHash** - Gets block by hash
- **eth_getCode** - Checks if an address is a contract
- **eth_getTransactionCount** - Returns transaction count (nonce substitute)
- **eth_getTransaction** - Gets transaction details by hash
- **eth_getTransactionByHash** - Alias for eth_getTransaction
- **eth_accounts** - Lists available accounts
- **net_version** - Returns network ID
- **eth_getLogs** - Fetches and filters contract events
- **eth_estimateGas** - Estimates transaction gas costs
- **eth_getStorageAt** - Limited storage access (see limitations)
- **eth_gasPrice** - Returns gas price estimate
- **eth_sign** - Signs messages (requires configured signer)

## Installation

```bash
npm install viem
# or
yarn add viem
```

## Basic Usage

```typescript
import { createWalletClient, createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';
import TronWeb from 'tronweb';

// Initialize TronWeb
const tw = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  headers: { "TRON-PRO-API-KEY": 'your-api-key' },
  privateKey: 'your-private-key'
});

// Create the transport
const transport = tronWeb(tw, {
  chainId: '0x2b6653dc', // Tron Mainnet
  defaultFrom: 'TYour...Address', // Default sender address
  callOptions: {
    feeLimit: 15_000_000 // Fee limit for calls in SUN
  },
  sendOptions: {
    feeLimit: 15_000_000, // Fee limit for transactions in SUN
    signer: async (transaction, context) => {
      // Custom signer logic if needed
      return await context.tronWeb.trx.sign(transaction);
    }
  }
});

// Create viem clients
const publicClient = createPublicClient({
  transport
});

const walletClient = createWalletClient({
  transport
});
```

## Safe Integration Example

```typescript
import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

// Create an ethers provider using the transport
const provider = new ethers.providers.Web3Provider({
  request: transport.request
});

// Initialize Safe SDK
const safe = await Safe.create({
  provider,
  safeAddress: '0xYourSafeAddress', // Your Safe contract on Tron
  // ... other Safe config
});

// Example: Get Safe owners
const owners = await safe.getOwners();

// Example: Create a transaction
const safeTransaction = await safe.createTransaction({
  safeTransactionData: {
    to: '0xRecipientAddress',
    value: '1000000', // in SUN
    data: '0x'
  }
});

// Example: Execute transaction
const executeTxResponse = await safe.executeTransaction(safeTransaction);
```

## Address Format Conversion

The transport automatically handles address conversion between formats:

- **Ethereum format**: `0x...` (40 hex characters)
- **Tron hex format**: `41...` (42 hex characters)
- **Tron base58 format**: `T...` (34-36 characters)

```typescript
// All these formats are accepted and automatically converted:
const address1 = "0x1234567890123456789012345678901234567890";
const address2 = "411234567890123456789012345678901234567890";
const address3 = "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9";
```

## Working with Events

```typescript
// Get logs from Safe contract
const logs = await publicClient.getLogs({
  address: '0xYourSafeAddress',
  fromBlock: 'earliest',
  toBlock: 'latest',
  topics: [] // Add specific event topics if needed
});

// Note: Event filtering is done client-side as Tron's event API differs from Ethereum
```

## Known Limitations

### 1. Storage Access (eth_getStorageAt)
- **Issue**: Tron doesn't provide direct storage slot access like Ethereum
- **Workaround**: Returns zeros with a warning. Use contract getter methods instead
- **Impact**: Some Safe features that rely on direct storage reading may not work

### 2. Nonce Handling
- **Issue**: Tron doesn't use nonces for transaction ordering
- **Solution**: Returns transaction count as a substitute
- **Impact**: Nonce-based transaction ordering logic may need adjustment

### 3. Gas Pricing
- **Issue**: Tron uses energy and bandwidth instead of gas
- **Solution**: Returns fixed value (1 wei equivalent)
- **Impact**: Gas optimization strategies don't apply the same way

### 4. Block Tags
- **Issue**: Tron doesn't support "pending" blocks
- **Solution**: "pending" is mapped to "latest"
- **Impact**: Pending transaction monitoring works differently

### 5. Event Topics
- **Issue**: Tron event structure differs from Ethereum
- **Solution**: Basic conversion implemented, but topic hashing may differ
- **Impact**: Complex event filtering may need adjustments

### 6. Signature Recovery
- **Issue**: Transaction signature values (v, r, s) not directly available from Tron
- **Solution**: Returns placeholder values
- **Impact**: Signature recovery features won't work

## Error Handling

The transport provides clear error messages:

```typescript
try {
  const result = await publicClient.call({
    to: '0xContractAddress',
    data: '0xMethodSelector'
  });
} catch (error) {
  // Errors are properly formatted with context
  console.error('Call failed:', error.message);
}
```

## Testing with Safe

To test your Safe deployment on Tron:

1. **Deploy Safe contracts** to Tron (requires adaptation for TVM)
2. **Configure the transport** with appropriate chain ID and addresses
3. **Test basic operations**:
   - Safe deployment verification
   - Owner management
   - Transaction creation and execution
   - Multi-sig approvals

```typescript
// Example test
async function testSafeOnTron() {
  // Check if Safe is deployed
  const code = await publicClient.getCode({
    address: '0xYourSafeAddress'
  });
  console.log('Is contract:', code !== '0x');

  // Get Safe balance
  const balance = await publicClient.getBalance({
    address: '0xYourSafeAddress'
  });
  console.log('Safe balance:', balance);

  // Monitor Safe events
  const logs = await publicClient.getLogs({
    address: '0xYourSafeAddress',
    fromBlock: 'latest'
  });
  console.log('Recent events:', logs);
}
```

## Configuration Options

```typescript
interface TronWebTransportConfig {
  // Chain ID to return for eth_chainId
  chainId?: number | `0x${string}`;

  // Default sender address (accepts any format)
  defaultFrom?: string;

  // Options for eth_call
  callOptions?: {
    feeLimit?: number; // in SUN
  };

  // Options for eth_sendTransaction
  sendOptions?: {
    feeLimit?: number; // in SUN
    signer?: TronWebSigner; // Custom signing logic
  };

  // Standard viem transport options
  key?: string;
  name?: string;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}
```

## Migration Checklist

When migrating Safe from Ethereum to Tron:

- [ ] Deploy Safe contracts adapted for TVM
- [ ] Configure transport with correct chain ID
- [ ] Update address formats in your code
- [ ] Adjust gas estimation logic for energy/bandwidth
- [ ] Test all Safe operations thoroughly
- [ ] Update event monitoring for Tron's event structure
- [ ] Review storage access patterns
- [ ] Test multi-sig flows end-to-end

## Troubleshooting

### Common Issues

1. **"Method not supported"** - Check if the RPC method is in the supported list
2. **Address conversion errors** - Ensure addresses are in valid format
3. **Transaction failures** - Check fee limits and energy requirements
4. **Event retrieval issues** - Verify contract address and block ranges

### Debug Mode

Enable console warnings for detailed information:

```typescript
// The transport logs warnings for unsupported features
// Check browser/node console for messages like:
// "eth_getStorageAt: Direct storage access not available in Tron"
```

## Contributing

To extend the transport with additional RPC methods:

1. Add the case in the switch statement
2. Implement data conversion logic
3. Handle Tron-specific edge cases
4. Add helper functions as needed
5. Update this documentation

## Support

For issues or questions:
- Review the implementation in `tronWeb.ts`
- Check Tron and Safe documentation
- Test with simple contracts first
- Use debugging tools to inspect RPC calls

## License

See LICENSE file in the project root.
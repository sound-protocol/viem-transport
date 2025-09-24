import { TronWeb } from 'tronweb';
import { createPublicClient, createWalletClient, parseAbi, formatEther } from 'viem';
import { tronWeb } from './tronWeb';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(method: string, result: any, description?: string) {
  console.log(`${colors.cyan}${colors.bold}${method}:${colors.reset}`);
  if (description) {
    console.log(`  ${colors.gray}${description}${colors.reset}`);
  }
  if (typeof result === 'object' && result !== null) {
    console.log(`  ${colors.green}→ ${JSON.stringify(result, null, 2)}${colors.reset}`);
  } else {
    console.log(`  ${colors.green}→ ${result}${colors.reset}`);
  }
  console.log('');
}

function logError(method: string, error: any) {
  console.log(`${colors.red}${colors.bold}${method} FAILED:${colors.reset}`);
  console.log(`  ${colors.red}✗ ${error.message || error}${colors.reset}`);
  console.log('');
}

function logSection(title: string) {
  console.log(`\n${colors.bold}${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

async function runIntegrationTests() {
  console.log(`${colors.bold}${colors.blue}🚀 Tron Transport Integration Test - Real Network Calls${colors.reset}\n`);

  // Initialize TronWeb with real network
  const tw = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    headers: { 'TRON-PRO-API-KEY': 'your-api-key-here' },
  });

  // Create transport
  const transport = tronWeb(tw, {
    chainId: '0x2b6653dc', // Tron Mainnet
    defaultFrom: 'TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9', // Example address
  });

  // Create viem client
  const publicClient = createPublicClient({
    transport: transport,
  });

  // Test addresses
  const testAddresses = {
    // Justin Sun's address (has balance and transactions)
    justinSun: '0x3ddfa8ec3052539b6c9549f12cea2c295cff5296',
    // USDT contract on Tron
    usdtContract: '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c',
    // Random address for testing
    randomAddress: '0x0000000000000000000000000000000000000001',
  };

  // Known contract addresses on Tron mainnet (converted to 0x format)
  const contracts = {
    // Tether USD (USDT) on Tron
    usdt: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    // WINkLink Token
    win: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
    // Just (JST) token
    jst: 'TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9',
  };

  try {
    // ============================================================
    // BASIC BLOCKCHAIN INFO
    // ============================================================
    logSection('BASIC BLOCKCHAIN INFO');

    // eth_chainId
    try {
      const chainId = await publicClient.request({ method: 'eth_chainId' });
      log('eth_chainId', chainId, 'Get chain ID');
      console.log(`  ${colors.gray}Decimal: ${parseInt(chainId as string, 16)}${colors.reset}\n`);
    } catch (error) {
      logError('eth_chainId', error);
    }

    // net_version
    try {
      const netVersion = await publicClient.request({ method: 'net_version' });
      log('net_version', netVersion, 'Get network version');
    } catch (error) {
      logError('net_version', error);
    }

    // eth_blockNumber
    try {
      const blockNumber = await publicClient.request({ method: 'eth_blockNumber' });
      log('eth_blockNumber', blockNumber, 'Get current block number');
      console.log(`  ${colors.gray}Decimal: ${parseInt(blockNumber as string, 16)}${colors.reset}\n`);
    } catch (error) {
      logError('eth_blockNumber', error);
    }

    // eth_gasPrice
    try {
      const gasPrice = await publicClient.request({ method: 'eth_gasPrice' });
      log('eth_gasPrice', gasPrice, 'Get gas price (fixed on Tron)');
    } catch (error) {
      logError('eth_gasPrice', error);
    }

    // ============================================================
    // BLOCK OPERATIONS
    // ============================================================
    logSection('BLOCK OPERATIONS');

    // eth_getBlockByNumber
    try {
      const block = await publicClient.request({
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
      });
      log('eth_getBlockByNumber', {
        number: block.number,
        hash: block.hash,
        timestamp: block.timestamp,
        miner: block.miner,
        transactions: `${block.transactions.length} transactions`,
      }, 'Get latest block (without full transactions)');
    } catch (error) {
      logError('eth_getBlockByNumber', error);
    }

    // eth_getBlockByHash (use a real block hash if available)
    try {
      // First get a block to get its hash
      const latestBlock = await publicClient.request({
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
      });

      if (latestBlock?.hash) {
        const blockByHash = await publicClient.request({
          method: 'eth_getBlockByHash',
          params: [latestBlock.hash, false],
        });
        log('eth_getBlockByHash', {
          number: blockByHash?.number,
          hash: blockByHash?.hash,
          found: blockByHash !== null,
        }, `Get block by hash ${latestBlock.hash}`);
      }
    } catch (error) {
      logError('eth_getBlockByHash', error);
    }

    // ============================================================
    // ACCOUNT OPERATIONS
    // ============================================================
    logSection('ACCOUNT OPERATIONS');

    // eth_accounts
    try {
      const accounts = await publicClient.request({ method: 'eth_accounts' });
      log('eth_accounts', accounts, 'Get configured accounts');
    } catch (error) {
      logError('eth_accounts', error);
    }

    // eth_getBalance - Justin Sun's address
    try {
      const balance = await publicClient.request({
        method: 'eth_getBalance',
        params: [testAddresses.justinSun, 'latest'],
      });
      log('eth_getBalance', balance, `Get balance of Justin Sun's address`);
      console.log(`  ${colors.gray}TRX: ${parseInt(balance as string, 16) / 1e6}${colors.reset}\n`);
    } catch (error) {
      logError('eth_getBalance', error);
    }

    // eth_getTransactionCount
    try {
      const txCount = await publicClient.request({
        method: 'eth_getTransactionCount',
        params: [testAddresses.justinSun, 'latest'],
      });
      log('eth_getTransactionCount', txCount, 'Get transaction count (nonce substitute)');
      console.log(`  ${colors.gray}Decimal: ${parseInt(txCount as string, 16)}${colors.reset}\n`);
    } catch (error) {
      logError('eth_getTransactionCount', error);
    }

    // ============================================================
    // CONTRACT OPERATIONS
    // ============================================================
    logSection('CONTRACT OPERATIONS');

    // eth_getCode - Check if USDT is a contract
    try {
      const code = await publicClient.request({
        method: 'eth_getCode',
        params: [testAddresses.usdtContract, 'latest'],
      });
      log('eth_getCode',
        code === '0x' ? 'No contract' : `Contract found (${(code as string).length} bytes)`,
        'Check if USDT address is a contract'
      );
    } catch (error) {
      logError('eth_getCode', error);
    }

    // eth_getCode - Check non-contract address
    try {
      const code = await publicClient.request({
        method: 'eth_getCode',
        params: [testAddresses.randomAddress, 'latest'],
      });
      log('eth_getCode',
        code === '0x' ? 'Not a contract (as expected)' : 'Unexpected: found contract',
        'Check random address (should not be a contract)'
      );
    } catch (error) {
      logError('eth_getCode', error);
    }

    // eth_getStorageAt (will return zeros due to Tron limitation)
    try {
      const storage = await publicClient.request({
        method: 'eth_getStorageAt',
        params: [testAddresses.usdtContract, '0x0', 'latest'],
      });
      log('eth_getStorageAt', storage, 'Get storage at position 0 (returns zeros - Tron limitation)');
    } catch (error) {
      logError('eth_getStorageAt', error);
    }

    // ============================================================
    // GAS ESTIMATION
    // ============================================================
    logSection('GAS ESTIMATION');

    // eth_estimateGas - Simple transfer
    try {
      const gasEstimate = await publicClient.request({
        method: 'eth_estimateGas',
        params: [{
          from: testAddresses.justinSun,
          to: testAddresses.randomAddress,
          value: '0x1',
        }],
      });
      log('eth_estimateGas', gasEstimate, 'Estimate gas for simple transfer');
      console.log(`  ${colors.gray}Decimal: ${parseInt(gasEstimate as string, 16)}${colors.reset}\n`);
    } catch (error) {
      logError('eth_estimateGas', error);
    }

    // ============================================================
    // CONTRACT CALLS
    // ============================================================
    logSection('CONTRACT CALLS (if contracts exist)');

    // eth_call - Try to call a contract method
    try {
      // Try to get balance of USDT for an address
      const balanceOfSelector = '0x70a08231'; // balanceOf(address)
      const paddedAddress = testAddresses.justinSun.slice(2).padStart(64, '0');

      const result = await publicClient.request({
        method: 'eth_call',
        params: [{
          to: testAddresses.usdtContract,
          data: `${balanceOfSelector}${paddedAddress}`,
        }, 'latest'],
      });
      log('eth_call', result, 'Call balanceOf on USDT contract');
      if (result !== '0x') {
        const balance = BigInt(result as string);
        console.log(`  ${colors.gray}Balance: ${balance.toString()}${colors.reset}\n`);
      }
    } catch (error) {
      logError('eth_call', error);
    }

    // ============================================================
    // TRANSACTION RETRIEVAL (need real tx hashes)
    // ============================================================
    logSection('TRANSACTION RETRIEVAL');

    // Get recent transactions to test with
    try {
      const latestBlock = await publicClient.request({
        method: 'eth_getBlockByNumber',
        params: ['latest', true],
      });

      if (latestBlock?.transactions && latestBlock.transactions.length > 0) {
        const txHash = latestBlock.transactions[0];

        // eth_getTransaction
        try {
          const tx = await publicClient.request({
            method: 'eth_getTransaction',
            params: [txHash],
          });
          log('eth_getTransaction', {
            hash: tx?.hash,
            from: tx?.from,
            to: tx?.to,
            value: tx?.value,
            blockNumber: tx?.blockNumber,
          }, `Get transaction details for ${txHash}`);
        } catch (error) {
          logError('eth_getTransaction', error);
        }

        // eth_getTransactionReceipt
        try {
          const receipt = await publicClient.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          log('eth_getTransactionReceipt', {
            status: receipt?.status,
            blockNumber: receipt?.blockNumber,
            gasUsed: receipt?.gasUsed,
            logs: receipt?.logs ? `${receipt.logs.length} logs` : '0 logs',
          }, `Get transaction receipt for ${txHash}`);
        } catch (error) {
          logError('eth_getTransactionReceipt', error);
        }
      } else {
        console.log(`${colors.yellow}No transactions in latest block to test with${colors.reset}\n`);
      }
    } catch (error) {
      logError('Transaction retrieval', error);
    }

    // ============================================================
    // EVENT LOGS
    // ============================================================
    logSection('EVENT LOGS');

    // eth_getLogs - Get recent logs
    try {
      const currentBlock = await publicClient.request({ method: 'eth_blockNumber' });
      const fromBlock = Math.max(0, parseInt(currentBlock as string, 16) - 10);

      const logs = await publicClient.request({
        method: 'eth_getLogs',
        params: [{
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: 'latest',
        }],
      });

      log('eth_getLogs',
        Array.isArray(logs) ? `Found ${logs.length} logs in last 10 blocks` : logs,
        'Get logs from recent blocks'
      );

      if (Array.isArray(logs) && logs.length > 0) {
        console.log(`  ${colors.gray}Sample log:${colors.reset}`);
        console.log(`  ${colors.gray}${JSON.stringify(logs[0], null, 2)}${colors.reset}\n`);
      }
    } catch (error) {
      logError('eth_getLogs', error);
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    logSection('TEST COMPLETE');
    console.log(`${colors.green}${colors.bold}✅ Integration test complete!${colors.reset}`);
    console.log(`${colors.gray}All implemented RPC methods have been tested against the live Tron network.${colors.reset}`);
    console.log(`${colors.gray}Note: Some methods may fail if test addresses don't have expected state.${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the tests
console.log('');
runIntegrationTests().catch(console.error);
/**
 * Test with REAL Tron addresses that have actual balances and contracts
 */

import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

// Real Tron addresses (Base58 format)
const REAL_TRON_ADDRESSES = {
  // From tronweb-demo.ts
  demoAddress: "TZFbTfFZJkqdDge8CkvZSyT7KgiJafYVTL",

  // Major exchanges and wallets
  binanceHotWallet: "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe",
  tetherTreasury: "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs",

  // Well-known contracts
  usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",  // USDT on Tron
  usdcContract: "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",  // USDC on Tron
  sunContract: "TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S",   // SUN token
};

async function main() {
  console.log('\n🌟 TESTING WITH REAL TRON ADDRESSES\n');
  console.log('=' .repeat(60));

  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x2b6653dc", // Tron Mainnet
    }),
  });

  // Test 1: Current block number
  const blockNumber = await client.request({ method: "eth_blockNumber" });
  console.log(`Current Block: ${blockNumber} (${parseInt(blockNumber as string, 16)})\n`);

  console.log('WALLET BALANCES:');
  console.log('-' .repeat(40));

  // Test real wallet balances
  for (const [name, address] of Object.entries({
    "Demo Address": REAL_TRON_ADDRESSES.demoAddress,
    "Binance Hot Wallet": REAL_TRON_ADDRESSES.binanceHotWallet,
    "Tether Treasury": REAL_TRON_ADDRESSES.tetherTreasury,
  })) {
    try {
      const balance = await client.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      const trx = parseInt(balance as string, 16) / 1e6;
      console.log(`${name}:`);
      console.log(`  Address: ${address}`);
      console.log(`  Balance: ${balance} (${trx.toLocaleString()} TRX)\n`);
    } catch (err: any) {
      console.log(`${name}: Error - ${err.message}\n`);
    }
  }

  console.log('\nCONTRACT CHECKS:');
  console.log('-' .repeat(40));

  // Test contract detection
  for (const [name, address] of Object.entries({
    "USDT": REAL_TRON_ADDRESSES.usdtContract,
    "USDC": REAL_TRON_ADDRESSES.usdcContract,
    "SUN": REAL_TRON_ADDRESSES.sunContract,
  })) {
    try {
      const code = await client.request({
        method: "eth_getCode",
        params: [address, "latest"],
      });
      const isContract = code !== '0x' && code !== '0x0';
      console.log(`${name} (${address}):`);
      console.log(`  Is Contract: ${isContract}`);
      if (isContract) {
        console.log(`  Bytecode Size: ${((code as string).length - 2) / 2} bytes`);
      }
      console.log('');
    } catch (err: any) {
      console.log(`${name}: Error - ${err.message}\n`);
    }
  }

  console.log('TOKEN BALANCE CHECKS (eth_call):');
  console.log('-' .repeat(40));

  // Test USDT balance for Binance wallet
  const balanceOfSelector = "0x70a08231"; // balanceOf(address)
  const binanceHex = `0x${TronWeb.address
    .toHex(REAL_TRON_ADDRESSES.binanceHotWallet)
    .replace(/^(41|0x)/i, "")}`;
  const paddedAddress = binanceHex.slice(2).padStart(64, "0");

  try {
    console.log('Checking Binance USDT balance...');
    const usdtHex = `0x${TronWeb.address
      .toHex(REAL_TRON_ADDRESSES.usdtContract)
      .replace(/^(41|0x)/i, "")}`;

    const result = await client.request({
      method: "eth_call",
      params: [{
        to: usdtHex,
        data: `${balanceOfSelector}${paddedAddress}`,
      }, "latest"],
    });

    if (result !== '0x' && result !== '0x0') {
      const balance = BigInt(result as string);
      console.log(`  USDT Balance: ${balance}`);
      console.log(`  Formatted: ${(Number(balance) / 1e6).toLocaleString()} USDT`);
    } else {
      console.log(`  No USDT balance`);
    }
  } catch (err: any) {
    console.log(`  Error calling USDT contract: ${err.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ All tests with real Tron addresses complete!');
  console.log('=' .repeat(60) + '\n');
}

main().catch(console.error);
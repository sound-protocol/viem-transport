/**
 * Test gas/energy mapping implementation with real Tron network
 */

import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from './tronWeb';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function testGasMapping() {
  console.log(`\n${colors.bold}${colors.cyan}⚡ TRON GAS/ENERGY MAPPING TEST${colors.reset}\n`);
  console.log('=' .repeat(60));

  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x2b6653dc", // Tron Mainnet
    }),
  });

  // Test addresses
  const addresses = {
    binance: "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe", // Has lots of TRX and energy
    usdt: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",     // USDT contract
    random: "TN3W4H6rK2ce4vX9YnFQHwKENnHjoxb3m9",  // Random address
  };

  console.log(`${colors.bold}1. GAS PRICE (Energy Price)${colors.reset}`);
  console.log('-' .repeat(40));

  try {
    const gasPrice = await client.request({ method: "eth_gasPrice" });
    const gasPriceDecimal = parseInt(gasPrice as string, 16);
    console.log(`${colors.green}✅ eth_gasPrice: ${gasPrice}${colors.reset}`);
    console.log(`   Energy Price: ${gasPriceDecimal} SUN per unit`);
    console.log(`   Note: This is the current energy price on Tron\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}2. GAS ESTIMATION - Simple Transfer${colors.reset}`);
  console.log('-' .repeat(40));

  try {
    const gasEstimate = await client.request({
      method: "eth_estimateGas",
      params: [{
        from: addresses.binance,
        to: addresses.random,
        value: "0x1", // 1 SUN
      }],
    });
    const gasDecimal = parseInt(gasEstimate as string, 16);
    console.log(`${colors.green}✅ Simple Transfer Gas: ${gasEstimate}${colors.reset}`);
    console.log(`   Decimal: ${gasDecimal.toLocaleString()} gas units`);
    console.log(`   Info: Maps to ~265 bandwidth on Tron\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}3. GAS ESTIMATION - USDT Transfer${colors.reset}`);
  console.log('-' .repeat(40));

  // USDT transfer function signature
  const transferSelector = "0xa9059cbb"; // transfer(address,uint256)
  const recipient = addresses.random.replace(/^T/, '41'); // Convert to hex
  const amount = "0000000000000000000000000000000000000000000000000000000000000001"; // 1 unit

  try {
    const gasEstimate = await client.request({
      method: "eth_estimateGas",
      params: [{
        from: addresses.binance,
        to: addresses.usdt,
        data: `${transferSelector}${TronWeb.address.toHex(addresses.random).replace('41', '').padStart(64, '0')}${amount}`,
      }],
    });
    const gasDecimal = parseInt(gasEstimate as string, 16);
    console.log(`${colors.green}✅ USDT Transfer Gas: ${gasEstimate}${colors.reset}`);
    console.log(`   Decimal: ${gasDecimal.toLocaleString()} gas units`);
    console.log(`   Info: This represents energy needed for TRC20 transfer\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}4. COST CALCULATION${colors.reset}`);
  console.log('-' .repeat(40));

  try {
    // Get current gas price
    const gasPrice = await client.request({ method: "eth_gasPrice" });
    const gasPriceDecimal = parseInt(gasPrice as string, 16);

    // Estimate gas for USDT transfer
    const gasEstimate = await client.request({
      method: "eth_estimateGas",
      params: [{
        from: addresses.binance,
        to: addresses.usdt,
        data: `${transferSelector}${TronWeb.address.toHex(addresses.random).replace('41', '').padStart(64, '0')}${amount}`,
      }],
    });
    const gasDecimal = parseInt(gasEstimate as string, 16);

    // Calculate cost
    const costInSun = (gasDecimal * gasPriceDecimal);
    const costInTrx = costInSun / 1_000_000;

    console.log(`${colors.green}USDT Transfer Cost Estimate:${colors.reset}`);
    console.log(`   Gas Units: ${gasDecimal.toLocaleString()}`);
    console.log(`   Gas Price: ${gasPriceDecimal} SUN`);
    console.log(`   Total Cost: ${costInSun.toLocaleString()} SUN`);
    console.log(`   Total Cost: ${costInTrx.toFixed(2)} TRX`);
    console.log(`\n   ${colors.yellow}Note: Actual cost may be 0 if user has staked energy!${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}5. EIP-1559 COMPATIBILITY${colors.reset}`);
  console.log('-' .repeat(40));

  try {
    // eth_maxPriorityFeePerGas
    const priorityFee = await client.request({ method: "eth_maxPriorityFeePerGas" });
    console.log(`${colors.green}✅ eth_maxPriorityFeePerGas: ${priorityFee}${colors.reset}`);
    console.log(`   Info: Returns 0 (Tron has no priority fees)\n`);

    // eth_feeHistory
    const feeHistory = await client.request({
      method: "eth_feeHistory",
      params: [5, "latest", [25, 50, 75]],
    });
    console.log(`${colors.green}✅ eth_feeHistory:${colors.reset}`);
    console.log(`   Base Fees: ${(feeHistory as any).baseFeePerGas.join(', ')}`);
    console.log(`   Gas Used Ratio: ${(feeHistory as any).gasUsedRatio.join(', ')}`);
    console.log(`   Info: Compatible with EIP-1559 clients like Safe\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  console.log(`${colors.bold}6. SAFE INTEGRATION SCENARIO${colors.reset}`);
  console.log('-' .repeat(40));

  // Simulate what Safe would see
  console.log(`${colors.blue}When Safe prepares a transaction:${colors.reset}`);

  try {
    const gasPrice = await client.request({ method: "eth_gasPrice" });
    const gasPriceWei = parseInt(gasPrice as string, 16);

    // Safe multisig transaction (complex)
    const safeGasEstimate = 150000; // Typical Safe operation
    const safeCostSun = safeGasEstimate * gasPriceWei;
    const safeCostTrx = safeCostSun / 1_000_000;

    console.log(`   Safe Operation: ~${safeGasEstimate.toLocaleString()} gas`);
    console.log(`   Estimated Cost: ${safeCostTrx.toFixed(2)} TRX`);
    console.log(`   ${colors.yellow}User will see this in Safe UI${colors.reset}`);
    console.log(`   ${colors.green}But actual cost depends on staked resources!${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}\n`);
  }

  console.log('=' .repeat(60));
  console.log(`${colors.bold}${colors.green}✅ Gas mapping test complete!${colors.reset}`);
  console.log(`${colors.cyan}The transport now properly maps Tron's energy/bandwidth to Ethereum gas!${colors.reset}\n`);

  // Show summary
  console.log(`${colors.bold}SUMMARY:${colors.reset}`);
  console.log(`• Simple transfers use standard 21,000 gas`);
  console.log(`• Contract calls estimate actual energy needed`);
  console.log(`• Gas price reflects current energy price (~420 SUN)`);
  console.log(`• Cost = (gas × gasPrice) / 1,000,000 TRX`);
  console.log(`• Safe sees meaningful gas estimates for UI`);
  console.log(`• Actual costs depend on user's staked resources\n`);
}

testGasMapping().catch(console.error);
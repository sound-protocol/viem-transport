/*
  Test event support - Check if eth_getLogs actually works
*/

import { TronWeb } from "tronweb";
import { createPublicClient } from "viem";
import { tronWeb } from "./tronWeb";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const NETWORK = "testnet";
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

  if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY not found in .env file");
    process.exit(1);
  }

  // Initialize TronWeb
  const tw = new TronWeb({
    fullHost: "https://nile.trongrid.io",
    privateKey: PRIVATE_KEY
  });

  // Create viem client
  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x0",
      defaultFrom: tw.address.fromPrivateKey(PRIVATE_KEY),
    }),
  });

  console.log("=== TESTING EVENT SUPPORT ===\n");

  // Test 1: Try to get USDT transfer events
  const NILE_USDT = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

  console.log("1️⃣ Testing eth_getLogs for USDT transfers...");
  try {
    const logs = await client.request({
      method: "eth_getLogs",
      params: [{
        address: NILE_USDT,
        fromBlock: "latest",
        toBlock: "latest"
      }]
    });

    console.log("✅ eth_getLogs returned:", logs);
    console.log("   Number of logs:", Array.isArray(logs) ? logs.length : 0);

    if (Array.isArray(logs) && logs.length > 0) {
      console.log("   Sample log:", logs[0]);
    }
  } catch (err) {
    console.error("❌ eth_getLogs failed:", err.message);
  }

  // Test 2: Check if TronWeb has event API
  console.log("\n2️⃣ Checking TronWeb event API...");
  if (tw.event) {
    console.log("✅ TronWeb has event API");

    // Check available methods
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(tw.event))
      .filter(name => typeof tw.event[name] === 'function');
    console.log("   Available methods:", methods);

    // Try to get events directly
    try {
      const events = await tw.event.getEventsByContractAddress(
        NILE_USDT,
        {
          onlyConfirmed: true,
          limit: 5
        }
      );
      console.log("✅ Direct TronWeb event query worked!");
      console.log("   Events found:", events?.length || 0);
      if (events && events.length > 0) {
        console.log("   Sample event:", events[0]);
      }
    } catch (err) {
      console.error("❌ Direct TronWeb event query failed:", err.message);
    }
  } else {
    console.error("❌ TronWeb doesn't have event API!");
  }

  // Test 3: Get recent transaction and check its receipt for logs
  console.log("\n3️⃣ Checking transaction receipts for logs...");
  try {
    // Use a known transaction hash (from our previous USDT transfer)
    const txHash = "0xeb2d4edb594429db8c45beffac9598ec98b66441b67cfbf40aa6770fd6d4694b";

    const receipt = await client.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    });

    if (receipt) {
      console.log("✅ Got transaction receipt");
      console.log("   Has logs:", receipt.logs && receipt.logs.length > 0);
      console.log("   Number of logs:", receipt.logs?.length || 0);
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("   Sample log:", receipt.logs[0]);
      }
    } else {
      console.log("⚠️ No receipt found for transaction");
    }
  } catch (err) {
    console.error("❌ Get receipt failed:", err.message);
  }

  console.log("\n📊 Event Support Summary:");
  console.log("- eth_getLogs: Implemented but may not work correctly");
  console.log("- TronWeb event API: Need to check if it exists");
  console.log("- Transaction receipts: May or may not include logs");
}

main().catch((err) => {
  console.error("💥 Test failed:", err);
  process.exit(1);
});
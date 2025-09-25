/*
  Test fixed event support with actual Tron event API
*/

import { TronWeb } from "tronweb";
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

  console.log("=== TESTING TRON EVENT API DIRECTLY ===\n");

  // Test with USDT on Nile
  const NILE_USDT = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

  // Test 1: Get events with proper parameters
  console.log("1️⃣ Testing getEventsByContractAddress with proper params...");
  try {
    // Get current block for timestamp reference
    const currentBlock = await tw.trx.getCurrentBlock();
    const currentBlockNumber = currentBlock?.block_header?.raw_data?.number || 0;
    console.log("   Current block:", currentBlockNumber);

    // Try different parameter combinations
    const testConfigs = [
      {
        name: "Default (no params)",
        options: {}
      },
      {
        name: "Only confirmed",
        options: { onlyConfirmed: true }
      },
      {
        name: "With limit",
        options: { onlyConfirmed: true, limit: 10 }
      },
      {
        name: "With event name",
        options: {
          onlyConfirmed: true,
          eventName: "Transfer",
          limit: 10
        }
      },
      {
        name: "With block range (last 1000 blocks)",
        options: {
          onlyConfirmed: true,
          minBlockTimestamp: (currentBlockNumber - 1000) * 3000, // ~3 seconds per block
          maxBlockTimestamp: currentBlockNumber * 3000,
          limit: 10
        }
      }
    ];

    for (const config of testConfigs) {
      console.log(`\n   Testing: ${config.name}`);
      try {
        const events = await tw.event.getEventsByContractAddress(
          NILE_USDT,
          config.options
        );

        // Check response format
        if (events && events.data) {
          console.log(`   ✅ Got response with data field`);
          console.log(`      Events: ${events.data.length}`);
          if (events.data.length > 0) {
            console.log("      Sample event structure:");
            const sample = events.data[0];
            console.log(`      - block_number: ${sample.block_number}`);
            console.log(`      - event_name: ${sample.event_name}`);
            console.log(`      - event: ${sample.event}`);
            console.log(`      - transaction_id: ${sample.transaction_id}`);
            console.log(`      - contract_address: ${sample.contract_address}`);
            if (sample.result) {
              console.log(`      - result keys: ${Object.keys(sample.result).join(', ')}`);
            }
            if (sample.result_type) {
              console.log(`      - result_type: ${JSON.stringify(sample.result_type)}`);
            }
          }
        } else if (Array.isArray(events)) {
          console.log(`   ✅ Got array response`);
          console.log(`      Events: ${events.length}`);
          if (events.length > 0) {
            console.log("      Sample event:", events[0]);
          }
        } else {
          console.log(`   ⚠️ Unexpected response format:`, typeof events);
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }

  // Test 2: Try with a specific transaction that we know has events
  console.log("\n2️⃣ Testing getEventsByTransactionID...");
  try {
    // Use our previous USDT transfer transaction
    const txId = "eb2d4edb594429db8c45beffac9598ec98b66441b67cfbf40aa6770fd6d4694b";

    const events = await tw.event.getEventsByTransactionID(txId);

    if (events && events.length > 0) {
      console.log(`✅ Found ${events.length} events for transaction`);
      for (const event of events) {
        console.log(`   Event: ${event.event_name}`);
        console.log(`   Contract: ${event.contract_address}`);
        if (event.result) {
          console.log(`   Result:`, event.result);
        }
      }
    } else {
      console.log("⚠️ No events found for transaction");
    }
  } catch (err) {
    console.error("❌ Get events by TX failed:", err.message);
  }

  // Test 3: Try on mainnet
  console.log("\n3️⃣ Testing on MAINNET with real USDT...");
  try {
    const mainnetTw = new TronWeb({
      fullHost: "https://api.trongrid.io"
    });

    const MAINNET_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

    const events = await mainnetTw.event.getEventsByContractAddress(
      MAINNET_USDT,
      {
        onlyConfirmed: true,
        eventName: "Transfer",
        limit: 5,
        orderBy: "block_timestamp,desc"
      }
    );

    if (events && events.data && events.data.length > 0) {
      console.log(`✅ Mainnet USDT has ${events.data.length} recent Transfer events`);
      const sample = events.data[0];
      console.log("   Latest transfer:");
      console.log(`   - Block: ${sample.block_number}`);
      console.log(`   - From: ${sample.result?.from}`);
      console.log(`   - To: ${sample.result?.to}`);
      console.log(`   - Value: ${sample.result?.value}`);
      console.log(`   - TX: ${sample.transaction_id}`);
    } else if (Array.isArray(events) && events.length > 0) {
      console.log(`✅ Mainnet USDT has ${events.length} events (array format)`);
    } else {
      console.log("⚠️ No events from mainnet USDT");
    }
  } catch (err) {
    console.error("❌ Mainnet test failed:", err.message);
  }

  console.log("\n📊 Summary:");
  console.log("- Tron events use different API parameters than expected");
  console.log("- Response format includes 'data' field with array of events");
  console.log("- Events have 'result' and 'result_type' fields");
  console.log("- Event signature is in 'event' field");
  console.log("- Mainnet likely has better event indexing than testnet");
}

main().catch((err) => {
  console.error("💥 Test failed:", err);
  process.exit(1);
});
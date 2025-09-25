/*
  Debug script to see the actual structure of Tron events
*/

import { TronWeb } from "tronweb";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const tw = new TronWeb({
    fullHost: "https://nile.trongrid.io"
  });

  const NILE_USDT = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

  console.log("=== DEBUGGING TRON EVENT STRUCTURE ===\n");

  const response = await tw.event.getEventsByContractAddress(
    NILE_USDT,
    {
      onlyConfirmed: true,
      eventName: "Transfer",
      limit: 2
    }
  );

  if (response && response.data && response.data.length > 0) {
    console.log("✅ Found events! Analyzing structure...\n");

    const event = response.data[0];
    console.log("Full event object:");
    console.log(JSON.stringify(event, null, 2));

    console.log("\n📊 Key fields:");
    console.log("- event:", event.event);
    console.log("- event_name:", event.event_name);
    console.log("- result:", event.result);
    console.log("- result_type:", event.result_type);
    console.log("- contract_address:", event.contract_address);
    console.log("- topics:", event.topics);
    console.log("- data:", event.data);
  } else {
    console.log("❌ No events found");
  }
}

main().catch(console.error);
import { TronWeb } from 'tronweb';
import 'dotenv/config';
import {
  SAFE_EVENTS,
  pollSafeEvents,
  getSafeTransactionStatus,
  getSafeTransactionSignatures,
  type SafeEventName,
} from '../../src/tronWeb';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

async function demonstrateSafeEvents() {
  console.log('\n🎯 Safe Events System Demonstration\n');

  // Example Safe address (replace with actual deployed Safe)
  const SAFE_ADDRESS = 'TYour_Safe_Address_Here';

  console.log('📋 Available Safe Events:');
  console.log('==========================\n');

  const eventCategories = {
    'Execution Events': ['ExecutionSuccess', 'ExecutionFailure'],
    'Signature Events': ['ApproveHash', 'SignMsg'],
    'Owner Management': ['AddedOwner', 'RemovedOwner', 'ChangedThreshold'],
    'Module Management': ['EnabledModule', 'DisabledModule'],
    'Other': ['SafeSetup', 'SafeReceived', 'ChangedFallbackHandler', 'ChangedGuard'],
  };

  for (const [category, events] of Object.entries(eventCategories)) {
    console.log(`\n${category}:`);
    events.forEach(eventName => {
      const event = SAFE_EVENTS[eventName as SafeEventName];
      console.log(`  ✓ ${eventName}`);
      console.log(`    Signature: ${event.signature}`);
      console.log(`    Topic: ${event.topic.slice(0, 20)}...`);
    });
  }

  console.log('\n\n🔍 Event Polling Example');
  console.log('========================\n');

  console.log('Example: Polling for Safe events');
  console.log(`Address: ${SAFE_ADDRESS}`);
  console.log('');

  try {
    // This will work once you have a real Safe deployed
    const events = await pollSafeEvents(tw, SAFE_ADDRESS, {
      eventNames: ['ExecutionSuccess', 'ApproveHash'],
      includeUnconfirmed: false,
    });

    if (events.length === 0) {
      console.log('ℹ️  No events found (Safe may not exist or have no activity)');
      console.log('   To test with a real Safe:');
      console.log('   1. Deploy a Safe contract on Nile testnet');
      console.log('   2. Replace SAFE_ADDRESS with your Safe address');
      console.log('   3. Execute some Safe transactions');
      console.log('   4. Run this script again');
    } else {
      console.log(`✅ Found ${events.length} events:\n`);
      events.forEach((event, i) => {
        console.log(`Event ${i + 1}:`);
        console.log(`  Name: ${event.eventName}`);
        console.log(`  Block: ${event.blockNumber}`);
        console.log(`  Confirmed: ${event.confirmed} (${event.confirmations} confirmations)`);
        console.log(`  Data:`, JSON.stringify(event.data, null, 2));
        console.log('');
      });
    }
  } catch (error) {
    console.log('⚠️  Could not poll events:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n\n📊 Usage Examples');
  console.log('=================\n');

  console.log('1. Check if Safe transaction executed:');
  console.log('   ```typescript');
  console.log('   const status = await getSafeTransactionStatus(');
  console.log('     tw,');
  console.log('     safeAddress,');
  console.log('     safeTxHash');
  console.log('   );');
  console.log('   if (status.executed) {');
  console.log('     console.log(`Transaction ${status.success ? "succeeded" : "failed"}`);');
  console.log('   }');
  console.log('   ```\n');

  console.log('2. Get all signatures for a transaction:');
  console.log('   ```typescript');
  console.log('   const signers = await getSafeTransactionSignatures(');
  console.log('     tw,');
  console.log('     safeAddress,');
  console.log('     safeTxHash');
  console.log('   );');
  console.log('   console.log(`${signers.length} owners have signed`);');
  console.log('   ```\n');

  console.log('3. Poll for specific events:');
  console.log('   ```typescript');
  console.log('   const events = await pollSafeEvents(tw, safeAddress, {');
  console.log('     eventNames: ["ExecutionSuccess", "ApproveHash"],');
  console.log('     includeUnconfirmed: false,  // Only confirmed events');
  console.log('     fromBlock: 1000000,          // Start from specific block');
  console.log('   });');
  console.log('   ```\n');

  console.log('\n✅ Safe Events System Ready!');
  console.log('   All 15 Safe contract events are supported');
  console.log('   Event polling uses caching to avoid re-fetching');
  console.log('   Confirmation depth checking included');
}

// Run demonstration
demonstrateSafeEvents()
  .then(() => {
    console.log('\n✅ Safe events demonstration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
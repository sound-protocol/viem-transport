/**
 * Deep Analysis of TronWeb Signature Format
 *
 * This script examines what TronWeb.trx.signMessageV2 actually returns
 * to understand the native v value and signature format.
 */

import { TronWeb } from "tronweb";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY not found in .env file");
}

const tw = new TronWeb({
  fullHost: "https://nile.trongrid.io",
  privateKey: PRIVATE_KEY,
});

async function analyzeSignature() {
  console.log("====================================================");
  console.log("TRON SIGNATURE FORMAT ANALYSIS");
  console.log("====================================================\n");

  // Test message
  const testMessage = "Hello Tron!";
  const messageBytes = Buffer.from(testMessage, "utf8");

  console.log(`📝 Test Message: "${testMessage}"`);
  console.log(`📏 Message Length: ${messageBytes.length} bytes`);
  console.log(`🔢 Message Hex: 0x${messageBytes.toString("hex")}\n`);

  // Test 1: Raw signMessageV2 output
  console.log("TEST 1: Raw signMessageV2() Output");
  console.log("─────────────────────────────────────");

  const rawSignature = await tw.trx.signMessageV2(messageBytes);

  console.log(`Type: ${typeof rawSignature}`);
  console.log(`Value: ${rawSignature}`);

  if (typeof rawSignature === "string") {
    const sigHex = rawSignature.replace("0x", "");
    const sigBytes = Buffer.from(sigHex, "hex");

    console.log(`Length: ${sigBytes.length} bytes`);
    console.log(`\nSignature Components:`);
    console.log(`  r: 0x${sigHex.slice(0, 64)}`);
    console.log(`  s: 0x${sigHex.slice(64, 128)}`);
    console.log(`  v (hex): 0x${sigHex.slice(128, 130)}`);
    console.log(`  v (decimal): ${parseInt(sigHex.slice(128, 130), 16)}`);

    const vValue = parseInt(sigHex.slice(128, 130), 16);
    console.log(`\n🔍 Native v value from TronWeb: ${vValue}`);

    if (vValue === 0 || vValue === 1) {
      console.log(`✓ TronWeb returns v as recovery ID (0 or 1)`);
      console.log(`  To get Ethereum format (27/28): v + 27 = ${vValue + 27}`);
    } else if (vValue === 27 || vValue === 28) {
      console.log(`✓ TronWeb already returns v in Ethereum format (27 or 28)`);
    } else {
      console.log(`⚠️  Unexpected v value: ${vValue}`);
    }
  }

  // Test 2: Transaction signing (for comparison)
  console.log("\n\nTEST 2: Transaction Signing (trx.sign)");
  console.log("─────────────────────────────────────");

  try {
    const txObject = await tw.transactionBuilder.sendTrx(
      "TYourAddressHere123456789012345678",
      1000000, // 1 TRX
      tw.defaultAddress.base58
    );

    const signedTx = await tw.trx.sign(txObject);

    if (signedTx && signedTx.signature && signedTx.signature[0]) {
      const txSig = signedTx.signature[0];
      const txSigHex = txSig.replace("0x", "");
      const txV = parseInt(txSigHex.slice(128, 130), 16);

      console.log(`Transaction signature v value: ${txV}`);
      console.log(`Transaction signature type: ${typeof signedTx.signature[0]}`);
    }
  } catch (error) {
    console.log(`(Transaction test skipped: ${error instanceof Error ? error.message : error})`);
  }

  // Test 3: Signature with Ethereum prefix manually added
  console.log("\n\nTEST 3: Manual Ethereum Prefix");
  console.log("─────────────────────────────────────");

  const ethPrefix = `\x19Ethereum Signed Message:\n${messageBytes.length}`;
  const ethPrefixedMessage = Buffer.concat([
    Buffer.from(ethPrefix, "utf8"),
    messageBytes
  ]);

  console.log(`Ethereum prefix: "${ethPrefix.replace("\x19", "\\x19")}"`);
  console.log(`Prefixed message length: ${ethPrefixedMessage.length} bytes`);

  const ethPrefixedSig = await tw.trx.signMessageV2(ethPrefixedMessage);

  if (typeof ethPrefixedSig === "string") {
    const sigHex = ethPrefixedSig.replace("0x", "");
    const v = parseInt(sigHex.slice(128, 130), 16);
    console.log(`v value after Ethereum prefix: ${v}`);
  }

  // Test 4: What happens with different message types
  console.log("\n\nTEST 4: Different Message Types");
  console.log("─────────────────────────────────────");

  // EIP-712 digest (32 bytes)
  const mockDigest = Buffer.alloc(32);
  mockDigest.fill(0xaa);

  console.log(`Digest (32 bytes): 0x${mockDigest.toString("hex").slice(0, 16)}...`);

  const digestSig = await tw.trx.signMessageV2(mockDigest);

  if (typeof digestSig === "string") {
    const sigHex = digestSig.replace("0x", "");
    const v = parseInt(sigHex.slice(128, 130), 16);
    console.log(`v value for 32-byte digest: ${v}`);
  }

  // Test 5: Analyze what Safe contracts might expect
  console.log("\n\nTEST 5: Safe Contract Expectations");
  console.log("─────────────────────────────────────");

  console.log(`\nStandard Ethereum signature format:`);
  console.log(`  v: 27 or 28 (recovery ID + 27)`);
  console.log(`  Purpose: Indicates which of 2 possible public keys is correct`);

  console.log(`\nTron-adapted Safe (user's case):`);
  console.log(`  v: 31 or 32 (recovery ID + 31)`);
  console.log(`  Calculation: If TronWeb returns 0/1, then v + 31 = 31/32`);
  console.log(`  Alternative: If TronWeb returns 27/28, then v + 4 = 31/32`);

  console.log(`\n❓ Question: Why would Safe need v=31/32 instead of v=27/28?`);
  console.log(`\nPossible reasons:`);
  console.log(`  1. Modified ecrecover implementation in Safe contract`);
  console.log(`  2. Tron-specific signature verification precompile`);
  console.log(`  3. Custom signature validation logic (not standard ecrecover)`);
  console.log(`  4. Chain ID encoding in v value (EIP-155 style)`);

  // Test 6: EIP-155 chain ID encoding
  console.log("\n\nTEST 6: EIP-155 Chain ID Encoding");
  console.log("─────────────────────────────────────");

  const chainId = 3448148188; // Nile testnet
  console.log(`Tron Nile Chain ID: ${chainId}`);
  console.log(`\nEIP-155 v encoding formula: v = 35 + chainId * 2 + recoveryId`);
  console.log(`  For recoveryId=0: v = ${35 + chainId * 2 + 0}`);
  console.log(`  For recoveryId=1: v = ${35 + chainId * 2 + 1}`);
  console.log(`\nNote: This produces very large v values, not 31/32`);
  console.log(`So the user's v+4 adjustment is NOT related to EIP-155\n`);

  // Summary
  console.log("\n====================================================");
  console.log("CONCLUSIONS & RECOMMENDATIONS");
  console.log("====================================================\n");

  const nativeV = parseInt(rawSignature.replace("0x", "").slice(128, 130), 16);

  console.log(`1. TronWeb.signMessageV2() native v value: ${nativeV}`);

  if (nativeV === 0 || nativeV === 1) {
    console.log(`   ✓ Returns recovery ID (0 or 1)`);
    console.log(`   ✓ To get Ethereum standard: add 27 → v = ${nativeV + 27}`);
    console.log(`   ✓ To get user's Safe format: add 31 → v = ${nativeV + 31}`);
  } else if (nativeV === 27 || nativeV === 28) {
    console.log(`   ✓ Already in Ethereum format (27 or 28)`);
    console.log(`   ✓ To get user's Safe format: add 4 → v = ${nativeV + 4}`);
  }

  console.log(`\n2. User's Safe Contract Analysis:`);
  console.log(`   • Expects v = 31 or 32`);
  console.log(`   • This is +4 from Ethereum standard (27/28)`);
  console.log(`   • OR +31 from raw recovery ID (0/1)`);

  console.log(`\n3. Likely Explanation:`);
  console.log(`   The user's Safe contract has been modified to expect`);
  console.log(`   v values of 31/32 instead of the standard 27/28.`);
  console.log(`   This might be:`);
  console.log(`   • A Tron-specific signature verification mechanism`);
  console.log(`   • A way to distinguish Tron signatures from Ethereum`);
  console.log(`   • A custom implementation detail of their Safe deployment`);

  console.log(`\n4. Implementation Recommendation:`);
  console.log(`   Add configurable v value offset in transport config:`);
  console.log(`   `);
  console.log(`   signatureCompatibility: {`);
  console.log(`     useEthereumPrefix: false,  // Use Tron prefix`);
  console.log(`     vValueOffset: 4,            // Add 4 to v (27→31, 28→32)`);
  console.log(`     // Or: vValueBase: 31      // Set base to 31 instead of 27`);
  console.log(`   }`);

  console.log(`\n5. Not a Tron Standard:`);
  console.log(`   This v=31/32 requirement appears to be specific to`);
  console.log(`   this user's Safe deployment, not a general Tron standard.`);
  console.log(`   Most Tron contracts would work fine with v=27/28.`);
}

analyzeSignature().catch(console.error);

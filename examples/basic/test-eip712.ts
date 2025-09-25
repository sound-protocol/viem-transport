import { parseTypedData, createEIP712Digest, formatSafeTransaction } from "../../src/tronWeb/utils/eip712";

// Test 1: Basic EIP-712 example
const basicTypedData = {
  domain: {
    name: "Example",
    version: "1",
    chainId: 1,
    verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"
  },
  types: {
    Person: [
      { name: "name", type: "string" },
      { name: "wallet", type: "address" }
    ],
    Mail: [
      { name: "from", type: "Person" },
      { name: "to", type: "Person" },
      { name: "contents", type: "string" }
    ]
  },
  primaryType: "Mail",
  message: {
    from: {
      name: "Alice",
      wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"
    },
    to: {
      name: "Bob",
      wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"
    },
    contents: "Hello, Bob!"
  }
};

// Test 2: Safe transaction format
const safeTx = {
  to: "0x1234567890123456789012345678901234567890",
  value: "1000000000000000000", // 1 ETH
  data: "0x",
  operation: 0,
  safeTxGas: 0,
  baseGas: 0,
  gasPrice: 0,
  gasToken: "0x0000000000000000000000000000000000000000",
  refundReceiver: "0x0000000000000000000000000000000000000000",
  nonce: 0,
  chainId: 728126428, // Tron mainnet
  safe: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
};

console.log("Testing EIP-712 Implementation");
console.log("================================");

try {
  // Test basic typed data
  console.log("\nTest 1: Basic typed data parsing and hashing");
  const parsed1 = parseTypedData(basicTypedData);
  console.log("✓ Parsed typed data successfully");

  const digest1 = createEIP712Digest(parsed1);
  console.log("✓ Created EIP-712 digest:", digest1);

  // Test Safe transaction format
  console.log("\nTest 2: Safe transaction format");
  const safeTypedData = formatSafeTransaction(safeTx);
  console.log("✓ Formatted Safe transaction for EIP-712");

  const digest2 = createEIP712Digest(safeTypedData);
  console.log("✓ Created Safe transaction digest:", digest2);

  // Test with JSON string input
  console.log("\nTest 3: JSON string input");
  const jsonData = JSON.stringify(basicTypedData);
  const parsed3 = parseTypedData(jsonData);
  console.log("✓ Parsed JSON string successfully");

  const digest3 = createEIP712Digest(parsed3);
  console.log("✓ Created digest from JSON:", digest3);

  console.log("\n✅ All EIP-712 tests passed!");

} catch (error) {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
}

/**
 * Example: Using vValueOffset for Tron Safe Compressed Key Signatures
 *
 * This example demonstrates how to configure the transport for different
 * Safe contract deployments based on their signature requirements.
 */

import { TronWeb } from 'tronweb';
import { createWalletClient } from 'viem';
import { tronWeb } from '../../src/tronWeb';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

// ============================================================================
// Scenario 1: Standard Ethereum Safe on Tron (v = 27/28)
// ============================================================================
console.log('\n📋 Scenario 1: Standard Ethereum Safe');
console.log('=====================================\n');

const standardTransport = tronWeb(tw, {
  chainId: 3448148188, // Nile testnet
  signatureCompatibility: {
    useEthereumPrefix: false,  // Use Tron message prefix
    adjustVValue: true,         // Normalize v to 27/28
    vValueOffset: 0,            // ← NO OFFSET (default)
  }
});

const standardClient = createWalletClient({ transport: standardTransport });

console.log('Configuration:');
console.log('  - Message Prefix: \\x19TRON Signed Message:\\n');
console.log('  - v Value: 27 or 28 (standard Ethereum)');
console.log('  - Use Case: Standard Safe deployment on Tron\n');

// ============================================================================
// Scenario 2: Tron Safe with Compressed Keys (v = 31/32)
// ============================================================================
console.log('\n📋 Scenario 2: Tron Safe with Compressed Keys');
console.log('==============================================\n');

const compressedTransport = tronWeb(tw, {
  chainId: 3448148188,
  signatureCompatibility: {
    useEthereumPrefix: false,
    adjustVValue: true,
    vValueOffset: 4,            // ← ADD +4 OFFSET (produces v=31/32)
  }
});

const compressedClient = createWalletClient({ transport: compressedTransport });

console.log('Configuration:');
console.log('  - Message Prefix: \\x19TRON Signed Message:\\n');
console.log('  - v Value: 31 or 32 (compressed public keys, BIP-137)');
console.log('  - Use Case: Tron Safe adapted for compressed keys\n');

// ============================================================================
// Demonstration: Sign EIP-712 Typed Data
// ============================================================================
console.log('\n🔐 Demonstration: EIP-712 Signing');
console.log('==================================\n');

const safeAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'; // Example

const typedData = {
  domain: {
    chainId: 3448148188,
    verifyingContract: safeAddress,
  },
  types: {
    SafeTx: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'operation', type: 'uint8' },
      { name: 'safeTxGas', type: 'uint256' },
      { name: 'baseGas', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' },
      { name: 'gasToken', type: 'address' },
      { name: 'refundReceiver', type: 'address' },
      { name: 'nonce', type: 'uint256' },
    ],
  },
  primaryType: 'SafeTx',
  message: {
    to: '0x0000000000000000000000000000000000000000',
    value: 0n,
    data: '0x',
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 0n,
  },
};

async function demonstrateSignature() {
  try {
    console.log('1. Signing with Standard Safe (v=27/28):');
    const sig1 = await standardClient.signTypedData(typedData);
    const v1 = parseInt(sig1.slice(-2), 16);
    console.log(`   Signature: ${sig1.slice(0, 20)}...${sig1.slice(-6)}`);
    console.log(`   v value: ${v1} (${v1 === 27 || v1 === 28 ? '✅ Standard' : '❌ Non-standard'})\n`);

    console.log('2. Signing with Compressed Key Safe (v=31/32):');
    const sig2 = await compressedClient.signTypedData(typedData);
    const v2 = parseInt(sig2.slice(-2), 16);
    console.log(`   Signature: ${sig2.slice(0, 20)}...${sig2.slice(-6)}`);
    console.log(`   v value: ${v2} (${v2 === 31 || v2 === 32 ? '✅ Compressed' : '❌ Not compressed'})\n`);

    console.log('✅ Both signature formats produced successfully!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

// ============================================================================
// Technical Details
// ============================================================================
console.log('\n📚 Technical Background');
console.log('======================\n');

console.log('ECDSA v Value Standards:');
console.log('  • Raw recovery ID: 0 or 1');
console.log('  • Standard Ethereum: v = recovery_id + 27  →  v ∈ {27, 28}');
console.log('  • Compressed keys:   v = recovery_id + 31  →  v ∈ {31, 32}');
console.log('');
console.log('Why v = 31/32?');
console.log('  • Follows Bitcoin BIP-137 standard for compressed public keys');
console.log('  • Reduces signature size and transaction costs on Tron');
console.log('  • Requires Safe contract to normalize v before ecrecover:');
console.log('    if (v == 31 || v == 32) {');
console.log('      v = v - 4;  // Convert 31→27, 32→28');
console.log('    }');
console.log('');
console.log('How vValueOffset Works:');
console.log('  1. TronWeb signs message  →  produces v = 27 or 28');
console.log('  2. Transport applies offset  →  v = 27 + offset');
console.log('  3. With offset=4  →  final v = 31 or 32');
console.log('  4. Safe contract subtracts 4 before ecrecover');
console.log('');

// Run demonstration if private key is set
if (process.env.PRIVATE_KEY) {
  demonstrateSignature()
    .then(() => {
      console.log('\n✅ Example completed successfully\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Example failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  Set PRIVATE_KEY in .env to run live demonstration\n');
  console.log('Example configuration shown above.');
  console.log('Use vValueOffset=0 for standard Safe, vValueOffset=4 for compressed key Safe.\n');
}

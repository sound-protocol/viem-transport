/**
 * Test eth_getCode implementation
 *
 * This tests whether we can retrieve contract bytecode from Tron
 */

import { TronWeb } from 'tronweb';
import { createPublicClient } from 'viem';
import { tronWeb } from '../../src/tronWeb';
import 'dotenv/config';

const tw = new TronWeb({
  fullHost: 'https://nile.trongrid.io',
  privateKey: process.env.PRIVATE_KEY || '',
});

const transport = tronWeb(tw, {
  chainId: 3448148188,
});

const publicClient = createPublicClient({ transport });

async function testGetCode() {
  console.log('\n🔍 Testing eth_getCode Implementation\n');
  console.log('=====================================\n');

  // Test with known contract addresses on Nile testnet
  const testCases = [
    {
      name: 'USDT Contract',
      address: '0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C', // USDT on Nile
    },
    {
      name: 'Your Safe (example)',
      address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    },
    {
      name: 'Non-contract Address (should be empty)',
      address: '0x0000000000000000000000000000000000000001',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📦 ${testCase.name}`);
    console.log(`Address: ${testCase.address}`);

    try {
      // Method 1: Via viem publicClient (uses our transport)
      console.log('\n  Method 1: publicClient.getCode()');
      const code = await publicClient.getCode({
        address: testCase.address as `0x${string}`,
      });
      console.log(`  Result: ${code === '0x' ? 'EMPTY ❌' : `${code.slice(0, 20)}...${code.slice(-10)} (${code.length} chars) ✅`}`);

      // Method 2: Direct TronWeb API
      console.log('\n  Method 2: TronWeb direct');
      const tronAddr = tw.address.fromHex(testCase.address);
      console.log(`  Tron Address: ${tronAddr}`);

      try {
        const contract = await tw.trx.getContract(tronAddr);
        console.log(`  Contract object:`, {
          hasBytecode: !!contract?.bytecode,
          bytecodeLength: contract?.bytecode?.length || 0,
          bytecodePreview: contract?.bytecode ? `${contract.bytecode.slice(0, 20)}...` : 'N/A',
        });

        // Method 3: Try alternative API
        console.log('\n  Method 3: TronWeb.trx.getSmartContract()');
        const smartContract = await tw.trx.getSmartContract(tronAddr);
        console.log(`  Smart Contract:`, {
          hasBytecode: !!smartContract?.bytecode,
          hasOriginEnergyLimit: !!smartContract?.origin_energy_limit,
          name: smartContract?.name || 'N/A',
        });

      } catch (err) {
        console.log(`  TronWeb Error: ${err instanceof Error ? err.message : String(err)}`);
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n\n💡 Analysis');
  console.log('===========\n');
  console.log('If Method 1 returns EMPTY but Methods 2/3 show bytecode exists,');
  console.log('then we need to fix how we extract bytecode from the TronWeb response.\n');
  console.log('If ALL methods return empty/error, then the contract might not be deployed.\n');
}

testGetCode()
  .then(() => {
    console.log('\n✅ Test completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

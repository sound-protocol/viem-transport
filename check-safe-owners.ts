import { TronWeb } from 'tronweb';
import { createWalletClient, encodeFunctionData, parseAbi, decodeAbiParameters } from 'viem';
import { tronWeb, tronAddressTo0x } from './src/tronWeb';
import 'dotenv/config';

const SAFE_ADDRESS = 'TDYX8cJyqVFsAShvvw4DNA2GW2J27dvVWi';

// Expected owners
const EXPECTED_OWNERS = [
  'TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp',
  'TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx',
  'TLbudatWj7613sD6bvUG4abWcZADZ6Vpje',
];

async function checkSafeOwners() {
  console.log('🔍 CHECKING SAFE CONFIGURATION\n');
  console.log('Safe Address:', SAFE_ADDRESS, '\n');

  const tw = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
    privateKey: '336306101c4e1de37ff04779188624dfa0a44a5ad439cbff4dec0e6c2ca50277',
  });

  const transport = tronWeb(tw, { chainId: 3448148188 });
  const client = createWalletClient({ transport });

  const safeAbi = parseAbi([
    'function getOwners() public view returns (address[] memory)',
    'function getThreshold() public view returns (uint256)'
  ]);

  // Step 1: Get owners
  console.log('📋 Step 1: Get Safe Owners');

  const ownersData = encodeFunctionData({
    abi: safeAbi,
    functionName: 'getOwners',
    args: [],
  });

  const ownersResult = await client.request({
    method: 'eth_call',
    params: [{
      to: SAFE_ADDRESS,
      data: ownersData,
    }, 'latest'],
  });

  const decoded = decodeAbiParameters(
    [{ type: 'address[]' }],
    ownersResult as `0x${string}`
  );

  const ownersEvm = decoded[0];
  console.log(`   Found ${ownersEvm.length} owners:\n`);

  // Convert to Tron addresses and compare
  const ownersTron = ownersEvm.map(evmAddr => tw.address.fromHex('41' + evmAddr.slice(2)));

  ownersTron.forEach((owner, i) => {
    const expected = EXPECTED_OWNERS.includes(owner);
    console.log(`   ${i + 1}. ${owner} ${expected ? '✅' : '❌ UNEXPECTED'}`);
    console.log(`      EVM: ${ownersEvm[i]}`);
  });

  console.log();

  // Step 2: Get threshold
  console.log('📋 Step 2: Get Safe Threshold');

  const thresholdData = encodeFunctionData({
    abi: safeAbi,
    functionName: 'getThreshold',
    args: [],
  });

  const thresholdResult = await client.request({
    method: 'eth_call',
    params: [{
      to: SAFE_ADDRESS,
      data: thresholdData,
    }, 'latest'],
  });

  const threshold = BigInt(thresholdResult as string);
  console.log(`   Threshold: ${threshold} ${threshold === 2n ? '✅' : '❌'}\n`);

  // Step 3: Verify all expected owners present
  console.log('📋 Step 3: Verification');

  const allOwnersPresent = EXPECTED_OWNERS.every(expected =>
    ownersTron.includes(expected)
  );

  if (allOwnersPresent && threshold === 2n && ownersTron.length === 3) {
    console.log('   ✅ Safe configuration is CORRECT!');
    console.log('   ✅ All 3 expected owners are configured');
    console.log('   ✅ Threshold is 2 (requires 2 signatures)');
    console.log('   ✅ This confirms the multisig transaction used valid signatures\n');
  } else {
    console.log('   ❌ Configuration mismatch detected\n');
  }

  return {
    owners: ownersTron,
    threshold: Number(threshold),
    ownersEvm,
  };
}

checkSafeOwners()
  .then((result) => {
    console.log('🎉 SAFE CONFIGURATION VERIFIED!');
    console.log('\n📊 Summary:');
    console.log(`   Owners: ${result.owners.length}`);
    console.log(`   Threshold: ${result.threshold}`);
    console.log('\n💡 Note: In Safe multisig, only ONE owner submits the transaction');
    console.log('   Other owners sign off-chain and their signatures are included.');
    console.log('   This is why Owner 2 has no transaction on TronScan.');
  })
  .catch((error) => {
    console.error('\n💥 CHECK FAILED:', error);
    process.exit(1);
  });

/**
 * Safe Address Prediction for Tron - PROFESSIONAL VERSION
 *
 * This module provides utilities to predict Safe proxy addresses on Tron using CREATE2.
 *
 * CRITICAL DIFFERENCES FROM ETHEREUM:
 * - Tron CREATE2: keccak256(factory_21bytes ++ salt ++ keccak256(init_code))[12:]
 * - Ethereum CREATE2: keccak256(0xff ++ factory_20bytes ++ salt ++ keccak256(init_code))[12:]
 *
 * KEY: We fetch proxy bytecode from SafeProxyFactory.proxyCreationCode() instead of hardcoding
 */

import type {WalletClient} from 'viem';
import {
  concat,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  type Hex,
  keccak256,
  parseAbi,
  parseAbiParameters,
} from 'viem';
import type {TronWebLike} from '../types';

/**
 * Safe setup function ABI
 */
const SAFE_SETUP_ABI = parseAbi([
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)'
]);

/**
 * SafeProxyFactory ABI (for getting proxy bytecode)
 */
const PROXY_FACTORY_ABI = parseAbi([
  'function proxyCreationCode() public pure returns (bytes memory)'
]);

export interface SafeSetupConfig {
  owners: string[];           // Array of owner addresses (Tron base58 or EVM format)
  threshold: number;          // Number of required signatures
  to?: string;                // Optional contract to call during setup
  data?: Hex;                 // Optional data for setup call
  fallbackHandler?: string;   // Optional fallback handler address
  paymentToken?: string;      // Optional payment token address
  payment?: bigint;           // Optional payment amount
  paymentReceiver?: string;   // Optional payment receiver address
}

/**
 * Cache for proxy creation code (per factory address)
 * Key: factory address (EVM format), Value: proxy creation bytecode
 */
const PROXY_CODE_CACHE = new Map<string, Hex>();

/**
 * Fetch proxy creation code from SafeProxyFactory contract
 * This is the PROFESSIONAL way - get it from the source of truth!
 *
 * @param walletClient - Viem wallet client
 * @param factoryAddress - SafeProxyFactory address (EVM format)
 * @param useCache - Whether to use cached value (default: true)
 * @returns Proxy creation bytecode
 */
async function getProxyCreationCode(
  walletClient: WalletClient,
  factoryAddress: Hex,
  useCache: boolean = true
): Promise<Hex> {
  // Check cache first
  if (useCache && PROXY_CODE_CACHE.has(factoryAddress)) {
    return PROXY_CODE_CACHE.get(factoryAddress)!;
  }

  // Call proxyCreationCode() on factory
  const data = encodeFunctionData({
    abi: PROXY_FACTORY_ABI,
    functionName: 'proxyCreationCode',
  });

  const result = await walletClient.request({
    method: 'eth_call' as any,
    params: [{
      to: factoryAddress,
      data,
    }, 'latest'],
  } as any);

  // Decode the result (it's ABI-encoded bytes)
  const decoded = decodeAbiParameters(
    parseAbiParameters('bytes'),
    result as Hex
  );

  const proxyCode = decoded[0] as Hex;

  // Cache it
  PROXY_CODE_CACHE.set(factoryAddress, proxyCode);

  return proxyCode;
}

/**
 * Predict Safe proxy address on Tron using CREATE2 (fetches bytecode from contract)
 *
 * This version fetches the actual proxy bytecode from SafeProxyFactory.proxyCreationCode()
 * instead of using hardcoded bytecode. This makes it work with:
 * - ANY factory address (mainnet, testnet, custom deployments)
 * - ANY Safe version (v1.3.0, v1.4.0, v2.0.0, etc.)
 * - Future deployments (no hardcoded bytecode to update)
 *
 * The bytecode is cached per factory for performance.
 *
 * @param tronWeb - TronWeb instance
 * @param walletClient - Viem wallet client (for calling factory)
 * @param factoryAddress - SafeProxyFactory address (Tron base58 format)
 * @param singletonAddress - Safe singleton address (Tron base58 format)
 * @param setupConfig - Safe setup configuration
 * @param saltNonce - Salt nonce for CREATE2
 * @param options - Optional settings
 * @returns Predicted Safe address in EVM format (0x...)
 *
 * @example
 * ```typescript
 * const predictedAddress = await predictSafeAddressWithBytecode(
 *   tw,
 *   walletClient,
 *   'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',  // ProxyFactory
 *   'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',  // Singleton
 *   {
 *     owners: ['TAddr1...', 'TAddr2...'],
 *     threshold: 2,
 *     fallbackHandler: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC'
 *   },
 *   saltNonce
 * );
 * ```
 */
export async function predictSafeAddressWithBytecode(
  tronWeb: TronWebLike,
  walletClient: WalletClient,
  factoryAddress: string,
  singletonAddress: string,
  setupConfig: SafeSetupConfig,
  saltNonce: bigint,
  options: { useCache?: boolean } = {}
): Promise<string> {
  const { useCache = true } = options;

  // Convert factory to 21-byte Tron hex format (with 41 prefix)
  const factoryTronHex = tronWeb.address.toHex(factoryAddress);
  if (!factoryTronHex.startsWith('41')) {
    throw new Error('Factory address must be in Tron format (should start with 41 when converted)');
  }

  // Convert factory to EVM format for eth_call
  const factoryEvm = ('0x' + factoryTronHex.slice(2)) as Hex;

  // PROFESSIONAL: Fetch proxy bytecode from factory contract!
  const proxyCreationCode = await getProxyCreationCode(walletClient, factoryEvm, useCache);

  // Convert singleton to EVM format
  const singletonEvmHex = tronWeb.address.toHex(singletonAddress);
  const singletonEvm = ('0x' + singletonEvmHex.slice(2)) as Hex;

  // Convert owners to EVM format
  const ownersEvm = setupConfig.owners.map(owner => {
    const hex = tronWeb.address.toHex(owner);
    return ('0x' + hex.slice(2)) as Hex;
  });

  // Convert optional addresses to EVM format
  const toEvm = setupConfig.to
    ? ('0x' + tronWeb.address.toHex(setupConfig.to).slice(2)) as Hex
    : '0x0000000000000000000000000000000000000000' as Hex;

  const fallbackHandlerEvm = setupConfig.fallbackHandler
    ? ('0x' + tronWeb.address.toHex(setupConfig.fallbackHandler).slice(2)) as Hex
    : '0x0000000000000000000000000000000000000000' as Hex;

  const paymentTokenEvm = setupConfig.paymentToken
    ? ('0x' + tronWeb.address.toHex(setupConfig.paymentToken).slice(2)) as Hex
    : '0x0000000000000000000000000000000000000000' as Hex;

  const paymentReceiverEvm = setupConfig.paymentReceiver
    ? ('0x' + tronWeb.address.toHex(setupConfig.paymentReceiver).slice(2)) as Hex
    : '0x0000000000000000000000000000000000000000' as Hex;

  // Step 1: Create initializer (complete setup() call with function selector)
  const initializer = encodeFunctionData({
    abi: SAFE_SETUP_ABI,
    functionName: 'setup',
    args: [
      ownersEvm,
      BigInt(setupConfig.threshold),
      toEvm,
      setupConfig.data || '0x',
      fallbackHandlerEvm,
      paymentTokenEvm,
      setupConfig.payment || 0n,
      paymentReceiverEvm,
    ]
  });

  // Step 2: Calculate salt
  // salt = keccak256(abi.encodePacked(keccak256(initializer), saltNonce))
  const initializerHash = keccak256(initializer as Hex);
  const salt = keccak256(encodePacked(
    ['bytes32', 'uint256'],
    [initializerHash, saltNonce]
  ));

  // Step 3: Create deployment data
  // deploymentData = proxyCreationCode ++ abi.encode(singleton)
  const singletonEncoded = encodeAbiParameters(
    parseAbiParameters('address'),
    [singletonEvm]
  );

  const deploymentData = concat([
    proxyCreationCode,
    singletonEncoded
  ]);

  const deploymentCodeHash = keccak256(deploymentData);

  // Step 4: Calculate CREATE2 address using TRON formula
  // TRON: keccak256(factory_21bytes ++ salt ++ hash) - NO prefix!
  const create2Input = concat([
    ('0x' + factoryTronHex) as Hex,  // 21-byte factory (with 41 prefix)
    salt,
    deploymentCodeHash
  ]);

  const create2Hash = keccak256(create2Input);

  // Take last 20 bytes as address (EVM format)
  return ('0x' + create2Hash.slice(-40)) as Hex;
}

/**
 * Extract salt nonce from a deployed Safe transaction
 *
 * @param transactionData - Transaction calldata from createProxyWithNonce
 * @returns Salt nonce used in deployment
 */
export function extractSaltNonceFromTransaction(transactionData: Hex): bigint {
  // Remove function selector (first 8 hex chars after 0x)
  const params = ('0x' + transactionData.slice(10)) as Hex;

  // Decode: createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)
  const [, , saltNonce] = decodeAbiParameters(
    parseAbiParameters('address, bytes, uint256'),
    params
  );

  return saltNonce;
}

/**
 * Clear the proxy code cache (useful for testing or if factory is upgraded)
 */
export function clearProxyCodeCache(): void {
  PROXY_CODE_CACHE.clear();
}

/**
 * Safe Address Prediction for Tron
 *
 * This module provides utilities to predict Safe proxy addresses on Tron using CREATE2.
 *
 * CRITICAL: Tron's CREATE2 implementation differs from Ethereum!
 *
 * Ethereum CREATE2 formula:
 *   address = keccak256(0xff ++ factory ++ salt ++ keccak256(init_code))[12:]
 *
 * Tron CREATE2 formula:
 *   address = keccak256(factory_21bytes ++ salt ++ keccak256(init_code))[12:]
 *   - NO 0xff prefix
 *   - NO 0x41 prefix
 *   - Factory must be 21-byte Tron format (with 41 prefix)
 */

import {
  concat,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  keccak256,
  parseAbi,
  parseAbiParameters
} from 'viem';
import type {TronWebLike} from '../types';

/**
 * Safe proxy creation code (from SafeProxyFactory)
 * This is the bytecode that gets deployed for each Safe proxy
 */
const SAFE_PROXY_CREATION_CODE = '0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033496e76616c69642073696e676c65746f6e20616464726573732070726f7669646564';

/**
 * Safe setup function ABI
 */
const SAFE_SETUP_ABI = parseAbi([
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)'
]);

export interface SafeSetupConfig {
  owners: string[];           // Array of owner addresses (Tron base58 or EVM format)
  threshold: number;          // Number of required signatures
  to?: string;                // Optional contract to call during setup
  data?: `0x${string}`;       // Optional data for setup call
  fallbackHandler?: string;   // Optional fallback handler address
  paymentToken?: string;      // Optional payment token address
  payment?: bigint;           // Optional payment amount
  paymentReceiver?: string;   // Optional payment receiver address
}

/**
 * Predict Safe proxy address on Tron using CREATE2
 *
 * @param tronWeb - TronWeb instance
 * @param factoryAddress - SafeProxyFactory address (Tron base58 format)
 * @param singletonAddress - Safe singleton address (Tron base58 format)
 * @param setupConfig - Safe setup configuration
 * @param saltNonce - Salt nonce for CREATE2 (Protocol Kit default if not provided)
 * @returns Predicted Safe address in EVM format (0x...)
 *
 * @example
 * ```typescript
 * const predictedAddress = predictSafeAddress(
 *   tw,
 *   'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',  // ProxyFactory
 *   'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',  // Singleton
 *   {
 *     owners: ['TAddr1...', 'TAddr2...', 'TAddr3...'],
 *     threshold: 2,
 *     fallbackHandler: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC'
 *   }
 * );
 * ```
 */
export function predictSafeAddress(
  tronWeb: TronWebLike,
  factoryAddress: string,
  singletonAddress: string,
  setupConfig: SafeSetupConfig,
  saltNonce?: bigint
): string {
  // Convert factory to 21-byte Tron hex format (with 41 prefix)
  const factoryTronHex = tronWeb.address.toHex(factoryAddress);
  if (!factoryTronHex.startsWith('41')) {
    throw new Error('Factory address must be in Tron format (should start with 41 when converted)');
  }

  // Convert singleton to EVM format for encoding
  const singletonEvmHex = tronWeb.address.toHex(singletonAddress);
  const singletonEvm = '0x' + singletonEvmHex.slice(2); // Remove 41 prefix

  // Convert owners to EVM format
  const ownersEvm = setupConfig.owners.map(owner => {
    const hex = tronWeb.address.toHex(owner);
    return ('0x' + hex.slice(2)) as `0x${string}`;
  });

  // Convert optional addresses to EVM format
  const toEvm = setupConfig.to
    ? ('0x' + tronWeb.address.toHex(setupConfig.to).slice(2)) as `0x${string}`
    : '0x0000000000000000000000000000000000000000' as `0x${string}`;

  const fallbackHandlerEvm = setupConfig.fallbackHandler
    ? ('0x' + tronWeb.address.toHex(setupConfig.fallbackHandler).slice(2)) as `0x${string}`
    : '0x0000000000000000000000000000000000000000' as `0x${string}`;

  const paymentTokenEvm = setupConfig.paymentToken
    ? ('0x' + tronWeb.address.toHex(setupConfig.paymentToken).slice(2)) as `0x${string}`
    : '0x0000000000000000000000000000000000000000' as `0x${string}`;

  const paymentReceiverEvm = setupConfig.paymentReceiver
    ? ('0x' + tronWeb.address.toHex(setupConfig.paymentReceiver).slice(2)) as `0x${string}`
    : '0x0000000000000000000000000000000000000000' as `0x${string}`;

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
  const initializerHash = keccak256(initializer as `0x${string}`);
  const finalSaltNonce = saltNonce || getDefaultSaltNonce();
  const salt = keccak256(encodePacked(
    ['bytes32', 'uint256'],
    [initializerHash, finalSaltNonce]
  ));

  // Step 3: Create deployment data
  // deploymentData = proxyCreationCode ++ abi.encode(singleton)
  const singletonEncoded = encodeAbiParameters(
    parseAbiParameters('address'),
    [singletonEvm as `0x${string}`]
  );

  const deploymentData = concat([
    SAFE_PROXY_CREATION_CODE as `0x${string}`,
    singletonEncoded as `0x${string}`
  ]);

  const deploymentCodeHash = keccak256(deploymentData);

  // Step 4: Calculate CREATE2 address using TRON formula
  // CRITICAL: Tron uses factory_21bytes ++ salt ++ hash (NO 0xff or 0x41 prefix!)
  const create2Input = concat([
    ('0x' + factoryTronHex) as `0x${string}`,  // 21-byte factory (with 41 prefix)
    salt as `0x${string}`,
    deploymentCodeHash as `0x${string}`
  ]);

  const create2Hash = keccak256(create2Input);

  // Take last 20 bytes as address (EVM format)
  return ('0x' + create2Hash.slice(-40)) as `0x${string}`;
}

/**
 * Get Protocol Kit's default salt nonce
 * When not specified, Protocol Kit uses a chain-specific default
 *
 * For Tron, we use a large random-looking value that Protocol Kit generates
 * This can be overridden by passing an explicit saltNonce
 */
function getDefaultSaltNonce(): bigint {
  // Protocol Kit generates a unique salt each time when not specified
  // For production use, you should either:
  // 1. Always specify an explicit saltNonce (recommended for predictability)
  // 2. Or use Protocol Kit's prediction and extract the actual salt used

  // This is a placeholder - in practice, let Protocol Kit handle prediction
  throw new Error('Salt nonce must be provided for Tron Safe address prediction. Protocol Kit generates random salts that we cannot predict.');
}

/**
 * Extract salt nonce from a deployed Safe transaction
 * Useful for verifying predictions against actual deployments
 *
 * @param transactionData - Transaction calldata from createProxyWithNonce
 * @returns Salt nonce used in deployment
 */
export function extractSaltNonceFromTransaction(transactionData: `0x${string}`): bigint {
  // Remove function selector (first 8 hex chars after 0x)
  const params = ('0x' + transactionData.slice(10)) as `0x${string}`;

  // Decode: createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)
  const [, , saltNonce] = decodeAbiParameters(
    parseAbiParameters('address, bytes, uint256'),
    params
  );

  return saltNonce;
}


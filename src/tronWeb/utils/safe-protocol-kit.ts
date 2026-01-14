/**
 * Safe Protocol Kit Integration with viem-transport
 *
 * This module provides utilities to use Safe Protocol Kit with viem-transport,
 * enabling Safe multi-signature wallet operations on Tron blockchain.
 */

import Safe, {PredictedSafeProps, SafeAccountConfig, SafeDeploymentConfig} from '@safe-global/protocol-kit';
import {WalletClient} from 'viem';
import type {TronWebLike} from '../types';
import {tronAddressTo0x} from './address';
import {predictSafeAddress, type SafeSetupConfig} from './safe-address-prediction';

/**
 * Configuration for Safe deployment on Tron
 */
export interface TronSafeConfig {
  /** TronWeb instance */
  tronWeb: TronWebLike;
  /** Viem WalletClient created with viem-transport */
  walletClient: WalletClient;
  /** Safe contract addresses on Tron network */
  contractNetworks?: {
    [chainId: string]: {
      safeSingletonAddress?: string;
      safeProxyFactoryAddress?: string;
      multiSendAddress?: string;
      multiSendCallOnlyAddress?: string;
      fallbackHandlerAddress?: string;
      signMessageLibAddress?: string;
      createCallAddress?: string;
      simulateTxAccessorAddress?: string;
      safeWebAuthnSignerFactoryAddress?: string;
      safeWebAuthnSharedSignerAddress?: string;
    };
  };
}

/**
 * Default Safe contract addresses on Tron Nile Testnet
 * All 8 core contracts deployed and verified
 */
export const TRON_NILE_SAFE_ADDRESSES = {
  safeSingletonAddress: 'TSGgGUZpaPgL7yUQZJ4kbC5D6wMddBg1k7',
  safeProxyFactoryAddress: 'TEgLBiLmGomVB4A2y2nusWWWRRMg1A5Jn4',
  multiSendAddress: 'TA6aGB9RuMhQmb6posn2CAuVP1v59umMyK',
  multiSendCallOnlyAddress: 'TUwaFFMwfksrBBhZvgSrpHeRgTzknV7Kxo',
  fallbackHandlerAddress: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC',
  signMessageLibAddress: 'TRT4fbYAxrE84vN5yLyQD4G43LE6vvYSV3',
  createCallAddress: 'TCBuMSa41FJUpW3afFQQgW5r4xYCnjdhPa',
  simulateTxAccessorAddress: 'TJKPHTNkYKcb9nDgULdrZFF17gQipTXMVy',
};

/**
 * Initialize Safe Protocol Kit with viem-transport
 *
 * @param config - Tron Safe configuration
 * @param safeAddress - Address of existing Safe (optional)
 * @returns Safe instance
 *
 * @example
 * ```typescript
 * const tw = new TronWeb({
 *   fullHost: 'https://nile.trongrid.io',
 *   privateKey: PRIVATE_KEY,
 * });
 *
 * const transport = tronWeb(tw, { chainId: 3448148188 });
 * const walletClient = createWalletClient({ transport });
 *
 * const protocolKit = await initSafeProtocolKit({
 *   tronWeb: tw,
 *   walletClient,
 *   contractNetworks: {
 *     '3448148188': TRON_NILE_SAFE_ADDRESSES
 *   }
 * }, 'TMTizpgYhi3k4UFaEK7i9QPuMnTewzQNPy');
 * ```
 */
export async function initSafeProtocolKit(
  config: TronSafeConfig,
  safeAddress?: string
): Promise<Safe> {
  const { tronWeb, walletClient, contractNetworks } = config;

  // Convert contract addresses from Tron base58 to EVM 0x format
  // Protocol Kit uses viem's readContract which requires 0x addresses
  const convertedNetworks: any = contractNetworks ? {} : undefined;
  if (contractNetworks && convertedNetworks) {
    for (const [chainId, addresses] of Object.entries(contractNetworks)) {
      convertedNetworks[chainId] = {};
      for (const [key, address] of Object.entries(addresses)) {
        if (address) {
          const evmAddress = tronAddressTo0x(tronWeb, address);
          if (!evmAddress) {
            throw new Error(`Failed to convert address ${address} to EVM format`);
          }
          convertedNetworks[chainId][key] = evmAddress;
        }
      }
    }
  }

  // Protocol Kit accepts viem WalletClient directly as provider
  const initConfig: any = {
    provider: walletClient,
    contractNetworks: convertedNetworks,
  };

  // Safe.init requires EITHER safeAddress OR predictedSafe, not both
  if (safeAddress) {
    // Convert Safe address to EVM format too
    const evmSafeAddress = tronAddressTo0x(tronWeb, safeAddress);
    if (!evmSafeAddress) {
      throw new Error(`Failed to convert Safe address ${safeAddress} to EVM format`);
    }
    initConfig.safeAddress = evmSafeAddress;
  }

  return await Safe.init(initConfig);
}

/**
 * Optional Safe setup configuration
 */
export interface SafeSetupOptions {
  to?: string;                // Optional contract to call during setup
  data?: string;              // Optional data for setup call
  fallbackHandler?: string;   // Optional fallback handler address
  paymentToken?: string;      // Optional payment token address
  payment?: number;           // Optional payment amount
  paymentReceiver?: string;   // Optional payment receiver address
}

/**
 * Create a predicted Safe configuration (for undeployed Safes)
 *
 * @param tronWeb - TronWeb instance
 * @param owners - List of owner addresses (Tron base58 format)
 * @param threshold - Number of required signatures
 * @param setupOptions - Optional Safe setup configuration
 * @param safeDeploymentConfig - Optional deployment configuration
 * @returns Predicted Safe props for Protocol Kit
 *
 * @example
 * ```typescript
 * const predictedSafe = createPredictedSafe(
 *   tw,
 *   ['TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp', 'TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx'],
 *   2,
 *   { fallbackHandler: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC' }
 * );
 * ```
 */
export function createPredictedSafe(
  tronWeb: TronWebLike,
  owners: string[],
  threshold: number,
  setupOptions?: SafeSetupOptions,
  safeDeploymentConfig?: SafeDeploymentConfig
): PredictedSafeProps {
  // Convert Tron addresses to EVM format
  const ownersEvm = owners.map(owner => {
    const evmAddr = tronAddressTo0x(tronWeb, owner);
    if (!evmAddr) {
      throw new Error(`Failed to convert Tron address to EVM format: ${owner}`);
    }
    return evmAddr;
  });

  // Build Safe account configuration with optional parameters
  const safeAccountConfig: SafeAccountConfig = {
    owners: ownersEvm,
    threshold,
  };

  // Add optional setup parameters if provided
  if (setupOptions?.to) {
    const toEvm = tronAddressTo0x(tronWeb, setupOptions.to);
    if (!toEvm) throw new Error(`Failed to convert to address: ${setupOptions.to}`);
    safeAccountConfig.to = toEvm;
  }
  if (setupOptions?.data) {
    safeAccountConfig.data = setupOptions.data;
  }
  if (setupOptions?.fallbackHandler) {
    const fallbackEvm = tronAddressTo0x(tronWeb, setupOptions.fallbackHandler);
    if (!fallbackEvm) throw new Error(`Failed to convert fallback handler: ${setupOptions.fallbackHandler}`);
    safeAccountConfig.fallbackHandler = fallbackEvm;
  }
  if (setupOptions?.paymentToken) {
    const tokenEvm = tronAddressTo0x(tronWeb, setupOptions.paymentToken);
    if (!tokenEvm) throw new Error(`Failed to convert payment token: ${setupOptions.paymentToken}`);
    safeAccountConfig.paymentToken = tokenEvm;
  }
  if (setupOptions?.payment !== undefined) {
    safeAccountConfig.payment = setupOptions.payment;
  }
  if (setupOptions?.paymentReceiver) {
    const receiverEvm = tronAddressTo0x(tronWeb, setupOptions.paymentReceiver);
    if (!receiverEvm) throw new Error(`Failed to convert payment receiver: ${setupOptions.paymentReceiver}`);
    safeAccountConfig.paymentReceiver = receiverEvm;
  }

  return {
    safeAccountConfig,
    safeDeploymentConfig,
  };
}

/**
 * Deploy a new Safe using Protocol Kit
 *
 * @param config - Tron Safe configuration
 * @param owners - List of owner addresses (Tron base58 format)
 * @param threshold - Number of required signatures
 * @param setupOptions - Optional Safe setup configuration (fallbackHandler, etc.)
 * @param saltNonce - Optional salt nonce for deterministic address. If not provided, generates deterministic salt from owners+threshold
 * @returns Deployed Safe instance and transaction hash
 *
 * @example
 * ```typescript
 * const { protocolKit, txHash, safeAddress } = await deploySafeWithProtocolKit(
 *   {
 *     tronWeb: tw,
 *     walletClient,
 *     contractNetworks: { '3448148188': TRON_NILE_SAFE_ADDRESSES }
 *   },
 *   ['TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp'],
 *   1,
 *   { fallbackHandler: 'TT8GrjkxCRMrNL6owRUgUF62VnKnvGXptC' },
 *   '12345'
 * );
 * ```
 */
export async function deploySafeWithProtocolKit(
  config: TronSafeConfig,
  owners: string[],
  threshold: number,
  setupOptions?: SafeSetupOptions,
  saltNonce?: string
): Promise<{
  protocolKit: Safe;
  safeAddress: string;
}> {
  const { tronWeb, walletClient, contractNetworks } = config;

  // Convert contract addresses from Tron base58 to EVM 0x format
  const convertedNetworks: any = contractNetworks ? {} : undefined;
  if (contractNetworks && convertedNetworks) {
    for (const [chainId, addresses] of Object.entries(contractNetworks)) {
      convertedNetworks[chainId] = {};
      for (const [key, address] of Object.entries(addresses)) {
        if (address) {
          const evmAddress = tronAddressTo0x(tronWeb, address);
          if (!evmAddress) {
            throw new Error(`Failed to convert address ${address} to EVM format`);
          }
          convertedNetworks[chainId][key] = evmAddress;
        }
      }
    }
  }

  // Create predicted Safe configuration
  // IMPORTANT: If saltNonce is not provided, Protocol Kit will use its own default prediction
  // which ensures the predicted address matches the actual deployed address
  const safeDeploymentConfig = saltNonce ? { saltNonce } : undefined;
  const predictedSafe = createPredictedSafe(tronWeb, owners, threshold, setupOptions, safeDeploymentConfig);

  // Initialize Protocol Kit with predicted Safe
  const protocolKit = await Safe.init({
    provider: walletClient as any,
    predictedSafe,
    contractNetworks: convertedNetworks,
  });

  // CRITICAL: Protocol Kit uses Ethereum CREATE2 formula, but Tron uses different CREATE2!
  // We MUST use our Tron-specific prediction instead of protocolKit.getAddress()

  // Get chainId from wallet client
  const chainId = await walletClient.getChainId();
  const contracts = contractNetworks?.[chainId.toString()];

  if (!contracts) {
    throw new Error(`No contract addresses configured for chainId ${chainId}`);
  }

  if (!contracts.safeProxyFactoryAddress || !contracts.safeSingletonAddress) {
    throw new Error('Missing required contract addresses: safeProxyFactoryAddress and safeSingletonAddress');
  }

  // Build setup config for Tron CREATE2 prediction
  // CRITICAL: Protocol Kit automatically uses fallbackHandlerAddress from contractNetworks
  // if not explicitly overridden. We must match this behavior for prediction to work!
  const setupConfig: SafeSetupConfig = {
    owners,
    threshold,
  };

  if (setupOptions?.to) setupConfig.to = setupOptions.to;
  if (setupOptions?.data) setupConfig.data = setupOptions.data as `0x${string}`;

  // Use explicit fallbackHandler if provided, otherwise use the one from contractNetworks
  // (Protocol Kit does this automatically when creating deployment transaction)
  if (setupOptions?.fallbackHandler) {
    setupConfig.fallbackHandler = setupOptions.fallbackHandler;
  } else if (contracts.fallbackHandlerAddress) {
    setupConfig.fallbackHandler = contracts.fallbackHandlerAddress;
  }

  if (setupOptions?.paymentToken) setupConfig.paymentToken = setupOptions.paymentToken;
  if (setupOptions?.payment !== undefined) setupConfig.payment = BigInt(setupOptions.payment);
  if (setupOptions?.paymentReceiver) setupConfig.paymentReceiver = setupOptions.paymentReceiver;

  // Use OUR Tron CREATE2 prediction (NOT Protocol Kit's Ethereum CREATE2)
  const safeAddress = predictSafeAddress(
    tronWeb,
    contracts.safeProxyFactoryAddress,
    contracts.safeSingletonAddress,
    setupConfig,
    saltNonce ? BigInt(saltNonce) : undefined
  );

  return {
    protocolKit,
    safeAddress, // This now uses Tron CREATE2 and will match actual deployment!
  };
}

/**
 * Connect to an existing Safe
 *
 * @param config - Tron Safe configuration
 * @param safeAddress - Address of existing Safe (Tron base58 or EVM format)
 * @returns Safe instance
 *
 * @example
 * ```typescript
 * const protocolKit = await connectToSafe(
 *   {
 *     tronWeb: tw,
 *     walletClient,
 *     contractNetworks: { '3448148188': TRON_NILE_SAFE_ADDRESSES }
 *   },
 *   'TMTizpgYhi3k4UFaEK7i9QPuMnTewzQNPy'
 * );
 * ```
 */
export async function connectToSafe(
  config: TronSafeConfig,
  safeAddress: string
): Promise<Safe> {
  return initSafeProtocolKit(config, safeAddress);
}

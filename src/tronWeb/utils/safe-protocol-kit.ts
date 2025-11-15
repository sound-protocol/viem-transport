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
 * Create a predicted Safe configuration (for undeployed Safes)
 *
 * @param tronWeb - TronWeb instance
 * @param owners - List of owner addresses (Tron base58 format)
 * @param threshold - Number of required signatures
 * @param safeDeploymentConfig - Optional deployment configuration
 * @returns Predicted Safe props for Protocol Kit
 *
 * @example
 * ```typescript
 * const predictedSafe = createPredictedSafe(
 *   tw,
 *   ['TVAJZA2FvSbKJsFbv2Re18h7k9XLLkMsZp', 'TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx'],
 *   2
 * );
 * ```
 */
export function createPredictedSafe(
  tronWeb: TronWebLike,
  owners: string[],
  threshold: number,
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

  const safeAccountConfig: SafeAccountConfig = {
    owners: ownersEvm,
    threshold,
  };

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
 *   1
 * );
 * ```
 */
export async function deploySafeWithProtocolKit(
  config: TronSafeConfig,
  owners: string[],
  threshold: number,
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
  const predictedSafe = createPredictedSafe(tronWeb, owners, threshold, safeDeploymentConfig);

  // Initialize Protocol Kit with predicted Safe
  const protocolKit = await Safe.init({
    provider: walletClient as any,
    predictedSafe,
    contractNetworks: convertedNetworks,
  });

  // Get predicted Safe address
  const safeAddress = await protocolKit.getAddress();

  return {
    protocolKit,
    safeAddress,
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

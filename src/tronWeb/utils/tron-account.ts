/**
 * Tron Account Utilities
 *
 * Creates custom accounts that force viem to use eth_sendTransaction
 * instead of eth_sendRawTransaction, allowing the Tron transport to
 * intercept and handle signing with TronWeb.
 */

import { toAccount } from 'viem/accounts';
import type { Address, Account } from 'viem';
import type { TronWebLike } from '../types';

/**
 * Creates a JSON-RPC style account from a Tron address
 *
 * This forces viem to use `eth_sendTransaction` instead of `eth_sendRawTransaction`,
 * allowing the Tron transport to intercept signing requests and handle them with TronWeb.
 *
 * **Why this is needed:**
 * - When viem sees `account.type === 'local'`, it signs locally and uses eth_sendRawTransaction (RLP format)
 * - When viem sees `account.type === 'json-rpc'`, it delegates to transport via eth_sendTransaction
 * - Tron uses Protobuf encoding, not RLP, so we must prevent local signing
 *
 * @param address - Tron address in EVM format (0x...)
 * @returns Account object with type 'json-rpc'
 *
 * @example
 * ```typescript
 * import { TronWeb } from 'tronweb';
 * import { createWalletClient } from 'viem';
 * import { tronWeb, createTronAccount } from './tronWeb';
 *
 * const tw = new TronWeb({
 *   fullHost: 'https://nile.trongrid.io',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * const address = tw.defaultAddress.hex as `0x${string}`;
 * const account = createTronAccount(address);
 *
 * const client = createWalletClient({
 *   account,
 *   transport: tronWeb(tw),
 * });
 *
 * // Now Protocol Kit will use eth_sendTransaction!
 * ```
 */
export function createTronAccount(address: Address): Account {
  const account = toAccount({
    address,
    async signMessage({ message }) {
      // These methods should never be called because the transport handles signing
      throw new Error(
        'signMessage should be handled by Tron transport. ' +
        'Ensure your transport is properly configured.'
      );
    },
    async signTransaction(transaction) {
      throw new Error(
        'signTransaction should be handled by Tron transport. ' +
        'This error means viem is trying to sign locally instead of delegating to the transport. ' +
        'Ensure the account type is "json-rpc".'
      );
    },
    async signTypedData(typedData) {
      throw new Error(
        'signTypedData should be handled by Tron transport. ' +
        'Ensure your transport is properly configured.'
      );
    },
  });

  // Override the type to 'json-rpc' to force viem to use eth_sendTransaction
  // This is a safe hack that changes how viem routes requests
  (account as any).type = 'json-rpc';

  return account;
}

/**
 * Creates a JSON-RPC account from a TronWeb instance
 *
 * Convenience wrapper that extracts the address from TronWeb
 * and creates a JSON-RPC account.
 *
 * @param tw - TronWeb instance with configured private key or default address
 * @returns Account object with type 'json-rpc'
 *
 * @example
 * ```typescript
 * import { TronWeb } from 'tronweb';
 * import { createWalletClient } from 'viem';
 * import { tronWeb, createTronAccountFromTronWeb } from './tronWeb';
 *
 * const tw = new TronWeb({
 *   fullHost: 'https://nile.trongrid.io',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 *
 * const account = createTronAccountFromTronWeb(tw);
 *
 * const client = createWalletClient({
 *   account,
 *   transport: tronWeb(tw),
 * });
 * ```
 */
export function createTronAccountFromTronWeb(tw: TronWebLike): Account {
  // Get the default address from TronWeb
  const address = tw.defaultAddress?.hex as Address;

  if (!address) {
    throw new Error(
      'TronWeb instance does not have a default address. ' +
      'Ensure TronWeb is initialized with a private key or default address.'
    );
  }

  return createTronAccount(address);
}

/**
 * Type guard to check if an account is a Tron JSON-RPC account
 *
 * @param account - Account to check
 * @returns True if account has type 'json-rpc'
 */
export function isTronAccount(account: Account): boolean {
  return (account as any).type === 'json-rpc';
}

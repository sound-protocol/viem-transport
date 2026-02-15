import { TransportConfig, Transport, EIP1193RequestFn, Address as Address$1, Account, WalletClient, Hex } from 'viem';
import Safe, { SafeDeploymentConfig, PredictedSafeProps } from '@safe-global/protocol-kit';

type TronWebSignerContext = {
    tronWeb: TronWebLike;
    request: {
        method: string;
        params: unknown[];
    };
};
type TronWebSigner = (transaction: TronTransaction, context: TronWebSignerContext) => Promise<TronTransaction>;
type TronWebTransportConfig = {
    /** Value to return for `eth_chainId`. If omitted, falls back to `chain.id`. */
    chainId?: number | `0x${string}`;
    /** The key of the transport. */
    key?: TransportConfig["key"] | undefined;
    /** Methods to include or exclude from executing RPC requests. */
    methods?: TransportConfig["methods"] | undefined;
    /** The name of the transport. */
    name?: TransportConfig["name"] | undefined;
    /** The max number of times to retry. */
    retryCount?: TransportConfig["retryCount"] | undefined;
    /** The base delay (in ms) between retries. */
    retryDelay?: TransportConfig["retryDelay"] | undefined;
    /** The timeout (in ms) for requests. */
    timeout?: TransportConfig["timeout"] | undefined;
    /** Default address used when requests omit `from`. Accepts 0x, base58, or 41-hex. */
    defaultFrom?: string | undefined;
    /** Options controlling constant contract calls (`eth_call`). */
    callOptions?: {
        /** Fee limit (SUN) applied when invoking constant calls. */
        feeLimit?: number | undefined;
    };
    /** Options controlling state-changing transactions. */
    sendOptions?: {
        /** Fee limit (SUN) applied when building transactions. */
        feeLimit?: number | undefined;
        /** Custom signer invoked before broadcasting. */
        signer?: TronWebSigner | undefined;
    };
    /** Signature compatibility configuration for cross-chain contracts. */
    signatureCompatibility?: {
        /**
         * Use Ethereum-compatible signing prefix for all message signatures.
         * Set to TRUE for: Ethereum Safe contracts deployed without modifications
         * Set to FALSE for: Tron-adapted Safe contracts that expect Tron signatures
         * Default: false (use native Tron signing)
         */
        useEthereumPrefix?: boolean;
        /**
         * Automatically adjust v values to Ethereum format (27/28 instead of 0/1).
         * Default: true
         */
        adjustVValue?: boolean;
        /**
         * Offset to add to v value for signature compatibility.
         *
         * Use cases:
         * - 0: Standard Ethereum signatures (v = 27/28) - DEFAULT
         * - 4: Tron Safe with compressed keys (v = 31/32)
         *
         * Technical background:
         * - TronWeb's signMessageV2 returns v = 27 or 28 (standard ECDSA)
         * - Some Tron Safe contracts expect v = 31/32 (compressed public key format, BIP-137)
         * - This offset is applied AFTER signature generation: final_v = original_v + offset
         *
         * Example:
         * ```typescript
         * // Standard Ethereum Safe (v = 27/28)
         * signatureCompatibility: { vValueOffset: 0 }
         *
         * // Tron Safe with compressed keys (v = 31/32)
         * signatureCompatibility: { vValueOffset: 4 }
         * ```
         *
         * Default: 0 (standard Ethereum format)
         */
        vValueOffset?: number;
        /**
         * Support dual verification (try both TRON and Ethereum prefixes).
         * Default: false (for performance)
         */
        supportDualVerification?: boolean;
    };
};
type TronWebTransport = Transport<"tronWeb", {
    tronWeb: TronWebLike;
}, EIP1193RequestFn>;

interface TronBlock {
    block_header?: {
        raw_data?: {
            number?: number;
            timestamp?: number;
            witness_address?: string;
        };
        number?: number;
    };
    blockID?: string;
    parentID?: string;
    number?: number;
    timestamp?: number;
    transactions?: TronTransaction[];
}
interface TronTransaction {
    txID?: string;
    txId?: string;
    signature?: string[];
    raw_data?: {
        contract?: Array<{
            parameter?: {
                value?: {
                    owner_address?: string;
                    to_address?: string;
                    contract_address?: string;
                    amount?: number;
                    call_value?: number;
                    data?: string;
                };
            };
        }>;
        fee_limit?: number;
    };
}
interface TronTransactionInfo {
    id?: string;
    blockNumber?: number;
    blockHash?: string;
    transactionIndex?: number;
    receipt?: {
        result?: string;
        energy_usage?: number;
        energy_usage_total?: number;
    };
    result?: string;
    energy_usage?: number;
    energy_usage_total?: number;
    contract_address?: string;
    log?: Array<{
        address: string;
        data?: string;
        topics?: string[];
    }>;
}
interface TronEvent {
    block_number: number;
    contract_address: string;
    event_name: string;
    transaction_id: string;
    log_index: number;
    result: {
        _topics: string[];
        _data: string;
    };
    transaction_index?: number;
    block_hash?: string;
}
type TronWebLike = {
    trx: {
        getCurrentBlock(): Promise<TronBlock>;
        getBlock(id: string | number): Promise<TronBlock>;
        getBalance(address: string): Promise<number>;
        getTransactionInfo(txid: string): Promise<TronTransactionInfo>;
        getTransaction(txid: string): Promise<TronTransaction>;
        getAccount(address: string): Promise<{
            transactions?: unknown[];
        }>;
        getContract(address: string): Promise<{
            bytecode?: string;
            code_hash?: string;
            abi?: {
                entrys: any[];
            };
        }>;
        getChainParameters(): Promise<Array<{
            key: string;
            value: number;
        }>>;
        sendRawTransaction(raw: string | TronTransaction): Promise<{
            txid?: string;
            result?: boolean;
            transaction?: {
                txID: string;
            };
        }>;
        sign(data: unknown): Promise<string>;
        signMessageV2(message: Buffer | Uint8Array): Promise<string>;
        verifyMessage(message: Buffer | string, signature: string): Promise<string>;
    };
    transactionBuilder: {
        triggerConstantContract(contractAddress: string, functionSelector: string, options: Record<string, unknown>, parameters: unknown[], issuerAddress: string): Promise<{
            result?: {
                result?: boolean;
            };
            constant_result?: string[];
            energy_used?: number;
        }>;
        triggerSmartContract(contractAddress: string, functionSelector: string, options: Record<string, unknown>, parameters: unknown[], issuerAddress: string): Promise<{
            transaction?: TronTransaction;
            result?: {
                result?: boolean;
            };
        }>;
        sendTrx(toAddress: string, amount: number, fromAddress: string, options?: Record<string, unknown>): Promise<TronTransaction>;
    };
    address: {
        fromHex(hex: string): string;
        toHex(base58: string): string;
    };
    utils: {
        code: {
            generateHashedMessage(message: Buffer | string): string;
        };
    };
    event: {
        getEventsByContractAddress(address: string, options: Record<string, unknown>): Promise<TronEvent[]>;
    };
    contract(abi: any[], address: string): Promise<any>;
    defaultPrivateKey: string;
    defaultAddress?: {
        base58?: string;
        b58?: string;
        hex?: string;
        hexString?: string;
    };
};
type Address = `0x${string}`;

declare function tronBase58FromEvm(tw: TronWebLike, address: Address): string;
declare function tronAddressTo0x(tw: TronWebLike, value: unknown): Address | null;
declare function tronHex41To0x(value: string): Address | null;
declare function tronBase58ToHex41(tw: TronWebLike, value: string): string | null;

declare function to0x(hex: string): `0x${string}`;
declare function strip0x(hex: string): string;
declare function normalizeHex(value: unknown): `0x${string}`;

declare const ZERO_ADDRESS: Address;
declare const TRON_HEX_PREFIX = "41";
declare const BASE58_REGEX: RegExp;
declare const DEFAULT_FEE_LIMIT = 40000000;

/**
 * Options for waiting for transaction confirmation
 */
interface WaitForReceiptOptions {
    /**
     * Number of block confirmations to wait for
     * Default: 19 (one full Super Representative cycle on Tron)
     */
    confirmations?: number;
    /**
     * Maximum time to wait in milliseconds
     * Default: 60000 (60 seconds)
     */
    timeout?: number;
    /**
     * Polling interval in milliseconds
     * Default: 3000 (3 seconds, Tron's block time)
     */
    pollingInterval?: number;
    /**
     * Callback fired on each confirmation
     * Useful for updating UI with progress
     */
    onConfirmation?: (currentConfirmations: number, required: number) => void;
}
/**
 * Transaction receipt returned by waitForTransactionReceipt
 */
interface TransactionReceipt {
    transactionHash: string;
    transactionIndex: string;
    blockHash: string;
    blockNumber: string;
    from: string;
    to: string | null;
    cumulativeGasUsed: string;
    gasUsed: string;
    contractAddress: string | null;
    logs: any[];
    status: "0x1" | "0x0";
    effectiveGasPrice: string;
    confirmations: number;
}
/**
 * Error thrown when transaction confirmation times out
 */
declare class ConfirmationTimeoutError extends Error {
    readonly txHash: string;
    readonly timeout: number;
    constructor(txHash: string, timeout: number);
}
/**
 * Error thrown when transaction is not found
 */
declare class TransactionNotFoundError extends Error {
    readonly txHash: string;
    constructor(txHash: string);
}
/**
 * Error thrown when transaction execution reverted
 */
declare class TransactionRevertedError extends Error {
    readonly txHash: string;
    readonly reason?: string | undefined;
    constructor(txHash: string, reason?: string | undefined);
}
/**
 * Wait for a transaction to be confirmed on the blockchain
 *
 * This function polls the blockchain until the transaction reaches the desired
 * number of confirmations or times out. Essential for Safe contracts to ensure
 * transactions are finalized before showing "Executed" status.
 *
 * @param tw - TronWeb instance
 * @param txHash - Transaction hash (with or without 0x prefix)
 * @param options - Configuration options
 * @returns Transaction receipt with confirmation count
 * @throws {TransactionNotFoundError} If transaction is not found after timeout
 * @throws {TransactionRevertedError} If transaction execution reverted
 * @throws {ConfirmationTimeoutError} If confirmations not reached within timeout
 *
 * @example
 * ```typescript
 * // Wait for 19 confirmations (one full SR cycle)
 * const receipt = await waitForTransactionReceipt(tw, txHash, {
 *   confirmations: 19,
 *   onConfirmation: (current, required) => {
 *     console.log(`${current}/${required} confirmations`);
 *   }
 * });
 *
 * if (receipt.status === '0x1') {
 *   console.log('Transaction confirmed successfully');
 * }
 * ```
 */
declare function waitForTransactionReceipt(tw: TronWebLike, txHash: string, options?: WaitForReceiptOptions): Promise<TransactionReceipt>;
/**
 * Get the current number of confirmations for a transaction
 *
 * @param tw - TronWeb instance
 * @param txHash - Transaction hash
 * @returns Number of confirmations, or null if transaction not found
 */
declare function getTransactionConfirmations(tw: TronWebLike, txHash: string): Promise<number | null>;
/**
 * Check if a transaction has been confirmed with at least N confirmations
 *
 * @param tw - TronWeb instance
 * @param txHash - Transaction hash
 * @param requiredConfirmations - Number of required confirmations (default: 19)
 * @returns true if confirmed, false otherwise
 */
declare function isTransactionConfirmed(tw: TronWebLike, txHash: string, requiredConfirmations?: number): Promise<boolean>;

interface TypedDataDomain {
    name?: string;
    version?: string;
    chainId?: number | bigint;
    verifyingContract?: string;
    salt?: string;
}
interface TypedDataField {
    name: string;
    type: string;
}
interface TypedData {
    domain: TypedDataDomain;
    types: Record<string, TypedDataField[]>;
    primaryType: string;
    message: Record<string, any>;
}
/**
 * Create the final EIP-712 digest to sign
 */
declare function createEIP712Digest(typedData: TypedData): string;
/**
 * Parse and validate typed data
 */
declare function parseTypedData(data: string | object): TypedData;
/**
 * Format Safe transaction for EIP-712
 */
declare function formatSafeTransaction(safeTx: any): TypedData;

/**
 * Signature mode for validation
 */
type SignatureMode = 'tron' | 'ethereum';
/**
 * Result of signature validation
 */
interface SignatureValidationResult {
    /** Whether the signature is valid */
    valid: boolean;
    /** The recovered signer address (Ethereum format 0x...) */
    recoveredAddress?: string;
    /** Error message if validation failed */
    error?: string;
    /** Detailed hints for debugging */
    hints?: string[];
    /** The mode that was used for validation */
    mode: SignatureMode;
}
/**
 * Validate a signature against a message and expected signer
 *
 * This is essential for debugging Safe contract signature issues. It helps identify:
 * - Wrong signature mode (Tron vs Ethereum prefix)
 * - Incorrect private key used
 * - Message hash mismatches
 *
 * @param tw - TronWeb instance
 * @param message - The message that was signed (string or Buffer)
 * @param signature - The signature to validate (0x-prefixed hex)
 * @param expectedSigner - The expected signer address (Ethereum or Tron format)
 * @param mode - Signature mode: 'tron' or 'ethereum'
 * @returns Validation result with detailed error information
 *
 * @example
 * ```typescript
 * const result = await validateSignature(
 *   tw,
 *   'Hello World',
 *   '0xabcd...signature',
 *   '0x1234...address',
 *   'ethereum'
 * );
 *
 * if (!result.valid) {
 *   console.error(`Signature validation failed: ${result.error}`);
 *   console.log('Hints:', result.hints);
 * }
 * ```
 */
declare function validateSignature(tw: TronWebLike, message: string | Buffer, signature: string, expectedSigner: string, mode?: SignatureMode): Promise<SignatureValidationResult>;
/**
 * Validate an EIP-712 typed data signature
 *
 * Used for Safe transaction signatures and other structured data
 *
 * @param tw - TronWeb instance
 * @param typedData - The EIP-712 typed data that was signed
 * @param signature - The signature to validate
 * @param expectedSigner - The expected signer address
 * @param mode - Signature mode
 * @returns Validation result
 */
declare function validateTypedDataSignature(tw: TronWebLike, typedData: TypedData | string, signature: string, expectedSigner: string, mode?: SignatureMode): Promise<SignatureValidationResult>;
/**
 * Validate a signature in both Tron and Ethereum modes
 *
 * Useful when you're not sure which mode the Safe contract expects.
 * Returns results for both modes so you can see which one would work.
 *
 * @param tw - TronWeb instance
 * @param message - Message or typed data
 * @param signature - Signature to validate
 * @param expectedSigner - Expected signer address
 * @returns Validation results for both modes
 */
declare function validateSignatureBothModes(tw: TronWebLike, message: string | Buffer, signature: string, expectedSigner: string): Promise<{
    tron: SignatureValidationResult;
    ethereum: SignatureValidationResult;
    recommendation: string;
}>;
/**
 * Create a test signature for debugging purposes
 *
 * Useful for generating known-good signatures to compare against
 *
 * @param tw - TronWeb instance with private key configured
 * @param message - Message to sign
 * @param mode - Signature mode
 * @returns Signature in hex format
 */
declare function createTestSignature(tw: TronWebLike, message: string | Buffer, mode?: SignatureMode): Promise<string>;
/**
 * Format validation result for console output
 *
 * @param result - Validation result
 * @returns Formatted string for console.log
 */
declare function formatValidationResult(result: SignatureValidationResult): string;

/**
 * Safe (Gnosis Safe) contract events registry
 *
 * These event signatures are used to detect and parse Safe contract events.
 * Event topics[0] is the keccak256 hash of the event signature.
 */
declare const SAFE_EVENTS: {
    readonly ExecutionSuccess: {
        readonly signature: "ExecutionSuccess(bytes32,uint256)";
        readonly topic: "0x442e715f626346e8c54381002da614f62bee8d27386535b2521ec8540898556e";
        readonly decode: (log: any) => {
            txHash: any;
            payment: number;
        };
    };
    readonly ExecutionFailure: {
        readonly signature: "ExecutionFailure(bytes32,uint256)";
        readonly topic: "0x23428b18acfb3ea64b08dc0c1d296ea9c09702c09083ca5272e64d115b687d23";
        readonly decode: (log: any) => {
            txHash: any;
            payment: number;
        };
    };
    readonly ApproveHash: {
        readonly signature: "ApproveHash(bytes32,address)";
        readonly topic: "0xf2a0eb156472d1440255b0d7c1e19cc07115d1051fe605b0dce69acfec884d9c";
        readonly decode: (log: any) => {
            approvedHash: any;
            owner: any;
        };
    };
    readonly SignMsg: {
        readonly signature: "SignMsg(bytes32)";
        readonly topic: "0xe7f4675038f4f6034dfcbbb24c4dc08e4ebf10eb9d257d3d02c0f38d122ac6e4";
        readonly decode: (log: any) => {
            msgHash: any;
        };
    };
    readonly AddedOwner: {
        readonly signature: "AddedOwner(address)";
        readonly topic: "0x9465fa0c962cc76958e6373a993326400c1c94f8be2fe3a952adfa7f60b2ea26";
        readonly decode: (log: any) => {
            owner: any;
        };
    };
    readonly RemovedOwner: {
        readonly signature: "RemovedOwner(address)";
        readonly topic: "0xf8d49fc529812e9a7c5c50e69c20f0dccc0db8fa95c98bc58cc9a4f1c1299eaf";
        readonly decode: (log: any) => {
            owner: any;
        };
    };
    readonly ChangedThreshold: {
        readonly signature: "ChangedThreshold(uint256)";
        readonly topic: "0x610f7ff2b304ae8903c3de74c60c6ab1f7d6226b3f52c5161905bb5ad4039c93";
        readonly decode: (log: any) => {
            threshold: number;
        };
    };
    readonly EnabledModule: {
        readonly signature: "EnabledModule(address)";
        readonly topic: "0xecdf3a3effea5783a3c4c2140e677577666428d44ed9d474a0b3a4c9943f8440";
        readonly decode: (log: any) => {
            module: any;
        };
    };
    readonly DisabledModule: {
        readonly signature: "DisabledModule(address)";
        readonly topic: "0xaab4fa2b463f581b2b32cb3b7e3b704b9ce37cc209b5fb4d77e593ace4054276";
        readonly decode: (log: any) => {
            module: any;
        };
    };
    readonly ChangedFallbackHandler: {
        readonly signature: "ChangedFallbackHandler(address)";
        readonly topic: "0x5ac6c46c93c8d0e53714ba3b53db3e7c046da994313d7ed0d192028bc7c228b0";
        readonly decode: (log: any) => {
            handler: any;
        };
    };
    readonly ChangedGuard: {
        readonly signature: "ChangedGuard(address)";
        readonly topic: "0x1151116914515bc0891ff9047a6cb32cf902546f83066499bcf8ba33d2353fa2";
        readonly decode: (log: any) => {
            guard: any;
        };
    };
    readonly SafeSetup: {
        readonly signature: "SafeSetup(address,address[],uint256,address,address)";
        readonly topic: "0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8";
        readonly decode: (log: any) => {
            initiator: any;
        };
    };
    readonly SafeReceived: {
        readonly signature: "SafeReceived(address,uint256)";
        readonly topic: "0x3d0ce9bfc3ed7d6862dbb28b2dea94561fe714a1b4d019aa8af39730d1ad7c3d";
        readonly decode: (log: any) => {
            sender: any;
            value: number;
        };
    };
    readonly ExecutionFromModuleSuccess: {
        readonly signature: "ExecutionFromModuleSuccess(address)";
        readonly topic: "0x6895c13664aa4f67288b25d7a21d7aaa34916e355fb9b6fae0a139a9085becb8";
        readonly decode: (log: any) => {
            module: any;
        };
    };
    readonly ExecutionFromModuleFailure: {
        readonly signature: "ExecutionFromModuleFailure(address)";
        readonly topic: "0xacd2c8702804128fdb0db2bb49f6d127dd0181c13fd45dbfe16de0930e2bd375";
        readonly decode: (log: any) => {
            module: any;
        };
    };
};
/**
 * Safe event names for type safety
 */
type SafeEventName = keyof typeof SAFE_EVENTS;
/**
 * Parsed Safe event
 */
interface ParsedSafeEvent {
    eventName: SafeEventName;
    address: string;
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    data: any;
    confirmed: boolean;
    confirmations: number;
}
/**
 * Get all Safe event topics for filtering
 */
declare function getSafeEventTopics(): string[];
/**
 * Identify which Safe event a log represents
 */
declare function identifySafeEvent(log: any): SafeEventName | null;
/**
 * Parse a Safe event log into a structured format
 */
declare function parseSafeEvent(log: any, currentBlock: number): ParsedSafeEvent | null;
/**
 * Poll for new Safe events since last check
 *
 * Uses caching to avoid re-fetching old events. Only queries new blocks
 * since the last poll.
 *
 * @param tw - TronWeb instance
 * @param safeAddress - Safe contract address
 * @param options - Polling options
 * @returns Array of new Safe events
 */
declare function pollSafeEvents(tw: TronWebLike, safeAddress: string, options?: {
    fromBlock?: number;
    toBlock?: number | 'latest';
    eventNames?: SafeEventName[];
    includeUnconfirmed?: boolean;
}): Promise<ParsedSafeEvent[]>;
/**
 * Get the execution status of a Safe transaction
 *
 * @param tw - TronWeb instance
 * @param safeAddress - Safe contract address
 * @param safeTxHash - Safe transaction hash (bytes32)
 * @returns Execution status
 */
declare function getSafeTransactionStatus(tw: TronWebLike, safeAddress: string, safeTxHash: string): Promise<{
    executed: boolean;
    success?: boolean;
    blockNumber?: number;
    transactionHash?: string;
}>;
/**
 * Get all signatures for a Safe transaction
 *
 * @param tw - TronWeb instance
 * @param safeAddress - Safe contract address
 * @param safeTxHash - Safe transaction hash
 * @returns Array of owner addresses that have signed
 */
declare function getSafeTransactionSignatures(tw: TronWebLike, safeAddress: string, safeTxHash: string): Promise<string[]>;
/**
 * Clear event cache for a Safe (or all Safes)
 *
 * Use this when you want to re-fetch all historical events
 */
declare function clearSafeEventCache(safeAddress?: string): void;
/**
 * Compute Safe event topic from signature
 *
 * Useful for adding custom events not in the registry
 */
declare function computeEventTopic(signature: string): string;

/**
 * Tron Account Utilities
 *
 * Creates custom accounts that force viem to use eth_sendTransaction
 * instead of eth_sendRawTransaction, allowing the Tron transport to
 * intercept and handle signing with TronWeb.
 */

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
declare function createTronAccount(address: Address$1): Account;
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
declare function createTronAccountFromTronWeb(tw: TronWebLike): Account;
/**
 * Type guard to check if an account is a Tron JSON-RPC account
 *
 * @param account - Account to check
 * @returns True if account has type 'json-rpc'
 */
declare function isTronAccount(account: Account): boolean;

/**
 * Safe Protocol Kit Integration with viem-transport
 *
 * This module provides utilities to use Safe Protocol Kit with viem-transport,
 * enabling Safe multi-signature wallet operations on Tron blockchain.
 */

/**
 * Configuration for Safe deployment on Tron
 */
interface TronSafeConfig {
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
declare const TRON_NILE_SAFE_ADDRESSES: {
    safeSingletonAddress: string;
    safeProxyFactoryAddress: string;
    multiSendAddress: string;
    multiSendCallOnlyAddress: string;
    fallbackHandlerAddress: string;
    signMessageLibAddress: string;
    createCallAddress: string;
    simulateTxAccessorAddress: string;
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
declare function initSafeProtocolKit(config: TronSafeConfig, safeAddress?: string): Promise<Safe>;
/**
 * Optional Safe setup configuration
 */
interface SafeSetupOptions {
    to?: string;
    data?: string;
    fallbackHandler?: string;
    paymentToken?: string;
    payment?: number;
    paymentReceiver?: string;
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
declare function createPredictedSafe(tronWeb: TronWebLike, owners: string[], threshold: number, setupOptions?: SafeSetupOptions, safeDeploymentConfig?: SafeDeploymentConfig): PredictedSafeProps;
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
declare function deploySafeWithProtocolKit(config: TronSafeConfig, owners: string[], threshold: number, setupOptions?: SafeSetupOptions, saltNonce?: string): Promise<{
    protocolKit: Safe;
    safeAddress: string;
}>;
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
declare function connectToSafe(config: TronSafeConfig, safeAddress: string): Promise<Safe>;

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

interface SafeSetupConfig$1 {
    owners: string[];
    threshold: number;
    to?: string;
    data?: `0x${string}`;
    fallbackHandler?: string;
    paymentToken?: string;
    payment?: bigint;
    paymentReceiver?: string;
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
declare function predictSafeAddress(tronWeb: TronWebLike, factoryAddress: string, singletonAddress: string, setupConfig: SafeSetupConfig$1, saltNonce?: bigint): string;
/**
 * Extract salt nonce from a deployed Safe transaction
 * Useful for verifying predictions against actual deployments
 *
 * @param transactionData - Transaction calldata from createProxyWithNonce
 * @returns Salt nonce used in deployment
 */
declare function extractSaltNonceFromTransaction(transactionData: `0x${string}`): bigint;

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

interface SafeSetupConfig {
    owners: string[];
    threshold: number;
    to?: string;
    data?: Hex;
    fallbackHandler?: string;
    paymentToken?: string;
    payment?: bigint;
    paymentReceiver?: string;
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
declare function predictSafeAddressWithBytecode(tronWeb: TronWebLike, walletClient: WalletClient, factoryAddress: string, singletonAddress: string, setupConfig: SafeSetupConfig, saltNonce: bigint, options?: {
    useCache?: boolean;
}): Promise<string>;
/**
 * Clear the proxy code cache (useful for testing or if factory is upgraded)
 */
declare function clearProxyCodeCache(): void;

/**
 * Ethereum-Compatible Signing Utilities for TRON
 *
 * This module provides signing methods that produce signatures
 * compatible with Ethereum's ecrecover, enabling Safe and other
 * Ethereum-based contracts to work on TRON.
 */

/**
 * Ensures the signature is in Ethereum-compatible format
 * with v value as 27 or 28 (not 0 or 1), and applies optional offset.
 *
 * @param signature - Raw signature from TronWeb
 * @param vOffset - Optional offset to add to v value (default: 0)
 * @returns Formatted signature for Ethereum
 */
declare function ensureEthereumSignatureFormat(signature: string, vOffset?: number): string;
/**
 * Creates a message hash with Ethereum prefix
 * without actually signing it.
 *
 * @param message - Message to hash
 * @returns Ethereum-prefixed message hash
 */
declare function createEthereumMessageHash(message: string | Uint8Array): string;
/**
 * Configuration for signature compatibility mode
 */
interface SignatureCompatibilityConfig {
    /**
     * Whether to use Ethereum-compatible signing for all messages
     * Default: false (use native Tron signing for Tron-adapted contracts)
     */
    useEthereumPrefix: boolean;
    /**
     * Whether to automatically adjust v values
     * Default: true
     */
    adjustVValue: boolean;
    /**
     * Offset to add to v value (e.g., 4 for Tron Safe compressed keys)
     * Default: 0
     */
    vValueOffset: number;
    /**
     * Whether to support dual verification (try both TRON and Ethereum prefixes)
     * Default: false (for performance)
     */
    supportDualVerification: boolean;
}
/**
 * Default configuration for Tron-native contracts
 */
declare const DEFAULT_COMPATIBILITY_CONFIG: SignatureCompatibilityConfig;
/**
 * Enhanced signing method selector based on configuration
 */
declare function signMessageWithConfig(tw: TronWebLike, message: string | Uint8Array, config?: SignatureCompatibilityConfig): Promise<string>;
/**
 * Verifies if a signature will be compatible with Ethereum's ecrecover
 *
 * @param signature - Signature to check
 * @returns Whether the signature format is compatible
 */
declare function isEthereumCompatibleSignature(signature: string): boolean;
/**
 * Helper to extract signature components
 */
declare function extractSignatureComponents(signature: string): {
    r: string;
    s: string;
    v: number;
};

declare function toSun(value: unknown, label: string): number;
declare function toBigIntLike(value: unknown): bigint;
declare function toOptionalNumber(value: unknown): number | undefined;

declare function isTronBase58(value: string): boolean;

declare function extractTronErrorMessage(value: unknown): string | null;
declare function decodeTronMessage(message: string): string;

declare function extractInputData(_tw: TronWebLike, tx: TronTransaction): string | null;
declare function extractFromAddress(tw: TronWebLike, tx: TronTransaction): Address | null;
declare function extractToAddress(tw: TronWebLike, tx: TronTransaction): Address | null;
declare function extractValue(_tw: TronWebLike, tx: TronTransaction): number;
declare function normalizeReceipt(tw: TronWebLike, info: TronTransactionInfo): {
    blockHash: null;
    blockNumber: `0x${string}` | null;
    contractAddress: `0x${string}` | null;
    cumulativeGasUsed: `0x${string}`;
    effectiveGasPrice: string;
    from: null;
    gasUsed: `0x${string}`;
    logs: {
        address: `0x${string}`;
        blockHash: null;
        blockNumber: `0x${string}` | null;
        data: `0x${string}`;
        logIndex: `0x${string}`;
        removed: boolean;
        topics: `0x${string}`[];
        transactionHash: `0x${string}` | null;
        transactionIndex: string;
    }[];
    logsBloom: string;
    status: string;
    to: null;
    transactionHash: `0x${string}` | null;
    transactionIndex: string;
    type: string;
};

/**
 * Creates a Viem transport backed by a TronWeb instance.
 *
 * This modular implementation breaks down the original monolithic file into:
 * - types/ - All TypeScript interfaces and type definitions
 * - constants.ts - Shared constants
 * - utils/ - Utility functions for addresses, hex, validation, etc.
 * - abi/ - ABI parsing and function registry
 * - methods/ - RPC method handlers organized by domain
 *
 * @example
 * ```ts
 * import TronWeb from 'tronweb';
 * import { createWalletClient } from 'viem';
 * import { tronWeb } from '@/tronWeb';
 *
 * const tw = new TronWeb({
 *   fullHost: 'https://api.trongrid.io',
 *   privateKey: process.env.PRIVATE_KEY
 * });
 *
 * const client = createWalletClient({
 *   transport: tronWeb(tw)
 * });
 * ```
 */
declare function tronWeb(tw: TronWebLike, cfg?: TronWebTransportConfig): TronWebTransport;

export { BASE58_REGEX, ConfirmationTimeoutError, DEFAULT_COMPATIBILITY_CONFIG, DEFAULT_FEE_LIMIT, type ParsedSafeEvent, SAFE_EVENTS, type SafeEventName, type SafeSetupConfig$1 as SafeSetupConfig, type SafeSetupOptions, type SignatureCompatibilityConfig, type SignatureMode, type SignatureValidationResult, TRON_HEX_PREFIX, TRON_NILE_SAFE_ADDRESSES, TransactionNotFoundError, type TransactionReceipt, TransactionRevertedError, type TronSafeConfig, type TronWebLike, type TronWebSigner, type TronWebSignerContext, type TronWebTransport, type TronWebTransportConfig, type TypedData, type TypedDataDomain, type TypedDataField, type WaitForReceiptOptions, ZERO_ADDRESS, clearProxyCodeCache, clearSafeEventCache, computeEventTopic, connectToSafe, createEIP712Digest, createEthereumMessageHash, createPredictedSafe, createTestSignature, createTronAccount, createTronAccountFromTronWeb, decodeTronMessage, deploySafeWithProtocolKit, ensureEthereumSignatureFormat, extractFromAddress, extractInputData, extractSaltNonceFromTransaction, extractSignatureComponents, extractToAddress, extractTronErrorMessage, extractValue, formatSafeTransaction, formatValidationResult, getSafeEventTopics, getSafeTransactionSignatures, getSafeTransactionStatus, getTransactionConfirmations, identifySafeEvent, initSafeProtocolKit, isEthereumCompatibleSignature, isTransactionConfirmed, isTronAccount, isTronBase58, normalizeHex, normalizeReceipt, parseSafeEvent, parseTypedData, pollSafeEvents, predictSafeAddress, predictSafeAddressWithBytecode, signMessageWithConfig, strip0x, to0x, toBigIntLike, toOptionalNumber, toSun, tronAddressTo0x, tronBase58FromEvm, tronBase58ToHex41, tronHex41To0x, tronWeb, validateSignature, validateSignatureBothModes, validateTypedDataSignature, waitForTransactionReceipt };

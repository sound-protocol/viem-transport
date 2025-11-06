export interface TronBlock {
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

export interface TronTransaction {
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

export interface TronTransactionInfo {
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

export interface ErrorResponse {
  result?: { message?: string };
  message?: string;
  Error?: string;
  code?: string;
  transaction?: {
    ret?: Array<{
      ret_message?: string;
      retMsg?: string;
      ret_msg?: string;
      message?: string;
    }>;
  };
}

export interface TronEvent {
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

export type TronWebLike = {
  trx: {
    getCurrentBlock(): Promise<TronBlock>;
    getBlock(id: string | number): Promise<TronBlock>;
    getBalance(address: string): Promise<number>;
    getTransactionInfo(txid: string): Promise<TronTransactionInfo>;
    getTransaction(txid: string): Promise<TronTransaction>;
    getAccount(address: string): Promise<{ transactions?: unknown[] }>;
    getContract(address: string): Promise<{ bytecode?: string; code_hash?: string; abi?: { entrys: any[] } }>;
    getChainParameters(): Promise<Array<{ key: string; value: number }>>;
    sendRawTransaction(raw: string | TronTransaction): Promise<{ txid?: string; result?: boolean; transaction?: { txID: string } }>;
    sign(data: unknown): Promise<string>;
    signMessageV2(message: Buffer | Uint8Array): Promise<string>;
    verifyMessage(message: Buffer | string, signature: string): Promise<string>;
  };
  transactionBuilder: {
    triggerConstantContract(
      contractAddress: string,
      functionSelector: string,
      options: Record<string, unknown>,
      parameters: unknown[],
      issuerAddress: string
    ): Promise<{
      result?: { result?: boolean };
      constant_result?: string[];
      energy_used?: number;
    }>;
    triggerSmartContract(
      contractAddress: string,
      functionSelector: string,
      options: Record<string, unknown>,
      parameters: unknown[],
      issuerAddress: string
    ): Promise<{
      transaction?: TronTransaction;
      result?: { result?: boolean };
    }>;
    sendTrx(
      toAddress: string,
      amount: number,
      fromAddress: string,
      options?: Record<string, unknown>
    ): Promise<TronTransaction>;
  };
  address: { fromHex(hex: string): string; toHex(base58: string): string };
  utils: {
    code: {
      generateHashedMessage(message: Buffer | string): string;
    };
  };
  event: {
    getEventsByContractAddress(
      address: string,
      options: Record<string, unknown>
    ): Promise<TronEvent[]>;
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

export type Address = `0x${string}`;

export type { TronWebTransport } from "./config";

export interface FunctionInfo {
  signature: string;
  params: string[];
}

export interface ParsedParam {
  type: string;
  value: any;
}

export interface ParsedCallData {
  functionInfo: FunctionInfo;
  params: ParsedParam[];
}

export type ResolveAddressContext = {
  method: string;
  property: string;
  allowZeroFallback: boolean;
};
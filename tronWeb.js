"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tronWeb = tronWeb;
var viem_1 = require("viem");
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var TRON_HEX_PREFIX = "41";
var BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;
var DEFAULT_FEE_LIMIT = 15000000;
/**
 * @description Creates a transport backed by a TronWeb instance.
 * Note: Only a subset of Ethereum JSON-RPC methods are currently supported.
 */
function tronWeb(tw, cfg) {
    if (cfg === void 0) { cfg = {}; }
    var _a = cfg.key, key = _a === void 0 ? "tronWeb" : _a, _b = cfg.name, name = _b === void 0 ? "TronWeb" : _b, methods = cfg.methods, retryDelay = cfg.retryDelay, timeout = cfg.timeout;
    return function (_a) {
        var _b;
        var chain = _a.chain, defaultRetryCount = _a.retryCount;
        return (0, viem_1.createTransport)({
            key: key,
            methods: methods,
            name: name,
            request: buildEip1193Request(tw, {
                chainId: cfg.chainId,
                chain: chain,
                config: cfg,
            }),
            retryCount: (_b = cfg.retryCount) !== null && _b !== void 0 ? _b : defaultRetryCount,
            retryDelay: retryDelay,
            timeout: timeout,
            type: "tronWeb",
        }, { tronWeb: tw });
    };
}
function buildEip1193Request(tw, opts) {
    var _this = this;
    var config = opts.config;
    var getChainIdHex = function () {
        var _a;
        if (typeof opts.chainId === "string")
            return opts.chainId;
        if (typeof opts.chainId === "number")
            return toHex(opts.chainId);
        if (((_a = opts.chain) === null || _a === void 0 ? void 0 : _a.id) != null)
            return toHex(opts.chain.id);
        throw new Error("eth_chainId not configured for Tron transport");
    };
    var req = function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
        var p, _c, block, n, address0x, tronAddress, balanceSun, raw, res, txid, txid, info, tag, includeTxs, block_1, n, block, id, block, address0x, tronAddress, blockTag, contract, error_1, address0x, blockTag, tronAddress, account, txCount, currentBlock, blockNumber, pseudoNonce, _d, currentBlock, blockNumber, _e, txid, tx, info, from, to, value, input, error_2, addresses, addr, candidates, _i, candidates_1, candidate, addr, chainId, filter, fromBlock, toBlock, addresses, topics, fromBlockNum, toBlockNum, logs, _f, addresses_1, addr, address0x, tronAddr, options, events, _g, events_1, event_1, log, _h, txRequest, fromAddress, toAddress, result, estimatedGas_1, _j, dataBytes, estimatedGas, dataBytes, deploymentGas, chainParams, energyParam, energyPrice, _k, address0x, message, tronAddress, signature, error_3, msg, blockCount, newestBlock, rewardPercentiles, endBlockNumber, block, startBlockNumber, energyPrice, chainParams, energyParam, _l, baseFeePerGas, gasUsedRatio, reward, i, response;
        var _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13;
        var method = _b.method, params = _b.params;
        return __generator(this, function (_14) {
            switch (_14.label) {
                case 0:
                    p = Array.isArray(params) ? params : params ? [params] : [];
                    _c = method;
                    switch (_c) {
                        case "eth_chainId": return [3 /*break*/, 1];
                        case "eth_blockNumber": return [3 /*break*/, 2];
                        case "eth_getBalance": return [3 /*break*/, 4];
                        case "eth_call": return [3 /*break*/, 6];
                        case "eth_sendTransaction": return [3 /*break*/, 7];
                        case "eth_sendRawTransaction": return [3 /*break*/, 8];
                        case "eth_getTransactionReceipt": return [3 /*break*/, 10];
                        case "eth_getBlockByNumber": return [3 /*break*/, 12];
                        case "eth_getBlockByHash": return [3 /*break*/, 16];
                        case "eth_getCode": return [3 /*break*/, 18];
                        case "eth_getTransactionCount": return [3 /*break*/, 22];
                        case "eth_getTransaction": return [3 /*break*/, 31];
                        case "eth_getTransactionByHash": return [3 /*break*/, 31];
                        case "eth_accounts": return [3 /*break*/, 36];
                        case "net_version": return [3 /*break*/, 37];
                        case "eth_getLogs": return [3 /*break*/, 38];
                        case "eth_estimateGas": return [3 /*break*/, 47];
                        case "eth_getStorageAt": return [3 /*break*/, 53];
                        case "eth_gasPrice": return [3 /*break*/, 54];
                        case "eth_sign": return [3 /*break*/, 57];
                        case "eth_maxPriorityFeePerGas": return [3 /*break*/, 61];
                        case "eth_feeHistory": return [3 /*break*/, 62];
                        case "eth_newFilter": return [3 /*break*/, 70];
                        case "eth_getFilterChanges": return [3 /*break*/, 70];
                        case "eth_getFilterLogs": return [3 /*break*/, 70];
                        case "eth_uninstallFilter": return [3 /*break*/, 70];
                    }
                    return [3 /*break*/, 71];
                case 1: return [2 /*return*/, getChainIdHex()];
                case 2: return [4 /*yield*/, tw.trx.getCurrentBlock()];
                case 3:
                    block = _14.sent();
                    n = (_p = (_o = (_m = block === null || block === void 0 ? void 0 : block.block_header) === null || _m === void 0 ? void 0 : _m.raw_data) === null || _o === void 0 ? void 0 : _o.number) !== null && _p !== void 0 ? _p : (_q = block === null || block === void 0 ? void 0 : block.block_header) === null || _q === void 0 ? void 0 : _q.number;
                    return [2 /*return*/, toHex(n !== null && n !== void 0 ? n : 0)];
                case 4:
                    address0x = assertAddress(tw, p[0], { method: method, parameter: 0 });
                    p[0] = address0x;
                    tronAddress = tronBase58FromEvm(tw, address0x);
                    return [4 /*yield*/, tw.trx.getBalance(tronAddress)];
                case 5:
                    balanceSun = _14.sent();
                    return [2 /*return*/, toHex(balanceSun !== null && balanceSun !== void 0 ? balanceSun : 0)];
                case 6: return [2 /*return*/, handleEthCall(tw, config, p[0], p[1])];
                case 7: return [2 /*return*/, handleEthSendTransaction(tw, config, p[0], {
                        method: method,
                        params: p,
                    })];
                case 8:
                    raw = strip0x(p[0]);
                    return [4 /*yield*/, tw.trx.sendRawTransaction(raw)];
                case 9:
                    res = _14.sent();
                    txid = (_r = res === null || res === void 0 ? void 0 : res.txid) !== null && _r !== void 0 ? _r : (_s = res === null || res === void 0 ? void 0 : res.transaction) === null || _s === void 0 ? void 0 : _s.txID;
                    if (!txid)
                        throw new Error("sendRawTransaction: unexpected response");
                    return [2 /*return*/, to0x(txid)];
                case 10:
                    txid = strip0x(p[0]);
                    return [4 /*yield*/, tw.trx.getTransactionInfo(txid)];
                case 11:
                    info = _14.sent();
                    return [2 /*return*/, info ? normalizeReceipt(tw, info) : null];
                case 12:
                    tag = p[0];
                    includeTxs = !!p[1];
                    if (!(tag === "latest" || tag == null)) return [3 /*break*/, 14];
                    return [4 /*yield*/, tw.trx.getCurrentBlock()];
                case 13:
                    block_1 = _14.sent();
                    return [2 /*return*/, normalizeBlock(tw, block_1, includeTxs)];
                case 14:
                    n = typeof tag === "string" && tag.startsWith("0x")
                        ? Number(BigInt(tag))
                        : Number(tag);
                    return [4 /*yield*/, tw.trx.getBlock(n)];
                case 15:
                    block = _14.sent();
                    return [2 /*return*/, normalizeBlock(tw, block, includeTxs)];
                case 16:
                    id = strip0x(p[0]);
                    return [4 /*yield*/, tw.trx.getBlock(id).catch(function () { return null; })];
                case 17:
                    block = _14.sent();
                    return [2 /*return*/, block ? normalizeBlock(tw, block, !!p[1]) : null];
                case 18:
                    address0x = assertAddress(tw, p[0], { method: method, parameter: 0 });
                    tronAddress = tronBase58FromEvm(tw, address0x);
                    blockTag = (_t = p[1]) !== null && _t !== void 0 ? _t : "latest";
                    _14.label = 19;
                case 19:
                    _14.trys.push([19, 21, , 22]);
                    return [4 /*yield*/, tw.trx.getContract(tronAddress)];
                case 20:
                    contract = _14.sent();
                    if (!contract || !contract.bytecode) {
                        // Not a contract address, return empty
                        return [2 /*return*/, "0x"];
                    }
                    // Return the contract bytecode
                    return [2 /*return*/, to0x(contract.bytecode)];
                case 21:
                    error_1 = _14.sent();
                    // If error fetching contract, assume it's not a contract
                    return [2 /*return*/, "0x"];
                case 22:
                    address0x = assertAddress(tw, p[0], { method: method, parameter: 0 });
                    blockTag = (_u = p[1]) !== null && _u !== void 0 ? _u : "latest";
                    tronAddress = tronBase58FromEvm(tw, address0x);
                    _14.label = 23;
                case 23:
                    _14.trys.push([23, 26, , 31]);
                    return [4 /*yield*/, tw.trx.getAccount(tronAddress)];
                case 24:
                    account = _14.sent();
                    txCount = (_w = (_v = account === null || account === void 0 ? void 0 : account.transactions) === null || _v === void 0 ? void 0 : _v.length) !== null && _w !== void 0 ? _w : 0;
                    return [4 /*yield*/, tw.trx.getCurrentBlock()];
                case 25:
                    currentBlock = _14.sent();
                    blockNumber = (_z = (_y = (_x = currentBlock === null || currentBlock === void 0 ? void 0 : currentBlock.block_header) === null || _x === void 0 ? void 0 : _x.raw_data) === null || _y === void 0 ? void 0 : _y.number) !== null && _z !== void 0 ? _z : 0;
                    pseudoNonce = (txCount * 1000000) + (blockNumber % 1000000);
                    return [2 /*return*/, toHex(pseudoNonce)];
                case 26:
                    _d = _14.sent();
                    _14.label = 27;
                case 27:
                    _14.trys.push([27, 29, , 30]);
                    return [4 /*yield*/, tw.trx.getCurrentBlock()];
                case 28:
                    currentBlock = _14.sent();
                    blockNumber = (_2 = (_1 = (_0 = currentBlock === null || currentBlock === void 0 ? void 0 : currentBlock.block_header) === null || _0 === void 0 ? void 0 : _0.raw_data) === null || _1 === void 0 ? void 0 : _1.number) !== null && _2 !== void 0 ? _2 : 0;
                    return [2 /*return*/, toHex(blockNumber)];
                case 29:
                    _e = _14.sent();
                    return [2 /*return*/, "0x0"];
                case 30: return [3 /*break*/, 31];
                case 31:
                    txid = strip0x(p[0]);
                    if (!txid) {
                        return [2 /*return*/, null];
                    }
                    _14.label = 32;
                case 32:
                    _14.trys.push([32, 35, , 36]);
                    return [4 /*yield*/, tw.trx.getTransaction(txid)];
                case 33:
                    tx = _14.sent();
                    if (!tx)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, tw.trx.getTransactionInfo(txid)];
                case 34:
                    info = _14.sent();
                    from = extractFromAddress(tw, tx);
                    to = extractToAddress(tw, tx);
                    value = extractValue(tw, tx);
                    input = extractInputData(tw, tx);
                    // Convert to Ethereum transaction format
                    return [2 /*return*/, {
                            blockHash: (info === null || info === void 0 ? void 0 : info.blockHash) ? to0x(info.blockHash) : null,
                            blockNumber: (info === null || info === void 0 ? void 0 : info.blockNumber) != null ? toHex(info.blockNumber) : null,
                            from: from !== null && from !== void 0 ? from : ZERO_ADDRESS,
                            gas: toHex((_4 = (_3 = tx.raw_data) === null || _3 === void 0 ? void 0 : _3.fee_limit) !== null && _4 !== void 0 ? _4 : DEFAULT_FEE_LIMIT),
                            gasPrice: toHex(1), // Tron doesn't use gas price in the same way
                            hash: to0x(txid),
                            input: input !== null && input !== void 0 ? input : "0x",
                            nonce: toHex(0), // Tron doesn't use nonces
                            to: to,
                            transactionIndex: (info === null || info === void 0 ? void 0 : info.transactionIndex) != null ? toHex(info.transactionIndex) : "0x0",
                            value: toHex(value),
                            v: "0x0", // Signature values not directly available
                            r: "0x0",
                            s: "0x0",
                            type: "0x0", // Legacy transaction type
                            accessList: [],
                            chainId: getChainIdHex()
                        }];
                case 35:
                    error_2 = _14.sent();
                    return [2 /*return*/, null];
                case 36:
                    {
                        addresses = [];
                        // Check configured default address
                        if (config === null || config === void 0 ? void 0 : config.defaultFrom) {
                            addr = toCanonicalAddress(tw, config.defaultFrom);
                            if (addr)
                                addresses.push(addr);
                        }
                        candidates = getTronDefaultAddressCandidates(tw);
                        for (_i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                            candidate = candidates_1[_i];
                            addr = toCanonicalAddress(tw, candidate);
                            if (addr && !addresses.includes(addr)) {
                                addresses.push(addr);
                            }
                        }
                        return [2 /*return*/, addresses];
                    }
                    _14.label = 37;
                case 37:
                    {
                        chainId = getChainIdHex();
                        return [2 /*return*/, String(parseInt(chainId, 16))];
                    }
                    _14.label = 38;
                case 38:
                    filter = p[0];
                    if (!filter) {
                        throw new Error("eth_getLogs requires a filter object");
                    }
                    fromBlock = (_5 = filter.fromBlock) !== null && _5 !== void 0 ? _5 : "latest";
                    toBlock = (_6 = filter.toBlock) !== null && _6 !== void 0 ? _6 : "latest";
                    addresses = Array.isArray(filter.address)
                        ? filter.address
                        : filter.address ? [filter.address] : [];
                    topics = (_7 = filter.topics) !== null && _7 !== void 0 ? _7 : [];
                    return [4 /*yield*/, resolveBlockNumber(tw, fromBlock)];
                case 39:
                    fromBlockNum = _14.sent();
                    return [4 /*yield*/, resolveBlockNumber(tw, toBlock)];
                case 40:
                    toBlockNum = _14.sent();
                    logs = [];
                    _f = 0, addresses_1 = addresses;
                    _14.label = 41;
                case 41:
                    if (!(_f < addresses_1.length)) return [3 /*break*/, 46];
                    addr = addresses_1[_f];
                    if (!addr)
                        return [3 /*break*/, 45];
                    address0x = assertAddress(tw, addr, {
                        method: method,
                        parameter: 0,
                        property: "filter.address"
                    });
                    tronAddr = tronBase58FromEvm(tw, address0x);
                    _14.label = 42;
                case 42:
                    _14.trys.push([42, 44, , 45]);
                    options = {
                        since: fromBlockNum,
                        to: toBlockNum,
                    };
                    // Add event name if specified
                    if (filter.eventName) {
                        options.eventName = filter.eventName;
                    }
                    return [4 /*yield*/, tw.event.getEventsByContractAddress(tronAddr, options)];
                case 43:
                    events = _14.sent();
                    // Convert Tron events to Ethereum log format
                    if (Array.isArray(events)) {
                        for (_g = 0, events_1 = events; _g < events_1.length; _g++) {
                            event_1 = events_1[_g];
                            log = {
                                address: (_8 = tronAddressTo0x(tw, event_1.contract)) !== null && _8 !== void 0 ? _8 : ZERO_ADDRESS,
                                topics: convertEventTopics(event_1),
                                data: event_1.data ? to0x(event_1.data) : "0x",
                                blockNumber: event_1.block != null ? toHex(event_1.block) : null,
                                blockHash: event_1.block_hash ? to0x(event_1.block_hash) : null,
                                transactionHash: event_1.transaction_id ? to0x(event_1.transaction_id) : null,
                                transactionIndex: toHex((_9 = event_1.transaction_index) !== null && _9 !== void 0 ? _9 : 0),
                                logIndex: toHex((_10 = event_1.log_index) !== null && _10 !== void 0 ? _10 : logs.length),
                                removed: false
                            };
                            // Filter by topics if specified
                            if (matchesTopicFilter(log.topics, topics)) {
                                logs.push(log);
                            }
                        }
                    }
                    return [3 /*break*/, 45];
                case 44:
                    _h = _14.sent();
                    return [3 /*break*/, 45];
                case 45:
                    _f++;
                    return [3 /*break*/, 41];
                case 46: return [2 /*return*/, logs];
                case 47:
                    txRequest = p[0];
                    if (!txRequest) {
                        throw new Error("eth_estimateGas requires a transaction object");
                    }
                    fromAddress = resolveFromAddress(tw, config, txRequest.from, {
                        method: "eth_estimateGas",
                        property: "transaction.from",
                        allowZeroFallback: true,
                    });
                    // Handle simple TRX transfers
                    if (!txRequest.data || strip0x(txRequest.data).length === 0) {
                        // Standard transfer uses ~265 bandwidth
                        // Map to standard Ethereum transfer gas for compatibility
                        return [2 /*return*/, toHex(21000)];
                    }
                    if (!txRequest.to) return [3 /*break*/, 52];
                    toAddress = assertAddress(tw, txRequest.to, {
                        method: method,
                        parameter: 0,
                        property: "transaction.to"
                    });
                    _14.label = 48;
                case 48:
                    _14.trys.push([48, 50, , 51]);
                    return [4 /*yield*/, tw.transactionBuilder.triggerConstantContract(tronBase58FromEvm(tw, toAddress), "", {
                            feeLimit: 150000000, // High limit for estimation
                            input: strip0x(txRequest.data),
                            callValue: toSun(txRequest.value, "transaction.value")
                        }, [], fromAddress.base58)];
                case 49:
                    result = _14.sent();
                    if (result === null || result === void 0 ? void 0 : result.energy_used) {
                        estimatedGas_1 = 30000 + result.energy_used;
                        return [2 /*return*/, toHex(estimatedGas_1)];
                    }
                    return [3 /*break*/, 51];
                case 50:
                    _j = _14.sent();
                    return [3 /*break*/, 51];
                case 51:
                    dataBytes = Math.max(0, (strip0x(txRequest.data).length) / 2);
                    estimatedGas = 30000 + (dataBytes * 68);
                    return [2 /*return*/, toHex(estimatedGas)];
                case 52:
                    // Contract deployment (no 'to' address)
                    if (txRequest.data && !txRequest.to) {
                        dataBytes = Math.max(0, (strip0x(txRequest.data).length) / 2);
                        deploymentGas = 500000 + (dataBytes * 68);
                        return [2 /*return*/, toHex(deploymentGas)];
                    }
                    // Default fallback
                    return [2 /*return*/, toHex(100000)];
                case 53:
                    {
                        // Validate the address parameter to ensure it's valid
                        assertAddress(tw, p[0], { method: method, parameter: 0 });
                        // Note: Tron doesn't provide direct storage slot access like Ethereum
                        // We validate the address but can't actually read storage slots
                        // Parameters p[1] (position) and p[2] (blockTag) would be used in Ethereum
                        // but are not applicable to Tron's architecture
                        // Always return 32 bytes of zeros as Tron has no storage slot access
                        return [2 /*return*/, "0x0000000000000000000000000000000000000000000000000000000000000000"];
                    }
                    _14.label = 54;
                case 54:
                    _14.trys.push([54, 56, , 57]);
                    return [4 /*yield*/, tw.trx.getChainParameters()];
                case 55:
                    chainParams = _14.sent();
                    energyParam = chainParams === null || chainParams === void 0 ? void 0 : chainParams.find(function (p) { return p.key === 'getEnergyFee'; });
                    energyPrice = (energyParam === null || energyParam === void 0 ? void 0 : energyParam.value) || 420;
                    // Return energy price as gas price (SUN maps to Wei)
                    return [2 /*return*/, toHex(energyPrice)];
                case 56:
                    _k = _14.sent();
                    // Default to 420 SUN per energy unit
                    return [2 /*return*/, toHex(420)];
                case 57:
                    address0x = assertAddress(tw, p[0], { method: method, parameter: 0 });
                    message = p[1];
                    if (!message) {
                        throw new Error("eth_sign requires a message to sign");
                    }
                    // Check if we have a signer configured
                    if (!((_11 = config === null || config === void 0 ? void 0 : config.sendOptions) === null || _11 === void 0 ? void 0 : _11.signer)) {
                        throw new Error("eth_sign requires a signer to be configured");
                    }
                    tronAddress = tronBase58FromEvm(tw, address0x);
                    _14.label = 58;
                case 58:
                    _14.trys.push([58, 60, , 61]);
                    return [4 /*yield*/, tw.trx.sign(message)];
                case 59:
                    signature = _14.sent();
                    return [2 /*return*/, to0x(signature)];
                case 60:
                    error_3 = _14.sent();
                    msg = error_3 instanceof Error ? error_3.message : String(error_3);
                    throw new Error("eth_sign failed: ".concat(msg));
                case 61:
                    {
                        // Tron doesn't have priority fees like Ethereum
                        // Return 0 to indicate no priority fee mechanism
                        return [2 /*return*/, "0x0"];
                    }
                    _14.label = 62;
                case 62:
                    blockCount = Number(p[0] || 1);
                    newestBlock = p[1] || "latest";
                    rewardPercentiles = p[2] || [];
                    endBlockNumber = void 0;
                    if (!(newestBlock === "latest" || newestBlock === "pending")) return [3 /*break*/, 64];
                    return [4 /*yield*/, tw.trx.getCurrentBlock()];
                case 63:
                    block = _14.sent();
                    endBlockNumber = ((_13 = (_12 = block === null || block === void 0 ? void 0 : block.block_header) === null || _12 === void 0 ? void 0 : _12.raw_data) === null || _13 === void 0 ? void 0 : _13.number) || 0;
                    return [3 /*break*/, 65];
                case 64:
                    endBlockNumber = typeof newestBlock === "string"
                        ? parseInt(newestBlock, 16)
                        : Number(newestBlock);
                    _14.label = 65;
                case 65:
                    startBlockNumber = Math.max(0, endBlockNumber - blockCount + 1);
                    energyPrice = 420;
                    _14.label = 66;
                case 66:
                    _14.trys.push([66, 68, , 69]);
                    return [4 /*yield*/, tw.trx.getChainParameters()];
                case 67:
                    chainParams = _14.sent();
                    energyParam = chainParams === null || chainParams === void 0 ? void 0 : chainParams.find(function (p) { return p.key === 'getEnergyFee'; });
                    if (energyParam === null || energyParam === void 0 ? void 0 : energyParam.value) {
                        energyPrice = energyParam.value;
                    }
                    return [3 /*break*/, 69];
                case 68:
                    _l = _14.sent();
                    return [3 /*break*/, 69];
                case 69:
                    baseFeePerGas = [];
                    gasUsedRatio = [];
                    reward = [];
                    for (i = 0; i < blockCount; i++) {
                        // Use current energy price as base fee for all blocks
                        baseFeePerGas.push(toHex(energyPrice));
                        // Tron doesn't have block gas limits, use a moderate ratio
                        gasUsedRatio.push(0.5);
                        // No priority fees in Tron
                        if (rewardPercentiles && rewardPercentiles.length > 0) {
                            reward.push(rewardPercentiles.map(function () { return "0x0"; }));
                        }
                    }
                    response = {
                        oldestBlock: toHex(startBlockNumber),
                        baseFeePerGas: baseFeePerGas,
                        gasUsedRatio: gasUsedRatio
                    };
                    if (reward.length > 0) {
                        response.reward = reward;
                    }
                    return [2 /*return*/, response];
                case 70: throw new Error("Method not supported by Tron transport: ".concat(method));
                case 71: throw new Error("Unknown method for Tron transport: ".concat(method));
            }
        });
    }); };
    return req;
}
/* Helpers */
function toHex(v) {
    var b = typeof v === "bigint" ? v : v == null ? BigInt(0) : BigInt(v);
    return "0x".concat(b.toString(16));
}
function to0x(hex) {
    return "0x".concat(strip0x(hex).toLowerCase());
}
function strip0x(hex) {
    if (typeof hex !== "string")
        return String(hex !== null && hex !== void 0 ? hex : "");
    var value = hex.trim();
    return value.startsWith("0x") || value.startsWith("0X")
        ? value.slice(2)
        : value;
}
function normalizeBlock(tw, block, includeTxs) {
    var _a, _b, _c, _d, _e, _f, _g;
    var raw = (_b = (_a = block === null || block === void 0 ? void 0 : block.block_header) === null || _a === void 0 ? void 0 : _a.raw_data) !== null && _b !== void 0 ? _b : {};
    var number = (_d = (_c = raw.number) !== null && _c !== void 0 ? _c : block === null || block === void 0 ? void 0 : block.number) !== null && _d !== void 0 ? _d : 0;
    var timestamp = (_f = (_e = raw.timestamp) !== null && _e !== void 0 ? _e : block === null || block === void 0 ? void 0 : block.timestamp) !== null && _f !== void 0 ? _f : 0;
    var hash = (block === null || block === void 0 ? void 0 : block.blockID) ? to0x(block.blockID) : null;
    var parentHash = (block === null || block === void 0 ? void 0 : block.parentID) ? to0x(block.parentID) : null;
    var txs = Array.isArray(block === null || block === void 0 ? void 0 : block.transactions) ? block.transactions : [];
    var transactions = includeTxs
        ? []
        : txs
            .map(function (tx) { return tx === null || tx === void 0 ? void 0 : tx.txID; })
            .filter(function (id) {
            return typeof id === "string" && id.length > 0;
        })
            .map(function (id) { return to0x(id); });
    return {
        baseFeePerGas: null,
        difficulty: "0x0",
        extraData: "0x",
        gasLimit: "0x0",
        gasUsed: "0x0",
        hash: hash,
        logsBloom: "0x",
        miner: (_g = tronAddressTo0x(tw, raw.witness_address)) !== null && _g !== void 0 ? _g : ZERO_ADDRESS,
        mixHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        nonce: "0x0000000000000000",
        number: toHex(number),
        parentHash: parentHash,
        receiptsRoot: "0x",
        sha3Uncles: "0x",
        size: "0x0",
        stateRoot: "0x",
        timestamp: toHex(timestamp),
        totalDifficulty: "0x0",
        transactions: transactions,
        transactionsRoot: "0x",
        uncles: [],
    };
}
function normalizeReceipt(tw, info) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var status = ((_b = (_a = info === null || info === void 0 ? void 0 : info.receipt) === null || _a === void 0 ? void 0 : _a.result) !== null && _b !== void 0 ? _b : info === null || info === void 0 ? void 0 : info.result) === "SUCCESS" ? "0x1" : "0x0";
    var logsArray = Array.isArray(info === null || info === void 0 ? void 0 : info.log) ? info.log : [];
    var logs = logsArray.map(function (l, i) {
        var _a;
        return ({
            address: (_a = tronAddressTo0x(tw, l.address)) !== null && _a !== void 0 ? _a : ZERO_ADDRESS,
            blockHash: null,
            blockNumber: info.blockNumber != null ? toHex(info.blockNumber) : null,
            data: typeof (l === null || l === void 0 ? void 0 : l.data) === "string" && l.data.length > 0 ? to0x(l.data) : "0x",
            logIndex: toHex(i),
            removed: false,
            topics: Array.isArray(l === null || l === void 0 ? void 0 : l.topics)
                ? l.topics
                    .filter(function (topic) { return typeof topic === "string"; })
                    .map(function (topic) { return to0x(topic); })
                : [],
            transactionHash: info.id ? to0x(info.id) : null,
            transactionIndex: "0x0",
        });
    });
    return {
        blockHash: null,
        blockNumber: info.blockNumber != null ? toHex(info.blockNumber) : null,
        contractAddress: tronAddressTo0x(tw, info.contract_address),
        cumulativeGasUsed: toHex((_e = (_d = (_c = info.receipt) === null || _c === void 0 ? void 0 : _c.energy_usage_total) !== null && _d !== void 0 ? _d : info.energy_usage_total) !== null && _e !== void 0 ? _e : 0),
        effectiveGasPrice: "0x0",
        from: null,
        gasUsed: toHex((_h = (_g = (_f = info.receipt) === null || _f === void 0 ? void 0 : _f.energy_usage) !== null && _g !== void 0 ? _g : info.energy_usage) !== null && _h !== void 0 ? _h : 0),
        logs: logs,
        logsBloom: "0x",
        status: status,
        to: null,
        transactionHash: info.id ? to0x(info.id) : null,
        transactionIndex: "0x0",
        type: "0x0",
    };
}
function handleEthCall(tw, config, callRequest, blockTag) {
    return __awaiter(this, void 0, void 0, function () {
        var toValue, toAddress, caller, contractBase58, feeLimit, callValueSun, dataHex, rawParameter, options, permissionId, issuerAddress, result, message, reason, constantResult;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!isPlainObject(callRequest))
                        throw new Error("eth_call param[0] must be an object.");
                    toValue = (_a = callRequest.to) !== null && _a !== void 0 ? _a : callRequest.contractAddress;
                    if (!toValue)
                        throw new Error("eth_call transaction.to is required on Tron transport.");
                    toAddress = assertAddress(tw, toValue, {
                        method: "eth_call",
                        parameter: 0,
                        property: "transaction.to",
                    });
                    if (blockTag != null && blockTag !== "latest" && blockTag !== "pending")
                        throw new Error("eth_call currently supports only latest or pending block tags on Tron transport.");
                    caller = resolveFromAddress(tw, config, callRequest.from, {
                        method: "eth_call",
                        property: "transaction.from",
                        allowZeroFallback: true,
                    });
                    contractBase58 = tronBase58FromEvm(tw, toAddress);
                    feeLimit = resolveFeeLimit((_b = config === null || config === void 0 ? void 0 : config.callOptions) === null || _b === void 0 ? void 0 : _b.feeLimit, DEFAULT_FEE_LIMIT, "callOptions.feeLimit");
                    callValueSun = toSun(callRequest.value, "transaction.value");
                    dataHex = normalizeHex((_c = callRequest.data) !== null && _c !== void 0 ? _c : callRequest.input);
                    rawParameter = strip0x(dataHex);
                    options = { feeLimit: feeLimit };
                    if (rawParameter.length > 0)
                        options.input = rawParameter;
                    if (callValueSun > 0)
                        options.callValue = callValueSun;
                    permissionId = toOptionalNumber(callRequest.permissionId);
                    if (permissionId != null)
                        options.permissionId = permissionId;
                    issuerAddress = caller.base58;
                    return [4 /*yield*/, tw.transactionBuilder.triggerConstantContract(contractBase58, "", options, [], issuerAddress)];
                case 1:
                    result = _e.sent();
                    if (!result)
                        return [2 /*return*/, "0x"];
                    if (((_d = result === null || result === void 0 ? void 0 : result.result) === null || _d === void 0 ? void 0 : _d.result) === false) {
                        message = extractTronErrorMessage(result);
                        reason = message !== null && message !== void 0 ? message : "execution reverted";
                        throw new Error("eth_call reverted: ".concat(reason));
                    }
                    constantResult = Array.isArray(result === null || result === void 0 ? void 0 : result.constant_result)
                        ? result.constant_result.find(function (item) { return typeof item === "string"; })
                        : undefined;
                    return [2 /*return*/, to0x(constantResult !== null && constantResult !== void 0 ? constantResult : "")];
            }
        });
    });
}
function handleEthSendTransaction(tw, config, txRequest, context) {
    return __awaiter(this, void 0, void 0, function () {
        var sender, feeLimit, valueSun, dataHex, hasData, permissionId, transaction, toValue, toAddress, contractBase58, options, rawParameter, trigger, message, reason, toAddress, recipientBase58, options, signedTx, preparedTx, broadcast, message, reason, txid;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!isPlainObject(txRequest))
                        throw new Error("eth_sendTransaction param[0] must be an object.");
                    sender = resolveFromAddress(tw, config, txRequest.from, {
                        method: "eth_sendTransaction",
                        property: "transaction.from",
                        allowZeroFallback: false,
                    });
                    feeLimit = resolveFeeLimit((_a = config === null || config === void 0 ? void 0 : config.sendOptions) === null || _a === void 0 ? void 0 : _a.feeLimit, DEFAULT_FEE_LIMIT, "sendOptions.feeLimit");
                    valueSun = toSun(txRequest.value, "transaction.value");
                    dataHex = normalizeHex((_b = txRequest.data) !== null && _b !== void 0 ? _b : txRequest.input);
                    hasData = strip0x(dataHex).length > 0;
                    permissionId = toOptionalNumber(txRequest.permissionId);
                    if (!hasData) return [3 /*break*/, 2];
                    toValue = txRequest.to;
                    if (!toValue)
                        throw new Error("eth_sendTransaction transaction.to is required for contract execution on Tron transport.");
                    toAddress = assertAddress(tw, toValue, {
                        method: "eth_sendTransaction",
                        parameter: 0,
                        property: "transaction.to",
                    });
                    contractBase58 = tronBase58FromEvm(tw, toAddress);
                    options = { feeLimit: feeLimit };
                    if (permissionId != null)
                        options.permissionId = permissionId;
                    if (valueSun > 0)
                        options.callValue = valueSun;
                    rawParameter = strip0x(dataHex);
                    if (rawParameter.length > 0)
                        options.rawParameter = rawParameter;
                    return [4 /*yield*/, tw.transactionBuilder.triggerSmartContract(contractBase58, "", options, [], sender.base58)];
                case 1:
                    trigger = _d.sent();
                    if (!(trigger === null || trigger === void 0 ? void 0 : trigger.transaction) || ((_c = trigger === null || trigger === void 0 ? void 0 : trigger.result) === null || _c === void 0 ? void 0 : _c.result) === false) {
                        message = extractTronErrorMessage(trigger);
                        reason = message !== null && message !== void 0 ? message : "failed to build Tron transaction";
                        throw new Error("eth_sendTransaction preparation failed: ".concat(reason));
                    }
                    transaction = trigger.transaction;
                    return [3 /*break*/, 4];
                case 2:
                    if (!txRequest.to)
                        throw new Error("eth_sendTransaction transaction.to is required for value transfers on Tron transport.");
                    if (valueSun <= 0)
                        throw new Error("eth_sendTransaction value must be greater than zero when no data payload is provided on Tron transport.");
                    toAddress = assertAddress(tw, txRequest.to, {
                        method: "eth_sendTransaction",
                        parameter: 0,
                        property: "transaction.to",
                    });
                    recipientBase58 = tronBase58FromEvm(tw, toAddress);
                    options = { feeLimit: feeLimit };
                    if (permissionId != null)
                        options.permissionId = permissionId;
                    return [4 /*yield*/, tw.transactionBuilder.sendTrx(recipientBase58, valueSun, sender.base58, options)];
                case 3:
                    transaction = _d.sent();
                    _d.label = 4;
                case 4: return [4 /*yield*/, signTransaction(tw, config, transaction, context)];
                case 5:
                    signedTx = _d.sent();
                    preparedTx = signedTx !== null && signedTx !== void 0 ? signedTx : transaction;
                    if (!preparedTx ||
                        !Array.isArray(preparedTx.signature) ||
                        preparedTx.signature.length === 0)
                        throw new Error("eth_sendTransaction signing failed: missing signature.");
                    return [4 /*yield*/, tw.trx.sendRawTransaction(preparedTx)];
                case 6:
                    broadcast = _d.sent();
                    if (!(broadcast === null || broadcast === void 0 ? void 0 : broadcast.result)) {
                        message = extractTronErrorMessage(broadcast);
                        reason = message !== null && message !== void 0 ? message : "broadcast rejected";
                        throw new Error("eth_sendTransaction broadcast failed: ".concat(reason));
                    }
                    txid = typeof broadcast.txid === "string" && broadcast.txid.length > 0
                        ? broadcast.txid
                        : typeof preparedTx.txID === "string" && preparedTx.txID.length > 0
                            ? preparedTx.txID
                            : typeof preparedTx.txId === "string" && preparedTx.txId.length > 0
                                ? preparedTx.txId
                                : undefined;
                    if (!txid)
                        throw new Error("eth_sendTransaction broadcast succeeded but no transaction id was returned.");
                    return [2 /*return*/, to0x(txid)];
            }
        });
    });
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function resolveFromAddress(tw, config, candidate, ctx) {
    var candidates = [];
    if (typeof candidate === "string" && candidate.trim().length > 0)
        candidates.push(candidate);
    if (candidate == null && typeof (config === null || config === void 0 ? void 0 : config.defaultFrom) === "string")
        candidates.push(config.defaultFrom);
    if (candidate == null)
        candidates.push.apply(candidates, getTronDefaultAddressCandidates(tw));
    for (var _i = 0, candidates_2 = candidates; _i < candidates_2.length; _i++) {
        var value = candidates_2[_i];
        var address = toCanonicalAddress(tw, value);
        if (address)
            return { evm: address, base58: tronBase58FromEvm(tw, address) };
    }
    if (ctx.allowZeroFallback) {
        var base58 = tronBase58FromEvm(tw, ZERO_ADDRESS);
        return { evm: ZERO_ADDRESS, base58: base58 };
    }
    throw new Error("".concat(ctx.method, " ").concat(ctx.property, " is required. Provide a valid address or configure defaultFrom on the TronWeb transport."));
}
function getTronDefaultAddressCandidates(tw) {
    var defaults = new Set();
    var address = tw.defaultAddress;
    if (address) {
        var maybe = [address.base58, address.b58, address.hex, address.hexString];
        for (var _i = 0, maybe_1 = maybe; _i < maybe_1.length; _i++) {
            var value = maybe_1[_i];
            if (typeof value === "string" && value.length > 0)
                defaults.add(value);
        }
    }
    return Array.from(defaults);
}
function resolveFeeLimit(provided, fallback, label) {
    var value = provided !== null && provided !== void 0 ? provided : fallback;
    if (!Number.isFinite(value) || value <= 0)
        throw new Error("Tron transport ".concat(label, " must be a positive number."));
    return Math.trunc(value);
}
function toSun(value, label) {
    var amount;
    try {
        amount = toBigIntLike(value);
    }
    catch (_a) {
        throw new Error("Tron transport ".concat(label, " must be a valid numeric value."));
    }
    if (amount < BigInt(0))
        throw new Error("Tron transport ".concat(label, " must be a non-negative integer."));
    if (amount === BigInt(0))
        return 0;
    if (amount > BigInt(Number.MAX_SAFE_INTEGER))
        throw new Error("Tron transport ".concat(label, " exceeds the max safe integer supported for Sun values."));
    return Number(amount);
}
function toBigIntLike(value) {
    if (value == null)
        return BigInt(0);
    if (typeof value === "bigint")
        return value;
    if (typeof value === "number") {
        if (!Number.isFinite(value))
            throw new Error("Value must be finite.");
        return BigInt(Math.trunc(value));
    }
    if (typeof value === "string") {
        var trimmed = value.trim();
        if (trimmed === "")
            return BigInt(0);
        var normalized = trimmed.startsWith("0x") || trimmed.startsWith("0X")
            ? "0x".concat(strip0x(trimmed))
            : trimmed;
        if (normalized === "0x")
            return BigInt(0);
        return BigInt(normalized);
    }
    throw new Error("Value must be bigint, number, or hex string.");
}
function normalizeHex(value) {
    if (typeof value !== "string")
        return "0x";
    var trimmed = value.trim();
    if (trimmed === "" || trimmed === "0x" || trimmed === "0X")
        return "0x";
    return "0x".concat(strip0x(trimmed));
}
function toOptionalNumber(value) {
    if (value == null)
        return undefined;
    var numeric = typeof value === "bigint" ? Number(value) : Number(value);
    if (!Number.isFinite(numeric))
        return undefined;
    var truncated = Math.trunc(numeric);
    if (truncated < 0)
        return undefined;
    return truncated;
}
function signTransaction(tw, config, transaction, context) {
    return __awaiter(this, void 0, void 0, function () {
        var signed, error_4, message;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    if (!((_a = config === null || config === void 0 ? void 0 : config.sendOptions) === null || _a === void 0 ? void 0 : _a.signer)) return [3 /*break*/, 2];
                    return [4 /*yield*/, config.sendOptions.signer(transaction, {
                            tronWeb: tw,
                            request: context,
                        })];
                case 1: return [2 /*return*/, _b.sent()];
                case 2: return [4 /*yield*/, tw.trx.sign(transaction)];
                case 3:
                    signed = _b.sent();
                    // TronWeb.trx.sign returns the signed transaction object when a private key is set
                    // If it returns a string, that's an error - the transaction wasn't signed properly
                    if (typeof signed === "string") {
                        throw new Error("Failed to sign transaction - ensure private key is configured");
                    }
                    return [2 /*return*/, signed];
                case 4:
                    error_4 = _b.sent();
                    message = error_4 instanceof Error ? error_4.message : String(error_4);
                    throw new Error("eth_sendTransaction signing failed: ".concat(message));
                case 5: return [2 /*return*/];
            }
        });
    });
}
function extractTronErrorMessage(value) {
    var _a, _b;
    if (!value)
        return null;
    var errorResp = value;
    var candidates = [
        (_a = errorResp.result) === null || _a === void 0 ? void 0 : _a.message,
        errorResp.message,
        errorResp.Error,
        errorResp.code,
    ];
    for (var _i = 0, candidates_3 = candidates; _i < candidates_3.length; _i++) {
        var item = candidates_3[_i];
        if (typeof item === "string" && item.length > 0)
            return decodeTronMessage(item);
    }
    var ret = Array.isArray((_b = errorResp.transaction) === null || _b === void 0 ? void 0 : _b.ret)
        ? errorResp.transaction.ret[0]
        : undefined;
    if (ret) {
        var retMessage = (typeof ret.ret_message === "string" && ret.ret_message) ||
            (typeof ret.retMsg === "string" && ret.retMsg) ||
            (typeof ret.ret_msg === "string" && ret.ret_msg) ||
            (typeof ret.message === "string" && ret.message);
        if (retMessage)
            return decodeTronMessage(retMessage);
    }
    return null;
}
function decodeTronMessage(message) {
    if (isLikelyBase64(message)) {
        var decoded = decodeBase64String(message);
        if (decoded && decoded.length > 0)
            return decoded;
    }
    return message;
}
function isLikelyBase64(value) {
    if (!value || value.length % 4 !== 0)
        return false;
    return /^[0-9A-Za-z+/=]+$/.test(value);
}
function decodeBase64String(value) {
    try {
        var globalObj = globalThis;
        if (globalObj === null || globalObj === void 0 ? void 0 : globalObj.atob)
            return globalObj.atob(value);
        if (globalObj === null || globalObj === void 0 ? void 0 : globalObj.Buffer)
            return globalObj.Buffer.from(value, "base64").toString("utf8");
    }
    catch (_a) { }
    return value;
}
function assertAddress(tw, value, ctx) {
    var _a;
    var address = toCanonicalAddress(tw, value);
    if (address)
        return address;
    var target = (_a = ctx.property) !== null && _a !== void 0 ? _a : "param[".concat(ctx.parameter, "]");
    throw new Error("".concat(ctx.method, " ").concat(target, " must be an address in 0x-prefixed 20-byte hex, Tron base58 (T...), or Tron 41-hex form. Received ").concat(formatParamValue(value), "."));
}
function tronBase58FromEvm(tw, address) {
    var hex41 = "".concat(TRON_HEX_PREFIX).concat(strip0x(address));
    try {
        var converted = tw.address.fromHex(hex41);
        if (!isTronBase58(converted))
            throw new Error("TronWeb returned an invalid base58 address");
        return converted;
    }
    catch (error) {
        var message = error instanceof Error ? error.message : String(error);
        throw new Error("Failed to convert ".concat(address, " to Tron base58: ").concat(message));
    }
}
function tronAddressTo0x(tw, value) {
    return toCanonicalAddress(tw, value);
}
function toCanonicalAddress(tw, value) {
    if (value == null)
        return null;
    if (typeof value !== "string")
        return null;
    var trimmed = value.trim();
    if (trimmed === "")
        return null;
    var hex = strip0x(trimmed);
    if (/^[0-9a-fA-F]{40}$/.test(hex))
        return "0x".concat(hex.toLowerCase());
    if (/^[0-9a-fA-F]{42}$/.test(hex) &&
        hex.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX)
        return "0x".concat(hex.slice(2).toLowerCase());
    if (isTronBase58(trimmed)) {
        var hex41 = tronBase58ToHex41(tw, trimmed);
        if (!hex41)
            return null;
        return tronHex41To0x(hex41);
    }
    return null;
}
function tronHex41To0x(value) {
    var hex = strip0x(value).toLowerCase();
    if (hex.length !== 42 || !hex.startsWith(TRON_HEX_PREFIX))
        return null;
    var body = hex.slice(2);
    if (!/^[0-9a-f]{40}$/.test(body))
        return null;
    return "0x".concat(body);
}
function tronBase58ToHex41(tw, value) {
    try {
        var hex = tw.address.toHex(value);
        var normalized = strip0x(hex);
        if (normalized.length === 42 &&
            normalized.slice(0, 2).toLowerCase() === TRON_HEX_PREFIX &&
            /^[0-9a-fA-F]+$/.test(normalized))
            return "0x".concat(normalized.toLowerCase());
    }
    catch (_a) {
        return null;
    }
    return null;
}
function formatParamValue(value) {
    if (typeof value === "string")
        return "'".concat(value, "'");
    if (value == null)
        return String(value);
    try {
        return JSON.stringify(value);
    }
    catch (_a) {
        return String(value);
    }
}
function isTronBase58(value) {
    if (!value || value[0] !== "T")
        return false;
    if (value.length < 34 || value.length > 36)
        return false;
    return BASE58_REGEX.test(value);
}
// Helper function to resolve block numbers from tags
function resolveBlockNumber(tw, blockTag) {
    return __awaiter(this, void 0, void 0, function () {
        var block;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    if (!(blockTag === "latest" || blockTag === "pending")) return [3 /*break*/, 2];
                    return [4 /*yield*/, tw.trx.getCurrentBlock()];
                case 1:
                    block = _f.sent();
                    return [2 /*return*/, (_e = (_c = (_b = (_a = block === null || block === void 0 ? void 0 : block.block_header) === null || _a === void 0 ? void 0 : _a.raw_data) === null || _b === void 0 ? void 0 : _b.number) !== null && _c !== void 0 ? _c : (_d = block === null || block === void 0 ? void 0 : block.block_header) === null || _d === void 0 ? void 0 : _d.number) !== null && _e !== void 0 ? _e : 0];
                case 2:
                    if (blockTag === "earliest") {
                        return [2 /*return*/, 0];
                    }
                    if (typeof blockTag === "string" && blockTag.startsWith("0x")) {
                        return [2 /*return*/, Number(BigInt(blockTag))];
                    }
                    return [2 /*return*/, Number(blockTag)];
            }
        });
    });
}
// Helper to extract transaction input data
function extractInputData(_tw, tx) {
    var _a, _b, _c;
    var contract = (_b = (_a = tx === null || tx === void 0 ? void 0 : tx.raw_data) === null || _a === void 0 ? void 0 : _a.contract) === null || _b === void 0 ? void 0 : _b[0];
    if (!contract)
        return null;
    var parameter = (_c = contract.parameter) === null || _c === void 0 ? void 0 : _c.value;
    if (parameter === null || parameter === void 0 ? void 0 : parameter.data) {
        return to0x(parameter.data);
    }
    return null;
}
// Helper to extract from address from transaction
function extractFromAddress(tw, tx) {
    var _a, _b, _c;
    var contract = (_b = (_a = tx === null || tx === void 0 ? void 0 : tx.raw_data) === null || _a === void 0 ? void 0 : _a.contract) === null || _b === void 0 ? void 0 : _b[0];
    if (!contract)
        return null;
    var parameter = (_c = contract.parameter) === null || _c === void 0 ? void 0 : _c.value;
    if (parameter === null || parameter === void 0 ? void 0 : parameter.owner_address) {
        return tronAddressTo0x(tw, parameter.owner_address);
    }
    return null;
}
// Helper to extract to address from transaction
function extractToAddress(tw, tx) {
    var _a, _b, _c;
    var contract = (_b = (_a = tx === null || tx === void 0 ? void 0 : tx.raw_data) === null || _a === void 0 ? void 0 : _a.contract) === null || _b === void 0 ? void 0 : _b[0];
    if (!contract)
        return null;
    var parameter = (_c = contract.parameter) === null || _c === void 0 ? void 0 : _c.value;
    if (parameter === null || parameter === void 0 ? void 0 : parameter.to_address) {
        return tronAddressTo0x(tw, parameter.to_address);
    }
    if (parameter === null || parameter === void 0 ? void 0 : parameter.contract_address) {
        return tronAddressTo0x(tw, parameter.contract_address);
    }
    return null;
}
// Helper to extract value from transaction
function extractValue(_tw, tx) {
    var _a, _b, _c;
    var contract = (_b = (_a = tx === null || tx === void 0 ? void 0 : tx.raw_data) === null || _a === void 0 ? void 0 : _a.contract) === null || _b === void 0 ? void 0 : _b[0];
    if (!contract)
        return 0;
    var parameter = (_c = contract.parameter) === null || _c === void 0 ? void 0 : _c.value;
    if (parameter === null || parameter === void 0 ? void 0 : parameter.amount) {
        return parameter.amount;
    }
    if (parameter === null || parameter === void 0 ? void 0 : parameter.call_value) {
        return parameter.call_value;
    }
    return 0;
}
// Helper to convert Tron event topics to Ethereum format
function convertEventTopics(event) {
    var topics = [];
    // First topic is usually the event signature
    if (event.event_name) {
        // This is a simplification - in production you'd compute the keccak256 hash
        // For now, we'll use the event name as a placeholder
        topics.push(to0x(event.event_name));
    }
    // Add any additional topics from the event
    if (Array.isArray(event.topics)) {
        for (var _i = 0, _a = event.topics; _i < _a.length; _i++) {
            var topic = _a[_i];
            if (typeof topic === "string") {
                topics.push(to0x(topic));
            }
        }
    }
    return topics;
}
// Helper to match log topics against filter
function matchesTopicFilter(logTopics, filterTopics) {
    if (filterTopics.length === 0)
        return true;
    for (var i = 0; i < filterTopics.length; i++) {
        var filterTopic = filterTopics[i];
        if (filterTopic === null)
            continue;
        var logTopic = logTopics[i];
        if (!logTopic)
            return false;
        if (Array.isArray(filterTopic)) {
            if (!filterTopic.includes(logTopic))
                return false;
        }
        else {
            if (filterTopic !== logTopic)
                return false;
        }
    }
    return true;
}

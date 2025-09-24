"use strict";
/*
  Minimal usage example for the TronWeb transport.

  Prerequisites:
  - Install TronWeb in your app: `npm i tronweb`
  - Use a Tron node endpoint (e.g. TronGrid) for `fullHost`.
  - This is a demonstration; not all Ethereum RPC methods are supported.
*/
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
var tronweb_1 = require("tronweb");
var viem_1 = require("viem");
var tronWeb_1 = require("./tronWeb");
var dotenv = require("dotenv");
// Load environment variables from .env file
dotenv.config();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var NETWORK, PRIVATE_KEY, tw, senderAddress, client, blockNumber, someAddress, balance, balanceInSun, balanceInTRX, err_1, callResult, err_2, balance, usdtBalance, usdtReadable, err_3, senderAddress_1, senderBalance, balanceTRX, err_4, recipientAddress, amountInTRX, amountInSun, amountHex, txHash, err_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    NETWORK = "testnet";
                    PRIVATE_KEY = process.env.PRIVATE_KEY || "";
                    tw = new tronweb_1.TronWeb({
                        fullHost: NETWORK === "testnet"
                            ? "https://nile.trongrid.io"
                            : "https://api.trongrid.io",
                        privateKey: PRIVATE_KEY
                    });
                    senderAddress = PRIVATE_KEY ? tw.address.fromPrivateKey(PRIVATE_KEY) : undefined;
                    client = (0, viem_1.createPublicClient)({
                        transport: (0, tronWeb_1.tronWeb)(tw, {
                            chainId: "0x0",
                            defaultFrom: senderAddress, // Set default from address
                            callOptions: { feeLimit: 15000000 },
                            sendOptions: { feeLimit: 20000000 },
                        }),
                        batch: { multicall: false },
                    });
                    return [4 /*yield*/, client.request({ method: "eth_blockNumber" })];
                case 1:
                    blockNumber = _a.sent();
                    console.log("eth_blockNumber:", blockNumber);
                    someAddress = "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs";
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, client.request({
                            method: "eth_getBalance",
                            params: [someAddress, "latest"],
                        })];
                case 3:
                    balance = _a.sent();
                    console.log("\nTRX Balance for ".concat(someAddress, ":"));
                    console.log("  Hex:", balance);
                    balanceInSun = parseInt(balance, 16);
                    balanceInTRX = balanceInSun / 1000000;
                    console.log("  SUN: ".concat(balanceInSun.toLocaleString()));
                    console.log("  TRX: ".concat(balanceInTRX.toFixed(6)));
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.warn("Balance call failed (replace address with a real one):", err_1);
                    return [3 /*break*/, 5];
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, client.request({
                            method: "eth_call",
                            params: [
                                {
                                    to: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT contract on Tron
                                    data: "0x18160ddd", // totalSupply()
                                },
                                "latest",
                            ],
                        })];
                case 6:
                    callResult = _a.sent();
                    console.log("USDT totalSupply (eth_call):", callResult);
                    return [3 /*break*/, 8];
                case 7:
                    err_2 = _a.sent();
                    console.warn("eth_call failed:", err_2);
                    return [3 /*break*/, 8];
                case 8:
                    _a.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, client.request({
                            method: "eth_call",
                            params: [
                                {
                                    to: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT
                                    // balanceOf(TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe)
                                    data: "0x70a08231" + "0000000000000000000000005a67fa7cc56bd6d043a98e17d329c1dc9e14753f",
                                },
                                "latest",
                            ],
                        })];
                case 9:
                    balance = _a.sent();
                    console.log("\nUSDT balance for TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe:");
                    console.log("  Hex:", balance);
                    usdtBalance = parseInt(balance, 16);
                    usdtReadable = usdtBalance / 1000000;
                    console.log("  Raw: ".concat(usdtBalance.toLocaleString()));
                    console.log("  USDT: ".concat(usdtReadable.toFixed(6)));
                    return [3 /*break*/, 11];
                case 10:
                    err_3 = _a.sent();
                    console.warn("Contract call failed:", err_3);
                    return [3 /*break*/, 11];
                case 11:
                    if (!PRIVATE_KEY) return [3 /*break*/, 19];
                    console.log("\n📤 SENDING TRANSACTION");
                    console.log("Network:", NETWORK === "testnet" ? "Nile Testnet" : "Mainnet");
                    senderAddress_1 = tw.address.fromPrivateKey(PRIVATE_KEY);
                    console.log("From address:", senderAddress_1);
                    _a.label = 12;
                case 12:
                    _a.trys.push([12, 14, , 15]);
                    return [4 /*yield*/, client.request({
                            method: "eth_getBalance",
                            params: [senderAddress_1, "latest"],
                        })];
                case 13:
                    senderBalance = _a.sent();
                    balanceTRX = parseInt(senderBalance, 16) / 1000000;
                    console.log("Sender balance: ".concat(balanceTRX.toFixed(6), " TRX"));
                    if (balanceTRX < 1) {
                        console.warn("⚠️  Low balance. Need at least 1 TRX for fees.");
                    }
                    return [3 /*break*/, 15];
                case 14:
                    err_4 = _a.sent();
                    console.warn("Could not check balance:", err_4);
                    return [3 /*break*/, 15];
                case 15:
                    _a.trys.push([15, 17, , 18]);
                    recipientAddress = "TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx";
                    amountInTRX = 10;
                    amountInSun = amountInTRX * 1000000;
                    amountHex = "0x" + amountInSun.toString(16);
                    console.log("\nSending ".concat(amountInTRX, " TRX to ").concat(recipientAddress, "..."));
                    console.log("Amount in hex: ".concat(amountHex, " (").concat(amountInSun, " SUN)"));
                    console.log("From: ".concat(senderAddress_1));
                    return [4 /*yield*/, client.request({
                            method: "eth_sendTransaction",
                            params: [{
                                    from: senderAddress_1,
                                    to: recipientAddress,
                                    value: amountHex, // amount in SUN (hex)
                                }],
                        })];
                case 16:
                    txHash = _a.sent();
                    console.log("✅ Transaction sent!");
                    console.log("TX Hash:", txHash);
                    console.log("View on ".concat(NETWORK === "testnet" ? "Nile" : "Tronscan", ":"), NETWORK === "testnet"
                        ? "https://nile.tronscan.org/#/transaction/".concat(txHash.replace("0x", ""))
                        : "https://tronscan.org/#/transaction/".concat(txHash.replace("0x", "")));
                    return [3 /*break*/, 18];
                case 17:
                    err_5 = _a.sent();
                    console.error("❌ Transaction failed:", err_5.message);
                    return [3 /*break*/, 18];
                case 18: return [3 /*break*/, 20];
                case 19:
                    console.log("\n📝 To send transactions, set your private key:");
                    console.log("   PRIVATE_KEY=your_private_key_here npm run demo");
                    console.log("   Or edit the PRIVATE_KEY variable in this file");
                    _a.label = 20;
                case 20: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error(err);
    process.exit(1);
});

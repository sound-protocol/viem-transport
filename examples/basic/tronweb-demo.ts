/*
  Minimal usage example for the TronWeb transport.

  Prerequisites:
  - Install TronWeb in your app: `npm i tronweb`
  - Use a Tron node endpoint (e.g. TronGrid) for `fullHost`.
  - This is a demonstration; not all Ethereum RPC methods are supported.
*/

import { TronWeb } from "tronweb";
import { createPublicClient, erc20Abi } from "viem";
import { tronWeb } from "../../tronWeb";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Configure TronWeb for Nile testnet
  // To use mainnet, change to: https://api.trongrid.io
  const NETWORK = "testnet"; // or "mainnet"
  const PRIVATE_KEY = process.env.PRIVATE_KEY || ""; // Set your private key here or via env

  const tw = new TronWeb({
    fullHost: NETWORK === "testnet"
      ? "https://nile.trongrid.io"
      : "https://api.trongrid.io",
    privateKey: PRIVATE_KEY
  });

  // Get sender address from private key if available
  const senderAddress = PRIVATE_KEY ? tw.address.fromPrivateKey(PRIVATE_KEY) : undefined;

  // Create a viem client using the TronWeb transport.
  // Provide a chainId to satisfy `eth_chainId` calls (choose your own convention).
  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x0",
      defaultFrom: senderAddress, // Set default from address
      callOptions: { feeLimit: 15_000_000 },
      sendOptions: { feeLimit: 20_000_000 },
    }),
    batch: { multicall: false },
  });

  const blockNumber = await client.request({ method: "eth_blockNumber" });
  console.log("eth_blockNumber:", blockNumber);

  // Example: get TRX balance for an address (pass 0x-hex or base58 T-address).
  // Note: On Tron, balances are denominated in SUN (1 TRX = 1e6 SUN).
  // Replace with a valid Tron address.
  const someAddress = "TKHuVq1oKVruCGLvqVexFs6dawKv6fQgFs"; // placeholder
  try {
    const balance = await client.request({
      method: "eth_getBalance",
      params: [someAddress, "latest"],
    });
    console.log(`\nTRX Balance for ${someAddress}:`);
    console.log("  Hex:", balance);
    const balanceInSun = parseInt(balance as string, 16);
    const balanceInTRX = balanceInSun / 1_000_000;
    console.log(`  SUN: ${balanceInSun.toLocaleString()}`);
    console.log(`  TRX: ${balanceInTRX.toFixed(6)}`);
  } catch (err) {
    console.warn("Balance call failed (replace address with a real one):", err);
  }

  // Example 1: Direct eth_call - USDT on Tron mainnet
  try {
    const callResult = await client.request({
      method: "eth_call",
      params: [
        {
          to: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT contract on Tron
          data: "0x18160ddd", // totalSupply()
        },
        "latest",
      ],
    });
    console.log("USDT totalSupply (eth_call):", callResult);
  } catch (err) {
    console.warn("eth_call failed:", err);
  }

  // Example 2: Using viem's readContract with erc20Abi
  // This shows how to use typed contract calls
  try {
    // For readContract to work, we need to pass the address in 0x format
    // USDT on Tron: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
    const balance = await client.request({
      method: "eth_call",
      params: [
        {
          to: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // USDT
          // balanceOf(TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe)
          data: "0x70a08231" + "0000000000000000000000005a67fa7cc56bd6d043a98e17d329c1dc9e14753f",
        },
        "latest",
      ],
    });
    console.log("\nUSDT balance for TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe:");
    console.log("  Hex:", balance);
    const usdtBalance = parseInt(balance as string, 16);
    const usdtReadable = usdtBalance / 1_000_000; // USDT has 6 decimals
    console.log(`  Raw: ${usdtBalance.toLocaleString()}`);
    console.log(`  USDT: ${usdtReadable.toFixed(6)}`);

    // Note: readContract with erc20Abi would work like this if viem fully supported our transport:
    // const typedBalance = await client.readContract({
    //   address: "0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C", // Contract in 0x format
    //   abi: erc20Abi,
    //   functionName: "balanceOf",
    //   args: ["0x5a67fa7cc56bd6d043a98e17d329c1dc9e14753f"], // Address in 0x format
    // });
  } catch (err) {
    console.warn("Contract call failed:", err);
  }

  // Example: Send a transaction (requires private key)
  if (PRIVATE_KEY) {
    console.log("\n📤 SENDING TRANSACTION");
    console.log("Network:", NETWORK === "testnet" ? "Nile Testnet" : "Mainnet");

    // Get sender address from private key
    const senderAddress = tw.address.fromPrivateKey(PRIVATE_KEY);
    console.log("From address:", senderAddress);

    // Check sender balance first
    try {
      const senderBalance = await client.request({
        method: "eth_getBalance",
        params: [senderAddress, "latest"],
      });
      const balanceTRX = parseInt(senderBalance as string, 16) / 1_000_000;
      console.log(`Sender balance: ${balanceTRX.toFixed(6)} TRX`);

      if (balanceTRX < 1) {
        console.warn("⚠️  Low balance. Need at least 1 TRX for fees.");
      }
    } catch (err) {
      console.warn("Could not check balance:", err);
    }

    // Send transaction
    try {
      const recipientAddress = "TDGJM2pn4YL7ivdebVQfbRVQ33GroSqDpx"; // Change this to your recipient
      const amountInTRX = 10; // Sending 10 TRX
      const amountInSun = amountInTRX * 1_000_000;
      const amountHex = "0x" + amountInSun.toString(16);

      console.log(`\nSending ${amountInTRX} TRX to ${recipientAddress}...`);
      console.log(`Amount in hex: ${amountHex} (${amountInSun} SUN)`);
      console.log(`From: ${senderAddress}`);

      const txHash = await client.request({
        method: "eth_sendTransaction",
        params: [{
          from: senderAddress,
          to: recipientAddress,
          value: amountHex, // amount in SUN (hex)
        }],
      });

      console.log("✅ Transaction sent!");
      console.log("TX Hash:", txHash);
      console.log(`View on ${NETWORK === "testnet" ? "Nile" : "Tronscan"}:`,
        NETWORK === "testnet"
          ? `https://nile.tronscan.org/#/transaction/${txHash.replace("0x", "")}`
          : `https://tronscan.org/#/transaction/${txHash.replace("0x", "")}`
      );
    } catch (err: any) {
      console.error("❌ Transaction failed:", err.message);
    }
  } else {
    console.log("\n📝 To send transactions, set your private key:");
    console.log("   PRIVATE_KEY=your_private_key_here npm run demo");
    console.log("   Or edit the PRIVATE_KEY variable in this file");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

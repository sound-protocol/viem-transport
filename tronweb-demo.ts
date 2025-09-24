/*
  Minimal usage example for the TronWeb transport.

  Prerequisites:
  - Install TronWeb in your app: `npm i tronweb`
  - Use a Tron node endpoint (e.g. TronGrid) for `fullHost`.
  - This is a demonstration; not all Ethereum RPC methods are supported.
*/

import { TronWeb } from "tronweb";
import { createPublicClient, erc20Abi } from "viem";
import { tronWeb } from "./tronWeb";

async function main() {
  // Configure TronWeb (replace with your endpoint)
  const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

  // Create a viem client using the TronWeb transport.
  // Provide a chainId to satisfy `eth_chainId` calls (choose your own convention).
  const client = createPublicClient({
    transport: tronWeb(tw, {
      chainId: "0x0",
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

  // Example outline for sending a transaction (requires signing capability & funded account).
  // Uncomment after configuring TronWeb with a private key or wallet that can sign.
  // const txHash = await client.request({
  //   method: "eth_sendTransaction",
  //   params: [
  //     {
  //       from: "0xYOUR_FROM_ADDRESS",
  //       to: "0xRECIPIENT_ADDRESS",
  //       value: "0x10F0CF064DD5920000", // amount in SUN (hex)
  //     },
  //   ],
  // });
  // console.log("eth_sendTransaction tx hash:", txHash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

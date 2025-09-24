/*
  Minimal usage example for the TronWeb transport.

  Prerequisites:
  - Install TronWeb in your app: `npm i tronweb`
  - Use a Tron node endpoint (e.g. TronGrid) for `fullHost`.
  - This is a demonstration; not all Ethereum RPC methods are supported.
*/

import { TronWeb } from "tronweb";
import { createPublicClient, erc20Abi } from "viem";
import { tronWeb } from "./tronWeb.ts";

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
  const tronAddressBase58 = "TZFbTfFZJkqdDge8CkvZSyT7KgiJafYVTL"; // placeholder
  const someAddress = `0x${TronWeb.address
    .toHex(tronAddressBase58)
    .replace(/^0x/i, "")
    .slice(-40)}` as const;
  try {
    const balance = await client.request({
      method: "eth_getBalance",
      params: [someAddress, "latest"],
    });
    console.log("eth_getBalance:", balance);
  } catch (err) {
    console.warn("Balance call failed (replace address with a real one):", err);
  }

  // Example: constant contract call (replace with a real TRC-20 contract + data).
  try {
    const callResult = await client.readContract({
      address: "0xa614f803B6FD780986A42c78Ec9c7f77e6DeD13C",
      abi: erc20Abi,
      functionName: "balanceOf",
      // args: ["TUhaNYZWmQ887dZ5faufhsSvxR695Lw7Po"],
      args: ["0xCD7592DB054Da46198E5311Ef5d13F087c1ee818"],
    });
    // const callResult = await client.request({
    //   method: "eth_call",
    //   params: [
    //     {
    //       to: "TTOKENCONTRACTADDRESSPLACEHOLDER12345", // base58 or 0x
    //       data: "0x18160ddd", // e.g. totalSupply()
    //     },
    //     "latest",
    //   ],
    // });
    console.log("eth_call balance():", callResult);
  } catch (err) {
    console.warn(
      "Contract call failed (replace contract/data with a real example):",
      err,
    );
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

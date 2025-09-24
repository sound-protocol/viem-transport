const { TronWeb } = require('tronweb');

const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });
const base58 = "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe";

console.log("Base58:", base58);
console.log("Hex:", tw.address.toHex(base58));
console.log("Without 41:", tw.address.toHex(base58).replace(/^41/, ''));

// Also check the reverse
const hex41 = "415a67fa7cc56bd6d043a98e17d329c1dc9e14753f";
console.log("\nReverse check:");
console.log("Hex41:", hex41);
console.log("Back to base58:", tw.address.fromHex(hex41));

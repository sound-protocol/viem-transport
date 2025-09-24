import { TronWeb } from 'tronweb';

const base58 = "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe";
console.log('\n🔍 ADDRESS CONVERSION DEBUG\n');
console.log('=' .repeat(50));

const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });

const hexAddress = tw.address.toHex(base58);
console.log('Base58:', base58);
console.log('Actual Hex:', hexAddress);
console.log('Actual 0x:', '0x' + hexAddress.replace(/^41/, ''));

console.log('\nWRONG addresses in our test:');
console.log('We used: 415a523cca8bf6c8c4ea23331e5b0c524cee3ac8ff');
console.log('We used: 0x5a523cca8bf6c8c4ea23331e5b0c524cee3ac8ff');
console.log('\nThese are DIFFERENT addresses!');

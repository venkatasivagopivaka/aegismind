const { decodeAbiParameters, slice } = require('viem');
const initCode = "0xd703aaE79538628d27099B8c4f621bE4CCd142d5c5265d5d0000000000000000000000007a1dbab750f12a90eb1b60d2ae3ad17d4d81effe0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001243c3b752b01845ADb2C711129d4f3966735eD98a9F09fC4cE570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000014306c3C493aC339acC0bC0E7Ea145a21B2169cEAa0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
const factoryData = slice(initCode, 20);
const deployArgs = slice(factoryData, 4) + "0000"; // pad 2 bytes!
console.log("Padded args length:", (deployArgs.length - 2)/2);
try {
    const decoded = decodeAbiParameters([{type: 'address'}, {type: 'bytes'}, {type: 'bytes32'}], deployArgs);
    console.log("Implementation:", decoded[0]);
    console.log("CreateData Length (bytes):", (decoded[1].length - 2) / 2);
    
    // Now decode createData!
    const createData = decoded[1];
    const initSelector = slice(createData, 0, 4);
    const initArgs = slice(createData, 4);
    console.log("Init Selector:", initSelector);
    const initDecoded = decodeAbiParameters([
        {type: 'bytes21'}, {type: 'address'}, {type: 'bytes'}, {type: 'bytes'}, {type: 'bytes[]'}
    ], initArgs);
    console.log("Init args:", initDecoded);
} catch (e) {
    console.log("Decoding failed:", e.message);
}

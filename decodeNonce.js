const nonce = 457595047129322003098528983897256842628455772601283637703294616544724647936n;
const hexNonce = nonce.toString(16).padStart(64, '0');
console.log("Hex Nonce: 0x" + hexNonce);
console.log("vMode (1 byte): 0x" + hexNonce.slice(0, 2));
console.log("vType (1 byte): 0x" + hexNonce.slice(2, 4));
console.log("vId (21 bytes): 0x" + hexNonce.slice(4, 46));

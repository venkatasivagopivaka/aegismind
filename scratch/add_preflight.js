const fs = require('fs');
let code = fs.readFileSync('scripts/setupKernel.ts', 'utf8');

const search = `  try {
    const userOpHash = await bundlerClientAi.sendUserOperation({
      account: kernelAccountAi,
      callData: aiCallData,
    });`;

const replacement = `  try {
    console.log("--- PREFLIGHT ESTIMATION ---");
    const estimatedGas = await bundlerClientAi.estimateUserOperationGas({
      account: kernelAccountAi,
      callData: aiCallData,
    });
    console.log("Preflight estimation SUCCESS!", estimatedGas);
    
    console.log("--- BROADCAST ---");
    const userOpHash = await bundlerClientAi.sendUserOperation({
      account: kernelAccountAi,
      callData: aiCallData,
    });`;

if (code.includes(search)) {
    code = code.replace(search, replacement);
    fs.writeFileSync('scripts/setupKernel.ts', code);
    console.log("Added preflight check to setupKernel.ts");
} else {
    console.log("Could not find the target code to replace.");
}

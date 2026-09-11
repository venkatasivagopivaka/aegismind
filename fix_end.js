const fs = require('fs');
let code = fs.readFileSync('scripts/setupKernel.ts', 'utf8');
const search = '  console.log("\\nSending AI Agent Enable Mode UserOperation...");';
const idx = code.indexOf(search);
code = code.substring(0, idx + search.length);
code += `
  try {
    const estimatedGas = await bundlerClientAi.estimateUserOperationGas({
      account: kernelAccountAi,
      callData: aiCallData
    });
    console.log("Estimation completed successfully!", estimatedGas);
  } catch (e: any) {
    console.error("Failed to estimate AI Enable Mode UserOp:");
    console.dir(e, { depth: null });
    if (e.walk) console.dir(e.walk(), { depth: null });
    return;
  }
}

main().catch(console.error);
`;
fs.writeFileSync('scripts/setupKernel.ts', code);

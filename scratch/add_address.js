const fs = require('fs');
let code = fs.readFileSync('scripts/setupKernel.ts', 'utf8');

code = code.replace(
  '  const kernelAccountAi = await createKernelAccount(publicClient, {',
  '  const kernelAccountAi = await createKernelAccount(publicClient, {\n    address: "0x8b6FB665ee47226e53C70be1E9d43DbD7b886d59",'
);

fs.writeFileSync('scripts/setupKernel.ts', code);

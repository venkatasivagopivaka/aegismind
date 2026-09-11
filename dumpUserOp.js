const fs = require('fs');
let content = fs.readFileSync('scripts/setupKernel.ts', 'utf8');
content = content.replace('console.log("\\nUserOperation JSON:", JSON.stringify(userOp, (key, value) =>', 
  'fs.writeFileSync("userOpFull.json", JSON.stringify(userOp, (key, value) => typeof value === "bigint" ? value.toString() : value, 2));\n  console.log("\\nUserOperation JSON:", JSON.stringify(userOp, (key, value) =>');
// Actually, let's just use sed!

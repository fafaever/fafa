const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/PhoneCheckApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const regex = /  const toggleMemoStatus = \(\w+: string\) => \{[\s\S]*?\};\n/;
code = code.replace(regex, '');

fs.writeFileSync(file, code, 'utf8');
console.log("Success");

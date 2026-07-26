const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/PhoneCheckApp.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /标记为无痕模式 \(isIncognito: item.isIncognito === true\)/,
  '标记为无痕模式 (isIncognito: true)'
);

code = code.replace(
  /timestamp: Date\.now\(\) - idx \* 300000,\n          isIncognito: true/,
  'timestamp: Date.now() - idx * 300000,\n          isIncognito: item.isIncognito === true'
);

code = code.replace(
  /timestamp: Date\.now\(\) - idx \* 1800000,\n    isIncognito: true/,
  'timestamp: Date.now() - idx * 1800000,\n    isIncognito: true' // keeping default mock as true
);

fs.writeFileSync(file, code, 'utf8');
console.log("Success");

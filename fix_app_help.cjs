const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/App.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!code.includes('import HelpApp')) {
  code = code.replace(
    /import HomeScreen from "\.\/components\/HomeScreen";/,
    'import HomeScreen from "./components/HomeScreen";\nimport HelpApp from "./components/HelpApp";'
  );
}

// 2. Add to switch
if (!code.includes('case "help":')) {
  code = code.replace(
    /      case "home":\n      default:/,
    '      case "help":\n        return <HelpApp onClose={() => setCurrentScreen("home")} />;\n      case "home":\n      default:'
  );
}

fs.writeFileSync(file, code, 'utf8');
console.log("Success");

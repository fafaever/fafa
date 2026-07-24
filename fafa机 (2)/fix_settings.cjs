const fs = require('fs');
let settings = fs.readFileSync('src/components/SettingsApp.tsx', 'utf8');

settings = settings.replace(/if \(data\.success\) \{\s*setFetchedModels\(data\.models \|\| \[\]\);\s*\} else \{\s*alert\(data\.message \|\| "拉取模型列表失败"\);\s*\}/,
`setFetchedModels(data.models || []);`);

fs.writeFileSync('src/components/SettingsApp.tsx', settings);

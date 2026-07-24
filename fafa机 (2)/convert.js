const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// We want to extract the logic from server.ts and convert it to browser functions.
// Let's do this manually as regex replace is error-prone.

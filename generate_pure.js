const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

// I will manually write out each endpoint implementation because it's much safer!
// I'll extract the prompt generating logic from serverContent.

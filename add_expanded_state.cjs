const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/ForumApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const search = '  const [isEditingNickname, setIsEditingNickname] = useState(false);';
const insert = '  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});';

code = code.replace(search, search + '\n' + insert);
fs.writeFileSync(file, code, 'utf8');

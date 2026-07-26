const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/NotesApp.tsx');
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('forcedCharId')) {
  code = code.replace(
    /isGeneratingMap: Record<string, boolean>;/,
    'isGeneratingMap: Record<string, boolean>;\n  forcedCharId?: string | null;'
  );
  code = code.replace(
    /export default function NotesApp\(\{ characters, settings, onClose, onGenerateNote, isGeneratingMap \}: NotesAppProps\) \{/,
    'export default function NotesApp({ characters, settings, onClose, onGenerateNote, isGeneratingMap, forcedCharId }: NotesAppProps) {'
  );
  
  // Replace `const [selectedCharId, setSelectedCharId] = useState<string | null>(null);`
  // with `const [selectedCharId, setSelectedCharId] = useState<string | null>(forcedCharId || null);`
  code = code.replace(
    /const \[selectedCharId, setSelectedCharId\] = useState<string \| null>\(null\);/,
    'const [selectedCharId, setSelectedCharId] = useState<string | null>(forcedCharId || null);'
  );
  
  // Replace the back button logic:
  // if forcedCharId is true, onClose()
  // else setSelectedCharId(null)
  const backBtnRegex = /<button onClick=\{\(\) => setSelectedCharId\(null\)\} className="p-1\.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">/g;
  code = code.replace(
    backBtnRegex,
    '<button onClick={() => forcedCharId ? onClose() : setSelectedCharId(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg transition active:scale-95">'
  );

  // If forcedCharId is true and we don't have selectedCharId (which shouldn't happen, but just in case), the main view shouldn't be rendered.
  // Actually, wait, `if (!selectedCharId) {` renders the character list view.
  const charListRegex = /if \(\!selectedCharId\) \{/g;
  code = code.replace(
    charListRegex,
    'if (!selectedCharId && !forcedCharId) {'
  );

  fs.writeFileSync(file, code, 'utf8');
  console.log("Success");
} else {
  console.log("Already updated");
}

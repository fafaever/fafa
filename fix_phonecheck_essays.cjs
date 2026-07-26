const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/PhoneCheckApp.tsx');
let code = fs.readFileSync(file, 'utf8');

const searchStr = `        <NotesApp 
          characters={characters}
          settings={settings || { apiUrl: "", apiKey: "", model: "", apiPresets: [], activePresetId: "" }}
          onClose={() => setActiveModule(null)}
          onGenerateNote={onGenerateNote || (async () => {})}
          isGeneratingMap={isGeneratingMap || {}}
        />`;

const replaceStr = `        <NotesApp 
          characters={characters}
          settings={settings || { apiUrl: "", apiKey: "", model: "", apiPresets: [], activePresetId: "" }}
          onClose={() => setActiveModule(null)}
          onGenerateNote={onGenerateNote || (async () => {})}
          isGeneratingMap={isGeneratingMap || {}}
          forcedCharId={selectedCharId}
        />`;

if (code.includes(searchStr)) {
  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(file, code, 'utf8');
  console.log("Success");
} else {
  console.log("Not found");
}

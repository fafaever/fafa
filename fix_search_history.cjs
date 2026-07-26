const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/components/PhoneCheckApp.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Update the prompt
const searchPromptRegex = /请根据以上角色的完整人设、记忆与世界书设定，生成 6-8 条最新的浏览器无痕搜索历史词条及内心想法。[\s\S]*?\]\`;/;

const newPrompt = `请根据以上角色的完整人设、记忆与世界书设定，生成 6-8 条最新的浏览器搜索历史词条及内心想法。
【规则】：
1. 搜索词条要贴合角色近期关注的事物、生活琐事或隐藏小心思。
2. 每条附带该角色搜索此词条时的【内心真实想法】（15字以内，可爱/真实/严谨）。
3. 只有当搜索内容是角色【不想让别人知道】的隐秘心思、尴尬问题或特殊设定时，才标记为无痕模式 (isIncognito: true)。普通搜索直接标记为 false。
4. 输出为严格 JSON 数组，格式：
[
  {"query": "搜索词条", "innerThought": "内心想法", "isIncognito": boolean},
  ...
]\`;`;

code = code.replace(searchPromptRegex, newPrompt);

// 2. Update newBatch mapping
const mapRegex = /isIncognito: true/;
code = code.replace(mapRegex, 'isIncognito: item.isIncognito === true');

// 3. Update UI rendering in activeModule === 'browser'
const browserUiSearch = `                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200/60">
                      🔒 无痕搜索
                    </span>
                    <span className="text-xs font-bold text-neutral-900">{item.query}</span>`;

const browserUiReplace = `                    {item.isIncognito ? (
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full border border-neutral-200/60">
                        🔒 无痕搜索
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100/60">
                        🔍 搜索
                      </span>
                    )}
                    <span className="text-xs font-bold text-neutral-900">{item.query}</span>`;

code = code.replace(browserUiSearch, browserUiReplace);

// 4. Update UI rendering in modal
const modalUiSearch = `                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                      🔒 无痕搜索
                    </span>
                    <span className="text-xs font-bold text-neutral-900">{item.query}</span>`;

const modalUiReplace = `                    {item.isIncognito ? (
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
                        🔒 无痕搜索
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        🔍 搜索
                      </span>
                    )}
                    <span className="text-xs font-bold text-neutral-900">{item.query}</span>`;

code = code.replace(modalUiSearch, modalUiReplace);

// 5. Update heading text
code = code.replace(/>最近无痕搜索词条 \(\{searchHistory.length\}\/20\)<\/span>/, '>最近搜索记录 ({searchHistory.length}/20)</span>');

fs.writeFileSync(file, code, 'utf8');
console.log("Success");

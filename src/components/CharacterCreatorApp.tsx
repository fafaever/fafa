import React, { useState, useEffect } from "react";
import { ChevronLeft, UserPlus, Sparkles, AlertCircle, Smile, HelpCircle, Edit3, MessageSquare, Trash2, Check, Upload, FileText, Zap, Users, Plus, Loader2 } from "lucide-react";

import { Character, AppSettings, UserPersona, BoundNPC } from "../types";
import { apiAnalyzeCharacterFile, callLLM } from "../lib/api";
import { CharacterAvatar } from "./CharacterAvatar";
import JSZip from "jszip";

export function generateDefaultNpcsForCharacter(charName: string, charPersona: string = "", charBg: string = ""): BoundNPC[] {
  const name = charName || "角色";
  const text = (charPersona + " " + charBg).toLowerCase();
  
  if (text.includes("学生") || text.includes("大学") || text.includes("校园") || text.includes("同学")) {
    return [
      { id: `npc-${Date.now()}-1`, name: "陈清源", avatar: "🏀", relationship: "社团学长", description: "做事靠谱有耐心，经常给项目和活动提供建议" },
      { id: `npc-${Date.now()}-2`, name: "苏禾", avatar: "👦", relationship: "大学同寝室友", description: "性格开朗，喜欢打游戏和户外运动" },
      { id: `npc-${Date.now()}-3`, name: "许若琳", avatar: "☕", relationship: "校门口咖啡馆店长", description: "温柔细心，记得大家常喝的咖啡甜度" },
      { id: `npc-${Date.now()}-4`, name: "陆晨", avatar: "👧", relationship: "高中同桌兼好友", description: "爱看小说和看展，经常与大家分享日常" },
    ];
  } else if (text.includes("职场") || text.includes("公司") || text.includes("工作") || text.includes("同事")) {
    return [
      { id: `npc-${Date.now()}-1`, name: "张文华", avatar: "👔", relationship: "部门主管", description: "对工作要求严谨但挺护短，经常请团队喝下午茶" },
      { id: `npc-${Date.now()}-2`, name: "宋致远", avatar: "💻", relationship: "同组资深同事", description: "技术干练，日常在茶水间交流工作与生活" },
      { id: `npc-${Date.now()}-3`, name: "顾安琪", avatar: "👩‍💼", relationship: "行政人事", description: "性格随和热心肠，掌握各种公司资讯冷知识" },
      { id: `npc-${Date.now()}-4`, name: "王耀宗", avatar: "☕", relationship: "项目资深顾问", description: "经验丰富，说话有条不紊且乐于分享" },
    ];
  } else if (text.includes("猎人") || text.includes("战斗") || text.includes("科幻") || text.includes("突击") || text.includes("江湖") || text.includes("玄幻")) {
    return [
      { id: `npc-${Date.now()}-1`, name: "雷天明", avatar: "🐺", relationship: "同盟雇佣兵", description: "寡言少语但身手不凡，值得信赖的战友" },
      { id: `npc-${Date.now()}-2`, name: "方怀安", avatar: "🎧", relationship: "情报网提供者", description: "擅长各类情报破译与网络信息搜集" },
      { id: `npc-${Date.now()}-3`, name: "莫云深", avatar: "🥃", relationship: "安全屋酒吧老板", description: "阅历丰富，酒吧是消息汇聚的枢纽" },
      { id: `npc-${Date.now()}-4`, name: "沈知意", avatar: "🔮", relationship: "黑市商铺老板", description: "精明利落，手头常有稀缺装备与道具" },
    ];
  }

  return [
    { id: `npc-${Date.now()}-1`, name: "林墨", avatar: "👦", relationship: "挚友", description: "性格随和开朗，经常相约聚会与交流" },
    { id: `npc-${Date.now()}-2`, name: "周致远", avatar: "🧢", relationship: "熟人朋友", description: "热心肠，懂得挺多生活与工作常识" },
    { id: `npc-${Date.now()}-3`, name: "叶浅浅", avatar: "☕", relationship: "经常光顾的店家老板", description: "待人亲切，聊天气氛非常轻松" },
    { id: `npc-${Date.now()}-4`, name: "程安", avatar: "👧", relationship: "旧识熟人", description: "兴趣广泛，常分享各种新鲜有趣的消息" },
  ];
}

interface CharacterCreatorAppProps {
  characters: Character[];
  userPersonas: UserPersona[];
  settings?: AppSettings;
  onAddCharacter: (char: Omit<Character, "id" | "createdAt">) => void;
  onUpdateCharacter?: (id: string, char: Omit<Character, "id" | "createdAt">) => void;
  onDeleteCharacter: (id: string) => void;
  onClose: () => void;
  onNavigateToChat: (characterId: string) => void;
}

const compressAndResizeImage = (file: File, _maxDimension = 300, _quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片文件失败"));
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("读取图片文件失败"));
      }
    };
    reader.readAsDataURL(file);
  });
};

const getNicknameFromInstruction = (inst: string): string => {
  if (!inst) return "无";
  const match = inst.match(/-\s*(?:别名\/昵称|昵称|别名|Nickname|Nick)\s*[:：]\s*([^\n]+)/i);
  return match ? match[1].trim() : "无";
};

const getPersonalityFromInstruction = (inst: string): string => {
  if (!inst) return "";
  const match = inst.match(/【性格特点\s*\(Personality\)】\s*[:：]?\s*\n([\s\S]*?)(?=\n【角色背景|\n【语言口吻|$)/i);
  return match ? match[1].trim() : "";
};

const getBackgroundFromInstruction = (inst: string): string => {
  if (!inst) return "";
  const match = inst.match(/【角色背景\s*\(Background\s*&\s*Story\)】\s*[:：]?\s*\n([\s\S]*?)(?=\n【语言口吻|$)/i);
  return match ? match[1].trim() : "";
};

const getChatStyleFromInstruction = (inst: string): string => {
  if (!inst) return "";
  const match = inst.match(/【语言口吻与聊天风格\s*\(Chatting\s*Style\s*&\s*Tone\)】\s*[:：]?\s*\n\s*-\s*([^\n]+)/i);
  return match ? match[1].trim() : "";
};

const PRESET_AVATARS = ["🤖", "🖤", "☕", "🔮", "🐱", "🦊", "👑", "🗡️", "🛸", "🎒", "🎓", "🎧", "🎭", "🌿", "🌙"];

const PRESET_STYLES = [
  { name: "傲娇冷酷", placeholder: "说话简短，带些不耐烦（如‘啧’、‘笨蛋’），但关键时刻会流露关心。" },
  { name: "温柔儒雅", placeholder: "用词平和谦逊，喜欢倾听，带有成熟的包容感，常说‘没关系的’、‘你觉得呢？’。" },
  { name: "戏剧中二", placeholder: "语气高亢中二，自带宏大动作描写，如：*握紧凝聚暗炎的法杖*、‘愚蠢的凡人啊！’。" },
  { name: "慵懒冷淡", placeholder: "兴致缺缺，极简回答，常用‘哦’、‘好吧’、‘随便你’，不爱多管闲事。" }
];

export default function CharacterCreatorApp({
  characters,
  userPersonas,
  settings,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onClose,
  onNavigateToChat,
}: CharacterCreatorAppProps) {
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form States
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState(""); // 别名/昵称
  const [avatar, setAvatar] = useState("🤖");
  const [background, setBackground] = useState(""); // 角色背景
  const [personality, setPersonality] = useState(""); // 人设 / 性格特点
  const [chatStyle, setChatStyle] = useState(""); // 聊天风格
  const [selectedPersonaId, setSelectedPersonaId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // AI分析状态
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Encoding & File Preview States
  const [selectedEncoding, setSelectedEncoding] = useState<string>("AUTO");
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  
  // Custom uploaded images
  const [realImage, setRealImage] = useState<string>("");
  const [chatAvatar, setChatAvatar] = useState<string>("");
  const [forceSave, setForceSave] = useState<boolean>(false);
  const [deleteConfirmChar, setDeleteConfirmChar] = useState<Character | null>(null);

  // Bound NPCs State (Initial count 0, generated when uploading file or created manually)
  const [boundNpcs, setBoundNpcs] = useState<BoundNPC[]>([]);
  const [isGeneratingNpcsAI, setIsGeneratingNpcsAI] = useState<boolean>(false);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [associatedCharacterIds, setAssociatedCharacterIds] = useState<string[]>([]);
  const [associatedRelations, setAssociatedRelations] = useState<Record<string, string>>({});
  const [isGeneratingRelation, setIsGeneratingRelation] = useState<Record<string, boolean>>({});

  const getFallbackRelation = (c1Name: string, c1Desc: string, c2Name: string, c2Desc: string): string => {
    const text1 = (c1Name + " " + c1Desc).toLowerCase();
    const text2 = (c2Name + " " + c2Desc).toLowerCase();
    
    if (
      (text1.includes("学生") || text1.includes("校园") || text1.includes("大学") || text1.includes("学校")) &&
      (text2.includes("学生") || text2.includes("校园") || text2.includes("大学") || text2.includes("学校"))
    ) {
      return "他们是同一所学校的同学，在校园中相识并互相照应。";
    }
    if (
      (text1.includes("职场") || text1.includes("公司") || text1.includes("工作") || text1.includes("同事")) &&
      (text2.includes("职场") || text2.includes("公司") || text2.includes("工作") || text2.includes("同事"))
    ) {
      return "他们是在职场中有过交集的伙伴/同事关系，彼此有些交情。";
    }
    return "他们因为一次偶然的事件碰面并结识，存在于同一个世界观中。";
  };

  const generateRelationWithAI = async (c1Name: string, c1Desc: string, c2Name: string, c2Desc: string): Promise<string> => {
    if (!settings || (!settings.apiKey && !settings.apiUrl)) {
      return getFallbackRelation(c1Name, c1Desc, c2Name, c2Desc);
    }
    const prompt = `您是一个小说与角色关系策划。
当前角色一：
- 姓名：${c1Name}
- 背景人设：${c1Desc}

当前角色二：
- 姓名：${c2Name}
- 背景人设：${c2Desc}

请为这两个角色设计一个合理的关联设定/人物关系描述（1句话，50字以内）。
- 如果两个角色的人设背景/世界观相似或属于同一世界（例如同是校园学生或都市白领），请生成自然的关系（如“他们是同一所学校的学生/同事/邻居”）。
- 如果两个角色的人设背景世界差异极大（如一个是古代修真，一个是未来机械师；或者一个是魔王，一个是普通白领），必须生成一个奇妙的“折中设定”使两者的互动合理化（如“由于一次离奇的时空缝隙偶然碰面并相识了”、“他们因为某个全息游戏世界相遇并熟络”）。

请直接返回1句话的关系描述，不需要任何系统说明和引号。`;

    try {
      const response = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [
        { role: "user", content: prompt }
      ]);
      if (response && response.trim().length > 1) {
        return response.trim().replace(/^["']|["']$/g, "");
      }
    } catch (e) {
      console.warn("AI generation failed for relation, falling back.", e);
    }
    return getFallbackRelation(c1Name, c1Desc, c2Name, c2Desc);
  };

  const decodeFileText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsText(file);
    });
  };

  const handleUpdateNpc = (id: string, field: string, value: string) => {
    setBoundNpcs(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleDeleteNpc = (id: string) => {
    setBoundNpcs(prev => prev.filter(n => n.id !== id));
  };

  const handleAddNpc = () => {
    const formalNamesPool = ["林墨", "苏禾", "陆晨", "陈清源", "顾晚秋", "周致远", "沈知意", "叶天明", "许若琳", "程安"];
    const randomName = formalNamesPool[boundNpcs.length % formalNamesPool.length];
    const newNpc: BoundNPC = {
      id: `npc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: randomName,
      avatar: "💬",
      relationship: "朋友/熟人",
      description: "社交圈相关好友"
    };
    setBoundNpcs(prev => [...prev, newNpc]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'real' | 'chat') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndResizeImage(file);
      if (type === 'chat') setChatAvatar(base64);
      else setRealImage(base64);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAssociation = async (charId: string) => {
    const isCurrentlyAssociated = associatedCharacterIds.includes(charId);
    if (isCurrentlyAssociated) {
      setAssociatedCharacterIds(prev => prev.filter(id => id !== charId));
      setAssociatedRelations(prev => {
        const updated = { ...prev };
        delete updated[charId];
        return updated;
      });
    } else {
      setAssociatedCharacterIds(prev => [...prev, charId]);
      
      const otherChar = characters.find(o => o.id === charId);
      if (!otherChar) return;
      
      const fallbackRel = getFallbackRelation(name || "此角色", personality || background || "", otherChar.name, otherChar.description || otherChar.systemInstruction || "");
      
      setAssociatedRelations(prev => ({
        ...prev,
        [charId]: fallbackRel
      }));

      if (settings && (settings.apiKey || settings.apiUrl)) {
        setIsGeneratingRelation(prev => ({ ...prev, [charId]: true }));
        try {
          const refinedRel = await generateRelationWithAI(
            name || "此角色",
            personality || background || "普通角色背景",
            otherChar.name,
            otherChar.systemInstruction || otherChar.description || "普通角色背景"
          );
          setAssociatedRelations(prev => ({
            ...prev,
            [charId]: refinedRel
          }));
        } catch (err) {
          console.error("AI relation generation failed:", err);
        } finally {
          setIsGeneratingRelation(prev => ({ ...prev, [charId]: false }));
        }
      }
    }
  };

  useEffect(() => {
    const preselectedEditId = localStorage.getItem("mobile_ai_preselected_edit_char");
    if (preselectedEditId) {
      localStorage.removeItem("mobile_ai_preselected_edit_char");
      const charToEdit = characters.find((c) => c.id === preselectedEditId);
      if (charToEdit) {
        handleStartEdit(charToEdit);
      }
    }
  }, [characters]);

  const handleStartEdit = (char: Character) => {
    setEditingId(char.id);
    setName(char.name);
    setAvatar(char.avatar || "🤖");
    setNickname(getNicknameFromInstruction(char.systemInstruction));
    setPersonality(getPersonalityFromInstruction(char.systemInstruction));
    setBackground(getBackgroundFromInstruction(char.systemInstruction));
    setChatStyle(getChatStyleFromInstruction(char.systemInstruction));
    setSelectedPersonaId(char.userPersonaId || "");
    setRealImage(char.realImage || "");
    setChatAvatar(char.chatAvatar || "");

    // Load bound NPCs if exists
    setBoundNpcs(char.boundNpcs || []);
    setAssociatedCharacterIds(char.associatedCharacterIds || []);
    setAssociatedRelations(char.associatedRelations || {});

    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab("create");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setNickname("");
    setAvatar("🤖");
    setPersonality("");
    setBackground("");
    setChatStyle("");
    setRealImage("");
    setChatAvatar("");
    setBoundNpcs([]);
    setAssociatedCharacterIds([]);
    setAssociatedRelations({});
    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab("list");
  };

  const handleGenerateNpcsWithAI = async () => {
    setIsGeneratingNpcsAI(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      if (settings && (settings.apiKey || settings.apiUrl)) {
        const existingNames = boundNpcs.map(n => n.name).join(", ");
        const prompt = `你是一个角色关系网络与 NPC 设定生成器。
当前主角色信息：
- 角色姓名：【${name || "未命名角色"}】
- 性格特点：【${personality || "普通性格"}】
- 背景故事：【${background || "普通背景"}】
- 已有 NPC 成员（切勿重复）：[${existingNames}]

请为该角色全新生成 3 至 5 个专属的 NPC 好友/熟人/关系人。
【姓名规则 (绝密重中之重)】：
1. NPC 姓名必须是标准的正式中文姓名（如“林墨”、“苏禾”、“陆晨”、“陈清源”）。
2. 绝对禁止使用“阿X”、“小X”、“老X”等昵称式或单一英文/拼音命名（例如绝对不能使用“阿杰”、“小涵”、“小宋”、“老王”、“Lily”等）。

【格式规则】：
1. 每个 NPC 仅包含：
   - "name": 正常中文姓名 (例如: "林墨", "苏禾", "陆晨")
   - "relationship": 与主角色的关系身份 (例如: "大学室友", "社团学长", "咖啡馆店长", "黑市军火商")
   - "description": 几句话简短介绍/性格特点
   - "avatar": 单个 Emoji 表情头像 (例如: "👦", "🏀", "☕", "🔮")
2. 必须输出严格纯 JSON 数组（无 Markdown 代码块）：
[
  {
    "name": "姓名",
    "relationship": "关系身份",
    "description": "几句话简介",
    "avatar": "Emoji"
  }
]`;

        const responseText = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [
          { role: "user", content: prompt }
        ]);

        let jsonStr = responseText;
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length >= 1) {
          const newGeneratedNpcs: BoundNPC[] = parsed.map((item: any, idx: number) => ({
            id: `npc-ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name || `NPC`,
            avatar: item.avatar || "💬",
            relationship: item.relationship || "朋友",
            description: item.description || "社交圈好友"
          }));

          setBoundNpcs(prev => [...prev, ...newGeneratedNpcs]);
          setSuccessMsg(`✨ 已成功为你生成 ${newGeneratedNpcs.length} 个新 NPC 联系人！`);
          return;
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("生成 NPC 失败：" + (e?.message || e));
    } finally {
      setIsGeneratingNpcsAI(false);
    }
  };

  const processFile = async (file: File, enc: string) => {
    setIsImporting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        
        let decodedText = "";
        if (lowerName.endsWith(".docx")) {
          const arrayBuffer = await file.arrayBuffer();
          const zip = new JSZip();
          const loadedZip = await zip.loadAsync(arrayBuffer);
          const documentXml = await loadedZip.file("word/document.xml")?.async("string");
          if (documentXml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(documentXml, "text/xml");
            const paragraphs = xmlDoc.getElementsByTagName("w:p");
            const textParts: string[] = [];
            for (let i = 0; i < paragraphs.length; i++) {
              const p = paragraphs[i];
              const texts = p.getElementsByTagName("w:t");
              let pText = "";
              for (let j = 0; j < texts.length; j++) {
                pText += texts[j].textContent || "";
              }
              textParts.push(pText);
            }
            decodedText = textParts.join("\n");
          } else {
            throw new Error("无效的 docx 结构，未找到 word/document.xml。");
          }
        } else {
          if (enc === "AUTO") {
            decodedText = await decodeFileText(file);
          } else {
            const arrayBuffer = await file.arrayBuffer();
            const decoder = new TextDecoder(enc);
            decodedText = decoder.decode(new Uint8Array(arrayBuffer));
          }
        }
        
        setFileContent(decodedText);
        
        // Use AI to extract Name and Summarize Chat Style, but keep Personality/Background literal
        let parsedName = "";
        let parsedPersonality = decodedText.trim();
        let parsedNickname = "";
        let parsedChatStyle = "";
        let extractedNpcs: BoundNPC[] = [];

        if (settings && (settings.apiKey || settings.apiUrl)) {
          try {
            const aiResult = await apiAnalyzeCharacterFile({
              fileText: decodedText,
              fileName: file.name,
              settings
            });

            if (aiResult.success && aiResult.data) {
              const data = aiResult.data;
              if (data.name) parsedName = data.name;
              if (data.nickname && data.nickname !== "无") parsedNickname = data.nickname;
              // AI is instructed in prompt to copy personality and background verbatim.
              if (data.personality || data.background) {
                parsedPersonality = [data.personality, data.background].filter(Boolean).join("\n\n").trim();
              }
              if (data.chatStyle) parsedChatStyle = data.chatStyle;
              if (data.avatar) setAvatarPrompt(data.avatar);
            }
          } catch (aiErr) {
            console.warn("AI analysis failed during import:", aiErr);
          }
        }

        if (parsedNickname) setNickname(parsedNickname);

        // Fallback for Name if AI failed
        if (!parsedName) {
          const firstLine = decodedText.split(/\r?\n/)[0]?.trim();
          if (firstLine && firstLine.length < 15 && !firstLine.includes("设定") && !firstLine.includes("背景")) {
            parsedName = firstLine;
          } else {
            parsedName = fileName.replace(/\.[^/.]+$/, "");
          }
        }

        if (!parsedChatStyle) {
          parsedChatStyle = `作为${parsedName}，说话时字里行间流露出独特的个人特质与语气，语气真实生动，带有沉浸式动作与心理描写。`;
        }

        // Update form fields
        setName(parsedName);
        setPersonality(parsedPersonality);
        setChatStyle(parsedChatStyle);
        setBackground(""); // We merge background into personality now per user preference for "one field" logic

        // Automatically generate NPCs based on uploaded character file content
        if (settings && (settings.apiKey || settings.apiUrl)) {
          try {
            const npcPrompt = `你是一个角色关系网络生成器。请根据以下角色的人设背景，提炼生成 3 至 5 个与该角色相关的 NPC 联系人（如好友、同事、同学、搭档等）。
必须输出严格纯 JSON 数组（无 Markdown 代码块）：
[
  { "name": "中文姓名", "relationship": "与角色的关系", "description": "简介", "avatar": "Emoji" }
]

角色姓名：${parsedName}
背景内容：${decodedText.substring(0, 1500)}`;

            const responseText = await callLLM(settings.apiUrl, settings.apiKey, settings.model, [{ role: "user", content: npcPrompt }]);
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            const parsedNpcs = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
            
            if (Array.isArray(parsedNpcs) && parsedNpcs.length > 0) {
              extractedNpcs = parsedNpcs.map((item: any, idx: number) => ({
                id: `npc-file-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                name: item.name || `NPC`,
                avatar: item.avatar || "💬",
                relationship: item.relationship || "关系人",
                description: item.description || "背景相关人物"
              }));
            }
          } catch (npcErr) {
            console.warn("NPC generation failed:", npcErr);
          }
        }

        if (extractedNpcs.length === 0) {
          extractedNpcs = generateDefaultNpcsForCharacter(parsedName, parsedPersonality, "");
        }

        setBoundNpcs(extractedNpcs);
        setSuccessMsg("📂 角色文件导入成功！人设与背景已一字不差填入字段，聊天风格已智能总结。请核对并点击保存按钮。");
      } catch (err: any) {
        console.error("❌ [角色导入异常]:", err);
        setErrorMsg(err.message || "文件解析失败。");
      } finally {
        setIsImporting(false);
      }
    };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setSuccessMsg("");
    setImportedFile(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (importedFile) {
      processFile(importedFile, selectedEncoding);
    }
  }, [selectedEncoding, importedFile]);

  const handleClearImport = () => {
    setImportedFile(null);
    setFileContent("");
  };

  const runLocalParser = (fileText: string, fName: string) => {
    let parsedName = "";
    let parsedNickname = "";
    let parsedPersonality = "";
    let parsedChatStyle = "";
    let parsedDesc = "";
    let parsedBackground = "";

    const lines = fileText.split(/\r?\n/);
    let currentSection: 'personality' | 'chatStyle' | 'desc' | 'background' | null = null;
    let hasStructure = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed && currentSection === null) continue;

      // Prioritize name extraction
      if (!parsedName) {
        const nameMatch = trimmed.match(/^(?:姓名|角色名|主姓名|Name)\s*[:：]\s*(.+)$/i);
        if (nameMatch) {
          parsedName = nameMatch[1].trim();
          hasStructure = true;
          continue;
        }
      }

      const nickMatch = trimmed.match(/^(?:昵称|别名|小名|Nickname|Nick)\s*[:：]\s*(.+)$/i);
      if (nickMatch) {
        parsedNickname = nickMatch[1].trim();
        hasStructure = true;
        continue;
      }

      const descMatch = trimmed.match(/^(?:一句话介绍|简介|介绍|描述|Slogan|Bio|Description|Desc)\s*[:：]\s*(.+)$/i);
      if (descMatch) {
        parsedDesc = descMatch[1].trim();
        hasStructure = true;
        continue;
      }

      const styleMatch = trimmed.match(/^(?:聊天风格|说话方式|说话风格|口癖|Chat\s*Style|Style)\s*[:：]\s*(.+)$/i);
      if (styleMatch) {
        parsedChatStyle = styleMatch[1].trim();
        hasStructure = true;
        continue;
      }

      if (trimmed.match(/^(?:性格特点|性格|人设背景|人设|设定|角色设定|Personality|Character\s*Setting)\s*[:：]?$/i)) {
        currentSection = 'personality';
        hasStructure = true;
        continue;
      } else if (trimmed.match(/^(?:聊天风格|聊天口吻|说话方式|说话风格|口癖|Chat\s*Style|Style|Dialogue\s*Style)\s*[:：]?$/i)) {
        currentSection = 'chatStyle';
        hasStructure = true;
        continue;
      } else if (trimmed.match(/^(?:角色背景|背景故事|背景设定|故事|Background|Story)\s*[:：]?$/i)) {
        currentSection = 'background';
        hasStructure = true;
        continue;
      } else if (trimmed.match(/^(?:简介|描述|Description|Summary)\s*[:：]?$/i)) {
        currentSection = 'desc';
        hasStructure = true;
        continue;
      }

      if (currentSection === 'personality') {
        parsedPersonality += (parsedPersonality ? "\n" : "") + line;
      } else if (currentSection === 'chatStyle') {
        parsedChatStyle += (parsedChatStyle ? "\n" : "") + line;
      } else if (currentSection === 'background') {
        parsedBackground += (parsedBackground ? "\n" : "") + line;
      } else if (currentSection === 'desc') {
        parsedDesc += (parsedDesc ? "\n" : "") + line;
      }
    }

    if (!hasStructure || (!parsedName && !parsedPersonality)) {
      parsedPersonality = fileText;
      parsedName = fName.replace(/\.[^/.]+$/, "");
    }

    if (!parsedName) {
      const firstLine = fileText.split(/\r?\n/)[0]?.trim();
      if (firstLine && firstLine.length < 15 && !firstLine.includes("设定") && !firstLine.includes("背景")) {
        parsedName = firstLine;
      } else {
        parsedName = fName.replace(/\.[^/.]+$/, "");
      }
    }

    setName(parsedName);
    setNickname(parsedNickname);
    setPersonality(parsedPersonality.trim() || parsedDesc.trim());
    setBackground(parsedBackground.trim());
    setChatStyle(parsedChatStyle.trim() || `作为${parsedName}，说话时字里行间流露出独特的个人特质与语气，语气真实生动，带有沉浸式动作与心理描写。`);
  };

  const runAiAnalysis = async () => {
    if (!fileContent) {
      setErrorMsg("请先选择并解析一个设定文件。");
      return;
    }
    
    setErrorMsg("");
    setSuccessMsg("");
    setIsAnalyzing(true);
    
    try {
      if (!settings?.apiKey) {
        throw new Error("检测到未配置自定义 API 密钥，AI 智能提炼暂不可用。请点击右上角设置配置 API Key，或直接根据下方预览手动填写。");
      }
      
      const response = await apiAnalyzeCharacterFile({
        fileText: fileContent,
        fileName: importedFile?.name || "character.txt",
        settings
      });
      
      if (response?.success && response?.data) {
        const { name: aiName, nickname: aiNick, personality: aiPers, chatStyle: aiChat, background: aiBg, avatar: aiAvatar } = response.data;
        
        if (aiName) setName(aiName);
        if (aiNick && aiNick !== "无") setNickname(aiNick);
        if (aiPers) setPersonality(aiPers);
        if (aiBg) setBackground(aiBg);
        if (aiChat) setChatStyle(aiChat);
        if (aiAvatar) setAvatar(aiAvatar);
        
        setSuccessMsg("✨ AI 智能一键提炼成功！关键信息已填充至对应字段，您可以继续微调设定。");
      } else {
        throw new Error("AI 返回的数据为空或格式不正确。");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`AI 智能提炼失败: ${err.message || "未知错误"}。您现在可以根据下方人设预览直接手动填写。`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    console.log(`[Character Save Start] editingId=${editingId}, forceSave=${forceSave}, name="${name}"`);

    let finalName = name.trim();
    let finalPersonality = personality.trim();
    let finalChatStyle = chatStyle.trim();

    if (!forceSave) {
      if (!finalName) {
        const err = "请填写角色名字 (Name is required)";
        console.error("[Character Save Validation Failed]", err);
        setErrorMsg(err);
        return;
      }

      if (!finalPersonality) {
        finalPersonality = "注重角色故事细节与性格魅力的全情设定。";
      }
      if (!finalChatStyle) {
        finalChatStyle = `作为${finalName}，说话时字里行间流露出独特的个人特质与语气，语气真实生动，带有沉浸式动作与心理描写。`;
      }
    } else {
      console.warn("[Character Save Warning] Force Save Mode Active! Bypassing field validations.");
      if (!finalName) finalName = "未命名角色";
      if (!finalPersonality) finalPersonality = "自定义人设背景";
      if (!finalChatStyle) finalChatStyle = "第一人称沉浸对话";
    }

    // Auto-generate system instruction combining name, nickname, personality, background, and chat style
    const systemInstruction = `你正在扮演角色 "${finalName}"。

【基本设定 / 人设 (Personality Profile)】:
- 姓名: ${finalName}
- 别名/昵称: ${nickname.trim() || "无"}

【性格特点 (Personality)】:
${finalPersonality}

【角色背景 (Background & Story)】:
${background.trim() || "暂无背景故事"}

【语言口吻与聊天风格 (Chatting Style & Tone)】:
- ${finalChatStyle}
- 保持第一人称视角的沉浸式对话。
- 适当在动作或神态描述旁添加星号 (*), 例如：*微微一笑* 或 *叹了口气*，以此渲染对话环境。
- 【聊天自然度准则】：不要刻意重复你的人设背景（如：“我是心理咨询师”、“我三年前经历过那件事”），只在相关语境下自然提及。像一个真实的人一样说话，话题自然流动，不要时刻提醒对方你的背景是什么。人设背景的作用是塑造你的性格和说话方式，而不是作为聊天的固定话题。
- 绝不脱离设定，拒绝扮演旁观者或 AI 助手。`;

    try {
      const payload = {
        name: finalName,
        nickname: nickname.trim(),
        avatar,
        description: finalPersonality.length > 40 ? finalPersonality.substring(0, 40) + "..." : finalPersonality,
        systemInstruction,
        model: settings?.model, // Default to current global model
        realImage: realImage || undefined,
        chatAvatar: chatAvatar || undefined,
        userPersonaId: selectedPersonaId || undefined,
        boundNpcs: boundNpcs,
        associatedCharacterIds: associatedCharacterIds,
        associatedRelations: associatedRelations,
      };

      console.log("[Character Save Payload]", {
        editingId,
        name: payload.name,
        avatar: payload.avatar,
        hasRealImage: !!payload.realImage,
        realImageLength: payload.realImage?.length || 0,
        hasChatAvatar: !!payload.chatAvatar,
        chatAvatarLength: payload.chatAvatar?.length || 0,
        boundNpcsCount: payload.boundNpcs?.length || 0,
      });

      if (editingId) {
        if (onUpdateCharacter) {
          onUpdateCharacter(editingId, payload);
        }
        setSuccessMsg(`✨ 角色 "${finalName}" 及 ${boundNpcs.length} 个绑定 NPC 信息已修改成功！`);
      } else {
        onAddCharacter(payload);
        setSuccessMsg(`✨ 角色 "${finalName}" 建立保存成功！已自动绑定 ${boundNpcs.length} 个 NPC。您可以继续编辑确认。`);
      }
      
      setForceSave(false);
      handleClearImport();
      // Notice: stay on current page and do NOT switch tabs to list, per user request.
    } catch (err: any) {
      console.error("[Character Save Fatal Error]:", err);
      setErrorMsg(`保存失败: ${err?.message || err}`);
    }
  };



  const handleApplyStylePreset = (styleText: string) => {
    setChatStyle(styleText);
  };

  const displayCharacters = characters;

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900 select-none animate-slide-up min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
        <button 
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-mono font-bold text-sm tracking-widest text-neutral-950 uppercase">角色工坊 (CREATOR)</span>
        <div className="w-7 h-7" /> {/* spacer */}
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-neutral-100 bg-neutral-50 shrink-0">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider font-mono border-b-2 transition-all ${
            activeTab === "create"
              ? "border-black text-black bg-white"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          {editingId ? "编辑角色 (EDITING)" : "建立角色 (NEW)"}
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-3 text-xs font-semibold tracking-wider font-mono border-b-2 transition-all ${
            activeTab === "list"
              ? "border-black text-black bg-white"
              : "border-transparent text-neutral-400 hover:text-neutral-700"
          }`}
        >
          角色列表 ({characters.length})
        </button>
      </div>

      {/* Content scroll area */}
      {activeTab === "create" ? (
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {successMsg && (
            <div className="p-3 bg-neutral-950 text-white text-[11px]  rounded-xl border border-neutral-800 flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-white" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-100 text-[11px] text-red-700 rounded-xl flex items-start gap-1.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File Import Panel */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/60 border-dashed space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neutral-950 animate-pulse" />
                <span className="text-[11px] font-bold  text-neutral-950">智能一键导入人设文档</span>
              </div>
              <span className="text-[9px] font-mono font-medium text-neutral-400 uppercase">.docx / .txt</span>
            </div>
            
            <p className="text-[10px] text-neutral-500 leading-relaxed ">
              导入现成的角色大纲、设定文本或剧本。人设背景将<b>原封不动地全部倒入</b>，AI 只需自动精准提取识别角色的<b>姓名、年龄与聊天风格</b>，为您省去繁琐填充！
            </p>

            <div className="relative">
              <input
                type="file"
                accept=".txt,.docx"
                onChange={handleFileImport}
                disabled={isImporting}
                className="hidden"
                ref={fileInputRef}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-2.5 rounded-xl border text-[11px] font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isImporting
                    ? "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed"
                    : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200/80 active:scale-95 shadow-sm"
                }`}
              >
                {isImporting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                    正在智能解析中...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    选择 docx 或 txt 文本导入
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Custom Images Upload Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-50/50 rounded-2xl border border-neutral-200/40">
            {/* Chat Avatar Image */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">自定义聊天头像 (Optional)</span>
              <div className="relative h-24 border border-neutral-200/80 rounded-xl bg-white flex flex-col items-center justify-center overflow-hidden group shadow-sm">
                {chatAvatar ? (
                  <>
                    <img src={chatAvatar} className="w-full h-full object-cover" alt="Chat Avatar Preview" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setChatAvatar("")}
                      className="absolute top-1.5 right-1.5 bg-black/80 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-black transition-all"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-2 text-center transition-colors hover:bg-neutral-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "chat")}
                      className="hidden"
                    />
                    <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center mb-1 text-neutral-500">
                      <Smile className="w-4 h-4 text-neutral-400" />
                    </div>
                    <span className="text-[10px] text-neutral-700  font-bold">上传聊天头像</span>
                    <span className="text-[8px] text-neutral-400 ">正方形比例最佳</span>
                  </label>
                )}
              </div>
            </div>

            {/* Real Appearance Image */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">真实面貌/立绘 (Optional)</span>
              <div className="relative h-24 border border-neutral-200/80 rounded-xl bg-white flex flex-col items-center justify-center overflow-hidden group shadow-sm">
                {realImage ? (
                  <>
                    <img src={realImage} className="w-full h-full object-cover" alt="Real Appearance Preview" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => setRealImage("")}
                      className="absolute top-1.5 right-1.5 bg-black/80 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-black transition-all"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-2 text-center transition-colors hover:bg-neutral-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "real")}
                      className="hidden"
                    />
                    <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center mb-1 text-neutral-500">
                      <Upload className="w-4 h-4 text-neutral-400" />
                    </div>
                    <span className="text-[10px] text-neutral-700  font-bold">上传真实面貌</span>
                    <span className="text-[8px] text-neutral-400 ">高分辨率半身照</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Name Input Only */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">角色名字 (Name)</label>
            <input
              type="text"
              placeholder="例如: 银翼赏金猎人"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">绑定用户设定 (User Persona)</label>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none"
            >
              <option value="">不绑定 (无)</option>
              {userPersonas.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Associated Characters */}
          <div className="space-y-2 border border-neutral-200/50 rounded-2xl p-4 bg-neutral-50/50">
            <div className="space-y-0.5">
              <label className="text-xs font-bold text-neutral-900 block">关联角色 (Associated Characters)</label>
              <span className="text-[10px] text-neutral-400 font-mono block uppercase">WORLDVIEW ASSOCIATIONS</span>
            </div>

            {characters.filter(c => c.id !== editingId).length === 0 ? (
              <p className="text-[11px] text-neutral-400 italic">暂无其他角色可供关联，创建更多角色后可在此建立关系纽带。</p>
            ) : (
              <div className="space-y-3">
                {/* Checkbox list of other characters */}
                <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto">
                  {characters.filter(c => c.id !== editingId).map(c => {
                    const isChecked = associatedCharacterIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleAssociation(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                          isChecked
                            ? "bg-black text-white border-black shadow-sm animate-scale-up"
                            : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        <span className="text-sm">{c.avatar || "🤖"}</span>
                        <span>{c.name}</span>
                        {isChecked && <Check className="w-3 h-3 text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                {/* Warning / Prompt text */}
                <p className="text-[10px] text-neutral-400 leading-relaxed bg-white border border-neutral-100 p-2 rounded-lg">
                  💡 建议选择存在于同一世界或人设背景相近的角色进行关联，互动会更自然。
                </p>

                {/* Relationship details editor */}
                {associatedCharacterIds.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200/40 space-y-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase block">关系设定明细 (RELATIONSHIP SETTINGS)</span>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {associatedCharacterIds.map(id => {
                        const otherChar = characters.find(o => o.id === id);
                        if (!otherChar) return null;
                        const currentRel = associatedRelations[id] || "";
                        const isGenerating = isGeneratingRelation[id];

                        return (
                          <div key={id} className="bg-white border border-neutral-200/60 p-2.5 rounded-xl space-y-1.5 shadow-sm">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1 text-xs font-bold text-neutral-800">
                                <span>{otherChar.avatar || "🤖"}</span>
                                <span>与 {otherChar.name} 的关系：</span>
                              </div>
                              {isGenerating ? (
                                <div className="flex items-center gap-1 text-[9px] text-neutral-400">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  <span>AI 设定中...</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setIsGeneratingRelation(prev => ({ ...prev, [id]: true }));
                                    const refined = await generateRelationWithAI(
                                      name || "此角色",
                                      personality || background || "普通角色背景",
                                      otherChar.name,
                                      otherChar.systemInstruction || otherChar.description || "普通角色背景"
                                    );
                                    setAssociatedRelations(prev => ({ ...prev, [id]: refined }));
                                    setIsGeneratingRelation(prev => ({ ...prev, [id]: false }));
                                  }}
                                  className="text-[9px] text-stone-500 hover:text-black font-semibold hover:underline"
                                >
                                  ✨ AI 重新生成
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={currentRel}
                              placeholder="例如: 他们是在时空中迷失并偶然相遇的旅人。"
                              onChange={e => {
                                const val = e.target.value;
                                setAssociatedRelations(prev => ({
                                  ...prev,
                                  [id]: val
                                }));
                              }}
                              className="w-full text-xs border border-neutral-100 focus:border-neutral-300 px-2.5 py-1.5 rounded-lg bg-neutral-50 focus:bg-white text-neutral-700 outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Personality Description (人设) */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">角色设定 / 人设背景 (Personality Profile)</label>
            <textarea
              rows={4}
              placeholder="详细描写角色身份、性格特征、过往经历。例如: 曾是机械义体突击队员，因看清集团黑幕而离职，为人冷酷执着，对无辜民众抱有同情心..."
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none resize-none leading-relaxed "
            />
          </div>

          {/* Chat style (聊天风格) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">聊天口吻 / 风格设定 (Chat Style)</label>
              <span className="text-[9px] text-neutral-400">点击下方快捷风格导入:</span>
            </div>
            
            {/* Quick Presets */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none flex-wrap">
              {PRESET_STYLES.map((style) => (
                <button
                  type="button"
                  key={style.name}
                  onClick={() => handleApplyStylePreset(style.placeholder)}
                  className="text-[9px]  px-2 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/50 rounded-lg text-neutral-600 active:scale-95 transition-all"
                >
                  {style.name}
                </button>
              ))}
            </div>

            <textarea
              rows={3.5}
              placeholder="指定角色的说话习惯和特色语气。例如: 说话经常带有省略号，带着淡淡的疲惫感；在句末喜欢使用『...』；在遇到挑衅时会发出冷笑 *轻抚配枪，冷笑一声*..."
              value={chatStyle}
              onChange={(e) => setChatStyle(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none resize-none leading-relaxed "
            />
          </div>

          {/* Bound NPCs Section */}
          <div className="space-y-2.5 p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-200/60">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-800" />
                <span className="text-[11px] font-bold text-neutral-900">绑定 NPC 联系人</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded-md">
                  当前: {boundNpcs.length} 个
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleGenerateNpcsWithAI}
                  disabled={isGeneratingNpcsAI}
                  className="text-[10px] font-bold text-white bg-neutral-900 hover:bg-black flex items-center gap-1 px-2.5 py-1 rounded-lg active:scale-95 transition-all shadow-xs disabled:opacity-50"
                  title="生成 3-5 个新 NPC"
                >
                  {isGeneratingNpcsAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                  <span>生成 3-5 个新 NPC</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddNpc}
                  className="text-[10px] font-mono font-bold text-neutral-800 hover:text-black flex items-center gap-1 bg-white border border-neutral-200 px-2 py-1 rounded-lg active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  手动加
                </button>
              </div>
            </div>

            <p className="text-[10px] text-neutral-500 leading-relaxed">
              初始 NPC 数量为 0。只有在上传角色文件后系统才会根据内容自动生成对应的 NPC。您也可以手动添加或点击重新生成。
            </p>

            {boundNpcs.length === 0 ? (
              <div className="p-4 bg-white border border-dashed border-neutral-300 rounded-xl text-center space-y-1">
                <p className="text-xs font-medium text-neutral-500">暂无绑定 NPC (初始数量 0)</p>
                <p className="text-[10px] text-neutral-400">上传角色故事文件将根据内容自动生成 NPC，或点击右上角按钮手动添加</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {boundNpcs.map((npc, idx) => (
                  <div key={npc.id || idx} className="p-3 bg-white border border-neutral-200/90 rounded-xl space-y-2 shadow-2xs w-full max-w-full overflow-hidden">
                    {/* Upper Row: Avatar + Name (Large text) + Delete */}
                    <div className="flex items-center gap-2.5 w-full">
                      <input
                        type="text"
                        value={npc.avatar || "💬"}
                        onChange={(e) => handleUpdateNpc(npc.id, "avatar", e.target.value)}
                        className="w-9 h-9 text-center text-base border border-neutral-200 rounded-xl bg-neutral-50 outline-none shrink-0 focus:border-neutral-800"
                        title="Emoji 头像"
                      />
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="NPC 姓名 (如: 林墨)"
                          value={npc.name}
                          onChange={(e) => handleUpdateNpc(npc.id, "name", e.target.value)}
                          className="w-full text-sm font-bold text-neutral-900 border border-neutral-200 focus:border-neutral-900 px-2.5 py-1 rounded-lg bg-white outline-none placeholder:text-neutral-300 placeholder:font-normal"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNpc(npc.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="删除 NPC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Lower Row: Relationship (Small text, warm gray styling, separate line) */}
                    <div className="flex items-center gap-1.5 w-full pl-11">
                      <span className="text-[10px] text-stone-500 font-medium shrink-0">关系:</span>
                      <input
                        type="text"
                        placeholder="与角色的关系 (如: 大学同寝室友)"
                        value={npc.relationship || ""}
                        onChange={(e) => handleUpdateNpc(npc.id, "relationship", e.target.value)}
                        className="w-full text-[11px] text-stone-600 font-medium border border-stone-200/80 focus:border-stone-700 px-2.5 py-1 rounded-lg bg-stone-50/80 outline-none placeholder:text-stone-300"
                      />
                    </div>

                    {/* Bottom Row: Description */}
                    <div className="w-full pl-11">
                      <input
                        type="text"
                        placeholder="NPC 简介 / 性格特点"
                        value={npc.description || ""}
                        onChange={(e) => handleUpdateNpc(npc.id, "description", e.target.value)}
                        className="w-full text-[11px] text-neutral-600 border border-neutral-200/80 focus:border-neutral-900 px-2.5 py-1 rounded-lg bg-neutral-50/60 outline-none placeholder:text-neutral-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Force Save Switch / Diagnostics */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${forceSave ? "text-amber-500 fill-amber-500 animate-bounce" : "text-neutral-400"}`} />
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-neutral-800">强制保存模式 (绕过字段校验)</span>
                <span className="text-[9px] text-neutral-400">开启后将跳过必填项校验，直接写入角色与头像数据</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForceSave(!forceSave)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                forceSave
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
              }`}
            >
              {forceSave ? "已开启" : "关闭中"}
            </button>
          </div>

          {/* Submit button */}
          <div className="flex gap-2">
            <button
              type="submit"
              className={`flex-1 text-xs font-mono font-bold tracking-widest text-white py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                forceSave ? "bg-amber-600 hover:bg-amber-700" : "bg-black hover:bg-neutral-800"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              {editingId ? (forceSave ? "⚡ 强制修改保存角色" : "保存角色修改 (SAVE CHANGES)") : (forceSave ? "⚡ 强制保存角色" : "保存角色 (SAVE CHARACTER)")}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 text-xs font-mono font-bold tracking-widest text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-all"
              >
                取消
              </button>
            )}
          </div>
        </form>
      ) : (
        /* MY CHARACTERS LIST */
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50 min-h-0">
          {displayCharacters.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Edit3 className="w-8 h-8 text-neutral-300 mx-auto stroke-[1.5]" />
              <p className="text-xs text-neutral-400 ">
                还没有建立过任何角色。
              </p>
              <button
                onClick={() => setActiveTab("create")}
                className="text-[10px] font-semibold text-neutral-800 underline uppercase tracking-wider"
              >
                现在去建立
              </button>
            </div>
          ) : (
            displayCharacters.map((char) => (
              <div
                key={char.id}
                className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex flex-col gap-3 hover:border-neutral-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      <CharacterAvatar character={char} mode="real" size={40} className="rounded-xl border border-neutral-100" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className=" font-bold text-sm text-neutral-950">{char.name}</h3>
                        {char.isPreset && (
                          <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-[9px] font-mono rounded-md border border-neutral-200">
                            内置角色
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-neutral-400">
                        {char.isPreset ? "默认预设角色" : `建立于 ${new Date(char.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(char)}
                      className="p-2 text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
                      title="编辑角色"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-[10px]  font-bold">编辑</span>
                    </button>
                    <button
                      onClick={() => onNavigateToChat(char.id)}
                      className="p-2 text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
                      title="开始对话"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px]  font-bold">对话</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmChar(char)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                      title="删除角色及记忆"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span className="text-[10px]  font-bold text-red-600">删除</span>
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 space-y-1.5 text-xs text-neutral-600">
                  <div className=" text-[11px] leading-relaxed">
                    <span className="font-bold text-neutral-800">一句话：</span>
                    {char.description}
                  </div>
                  <div className=" text-[10px] text-neutral-400 line-clamp-3 leading-relaxed">
                    <span className="font-bold text-neutral-500">人设指令片段：</span>
                    {char.systemInstruction}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmChar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl border border-neutral-200/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className=" font-bold text-sm text-neutral-900">是否删除角色？</h3>
                <p className="text-[11px] font-mono text-neutral-500">{deleteConfirmChar.name}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed  bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              点击<b>【是】</b>可删除该角色的所有记忆和相关内容（包含聊天记录、偏好设置、随手记及衍生信息）。
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmChar(null)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono font-bold text-neutral-600 hover:bg-neutral-50 transition-all"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmChar) {
                    onDeleteCharacter(deleteConfirmChar.id);
                    setDeleteConfirmChar(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-xs font-mono font-bold text-white transition-all shadow-sm"
              >
                是 (确认删除)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

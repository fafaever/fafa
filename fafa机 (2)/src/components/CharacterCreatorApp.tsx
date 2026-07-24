import React, { useState, useEffect } from "react";
import { ChevronLeft, UserPlus, Sparkles, AlertCircle, Smile, HelpCircle, Edit3, MessageSquare, Trash2, Check, Upload, FileText, Zap } from "lucide-react";

import { Character, AppSettings } from "../types";
import { apiAnalyzeCharacterFile } from "../lib/api";
import JSZip from "jszip";

interface CharacterCreatorAppProps {
  characters: Character[];
  settings?: AppSettings;
  onAddCharacter: (char: Omit<Character, "id" | "createdAt">) => void;
  onUpdateCharacter?: (id: string, char: Omit<Character, "id" | "createdAt">) => void;
  onDeleteCharacter: (id: string) => void;
  onClose: () => void;
  onNavigateToChat: (characterId: string) => void;
}

const compressAndResizeImage = (file: File, maxDimension = 300, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片文件失败"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("加载图片格式失败"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (err) {
          console.error("[Canvas Compress Warning] Exception during image compression:", err);
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const getAgeFromInstruction = (inst: string): string => {
  if (!inst) return "不详";
  const match = inst.match(/-\s*(?:年龄|岁数|Age)\s*[:：]\s*([^\n]+)/i);
  return match ? match[1].trim() : "不详";
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
  const [age, setAge] = useState(""); // 角色年龄
  const [background, setBackground] = useState(""); // 角色背景
  const [personality, setPersonality] = useState(""); // 人设 / 性格特点
  const [chatStyle, setChatStyle] = useState(""); // 聊天风格
  const [desc, setDesc] = useState(""); // 一句话简介
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
    setAge(getAgeFromInstruction(char.systemInstruction));
    setNickname(getNicknameFromInstruction(char.systemInstruction));
    setPersonality(getPersonalityFromInstruction(char.systemInstruction));
    setBackground(getBackgroundFromInstruction(char.systemInstruction));
    setChatStyle(getChatStyleFromInstruction(char.systemInstruction));
    setDesc(char.description || "");
    setRealImage(char.realImage || "");
    setChatAvatar(char.chatAvatar || "");
    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab("create");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName("");
    setNickname("");
    setAvatar("🤖");
    setAge("");
    setPersonality("");
    setBackground("");
    setChatStyle("");
    setDesc("");
    setRealImage("");
    setChatAvatar("");
    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab("list");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "real" | "chat") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("只支持上传图片格式文件。");
      return;
    }

    try {
      const dataUrl = await compressAndResizeImage(file);
      if (type === "real") {
        setRealImage(dataUrl);
      } else {
        setChatAvatar(dataUrl);
      }
      setSuccessMsg("图片上传成功！");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`图片解析失败: ${err.message || "未知错误"}`);
    } finally {
      e.target.value = "";
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
        const arrayBuffer = await file.arrayBuffer();
        if (enc === "AUTO") {
          const decoderUTF8 = new TextDecoder("utf-8", { fatal: true });
          try {
            decodedText = decoderUTF8.decode(new Uint8Array(arrayBuffer));
          } catch (e) {
            const decoderGBK = new TextDecoder("gbk");
            decodedText = decoderGBK.decode(new Uint8Array(arrayBuffer));
          }
        } else {
          const decoder = new TextDecoder(enc);
          decodedText = decoder.decode(new Uint8Array(arrayBuffer));
        }
      }
      
      setFileContent(decodedText);
      
      // Perform local extraction
      let parsedName = "";
      let parsedNickname = "";
      let parsedAge = "";
      let parsedPersonality = "";
      let parsedChatStyle = "";
      let parsedDesc = "";
      let parsedBackground = "";

      const lines = decodedText.split(/\r?\n/);
      let currentSection: 'personality' | 'chatStyle' | 'desc' | 'background' | null = null;
      let hasStructure = false;

      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const nameMatch = trimmed.match(/^(?:姓名|名字|名称|角色名|主姓名|Name)\s*[:：]\s*(.+)$/i);
        if (nameMatch) {
          parsedName = nameMatch[1].trim();
          hasStructure = true;
          continue;
        }

        const nickMatch = trimmed.match(/^(?:昵称|别名|小名|Nickname|Nick)\s*[:：]\s*(.+)$/i);
        if (nickMatch) {
          parsedNickname = nickMatch[1].trim();
          hasStructure = true;
          continue;
        }

        const ageMatch = trimmed.match(/^(?:年龄|岁数|Age)\s*[:：]\s*(.+)$/i);
        if (ageMatch) {
          parsedAge = ageMatch[1].trim();
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
          parsedPersonality += (parsedPersonality ? "\n" : "") + trimmed;
        } else if (currentSection === 'chatStyle') {
          parsedChatStyle += (parsedChatStyle ? "\n" : "") + trimmed;
        } else if (currentSection === 'background') {
          parsedBackground += (parsedBackground ? "\n" : "") + trimmed;
        } else if (currentSection === 'desc') {
          parsedDesc += (parsedDesc ? "\n" : "") + trimmed;
        }
      }

      if (!hasStructure || (!parsedName && !parsedPersonality)) {
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        parsedName = baseName;
        parsedPersonality = decodedText.trim();
      }

      console.log("=== [角色导入过程日志] ===");
      console.log("📄 导入文件名:", fileName);
      console.log("👤 提取姓名:", parsedName);
      console.log("🎂 提取年龄:", parsedAge);
      console.log("📝 提取简介:", parsedDesc);
      console.log("💭 提取性格特点:", parsedPersonality);
      console.log("💬 提取聊天风格:", parsedChatStyle);
      console.log("🏞️ 提取背景设定:", parsedBackground);

      // Validate critical fields: name and age
      const missingFields: string[] = [];
      if (!parsedName) missingFields.push("姓名 (Name)");
      if (!parsedAge) missingFields.push("年龄 (Age)");

      if (missingFields.length > 0) {
        console.warn("⚠️ [角色导入警告] 数据不完整。 缺失字段:", missingFields.join(", "));
        
        // If name is missing, we can use the filename as a fallback
        if (!parsedName) {
          parsedName = fileName.replace(/\.[^/.]+$/, "");
        }
        
        // If age is missing, we don't throw error immediately, instead we allow the user to see what's extracted
        // and fill in the rest. 
        if (!parsedAge) {
          setErrorMsg(`角色数据不完全，缺失字段: ${missingFields.join(", ")}。请在下方手动补充。`);
          // We don't throw here anymore, we let it proceed to fill whatever it found.
        }
      }

      const finalPersonality = parsedPersonality || parsedDesc || "注重角色故事细节与性格魅力的全情设定。";
      const finalChatStyle = parsedChatStyle || "自然流利的日常交谈口吻。";
      const finalDesc = parsedDesc || (finalPersonality.length > 50 ? finalPersonality.substring(0, 50) + "..." : finalPersonality);
      
      // Update form fields for visual feedback
      setName(parsedName);
      setNickname(parsedNickname);
      setAge(parsedAge);
      setPersonality(parsedPersonality);
      setBackground(parsedBackground);
      setChatStyle(parsedChatStyle);
      setDesc(finalDesc);

      if (parsedName && parsedAge) {
        const systemInstruction = `你将扮演 ${parsedName} (年龄: ${parsedAge})。
以下是你的设定与背景故事：
${parsedBackground || "无"}

性格特征：
${finalPersonality}

聊天风格：
- ${finalChatStyle}
- 保持第一人称视角的沉浸式对话。
- 适当在动作或神态描述旁添加星号 (*), 例如：*微微一笑* 或 *叹了口气*，以此渲染对话环境。
- 绝不脱离设定，拒绝扮演旁观 of AI 助手。`;

        const payload = {
          name: parsedName,
          avatar: "🤖",
          description: finalDesc,
          systemInstruction,
          realImage: undefined,
          chatAvatar: undefined,
        };

        console.log("💾 [角色导入保存 Payload]", payload);

        // Save directly to localStorage/state via onAddCharacter
        onAddCharacter(payload);

        console.log("✅ [角色导入成功] 已成功存入 localStorage 并更新角色列表！");
        setSuccessMsg("🎉 角色导入并保存成功！");
        
        // Instantly switch to character list to show the imported character
        setTimeout(() => {
          setSuccessMsg("");
          setActiveTab("list");
        }, 1000);
      } else {
        setSuccessMsg("📂 已提取部分数据，请补全标红必填项后点击保存。");
      }

    } catch (err: any) {
      console.error("❌ [角色导入异常]:", err);
      setErrorMsg(err.message || "文件解析或导入失败，请重试。");
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
    let parsedAge = "";
    let parsedPersonality = "";
    let parsedChatStyle = "";
    let parsedDesc = "";
    let parsedBackground = "";

    const lines = fileText.split(/\r?\n/);
    let currentSection: 'personality' | 'chatStyle' | 'desc' | 'background' | null = null;
    let hasStructure = false;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const nameMatch = trimmed.match(/^(?:姓名|名字|名称|角色名|主姓名|Name)\s*[:：]\s*(.+)$/i);
      if (nameMatch) {
        parsedName = nameMatch[1].trim();
        hasStructure = true;
        continue;
      }

      const nickMatch = trimmed.match(/^(?:昵称|别名|小名|Nickname|Nick)\s*[:：]\s*(.+)$/i);
      if (nickMatch) {
        parsedNickname = nickMatch[1].trim();
        hasStructure = true;
        continue;
      }

      const ageMatch = trimmed.match(/^(?:年龄|岁数|Age)\s*[:：]\s*(.+)$/i);
      if (ageMatch) {
        parsedAge = ageMatch[1].trim();
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
        parsedPersonality += (parsedPersonality ? "\n" : "") + trimmed;
      } else if (currentSection === 'chatStyle') {
        parsedChatStyle += (parsedChatStyle ? "\n" : "") + trimmed;
      } else if (currentSection === 'background') {
        parsedBackground += (parsedBackground ? "\n" : "") + trimmed;
      } else if (currentSection === 'desc') {
        parsedDesc += (parsedDesc ? "\n" : "") + trimmed;
      }
    }

    if (!hasStructure || (!parsedName && !parsedPersonality)) {
      const baseName = fName.replace(/\.[^/.]+$/, "");
      parsedName = baseName;
      parsedPersonality = fileText.trim();
    }

    setName(parsedName);
    setNickname(parsedNickname);
    setAge(parsedAge);
    setPersonality(parsedPersonality);
    setBackground(parsedBackground);
    setChatStyle(parsedChatStyle);
    setDesc(parsedDesc || (parsedPersonality.length > 50 ? parsedPersonality.slice(0, 50) + "..." : parsedPersonality));
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
        const { name: aiName, nickname: aiNick, age: aiAge, personality: aiPers, chatStyle: aiChat, background: aiBg, description: aiDesc, avatar: aiAvatar } = response.data;
        
        if (aiName) setName(aiName);
        if (aiNick && aiNick !== "无") setNickname(aiNick);
        if (aiAge) setAge(aiAge);
        if (aiPers) setPersonality(aiPers);
        if (aiBg) setBackground(aiBg);
        if (aiChat) setChatStyle(aiChat);
        if (aiDesc) setDesc(aiDesc);
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
        finalPersonality = desc.trim() || "注重角色故事细节与性格魅力的全情设定。";
      }
      if (!finalChatStyle) {
        finalChatStyle = "保持自然流畅的第一人称角色口吻，带有情感与心理动作描写。";
      }
    } else {
      console.warn("[Character Save Warning] Force Save Mode Active! Bypassing field validations.");
      if (!finalName) finalName = "未命名角色";
      if (!finalPersonality) finalPersonality = "自定义人设背景";
      if (!finalChatStyle) finalChatStyle = "第一人称沉浸对话";
    }

    // Auto-generate system instruction combining name, nickname, age, personality, background, and chat style
    const systemInstruction = `你正在扮演角色 "${finalName}"。

【基本设定 / 人设 (Personality Profile)】:
- 姓名: ${finalName}
- 别名/昵称: ${nickname.trim() || "无"}
- 年龄: ${age.trim() || "不详"}

【性格特点 (Personality)】:
${finalPersonality}

【角色背景 (Background & Story)】:
${background.trim() || "暂无背景故事"}

【语言口吻与聊天风格 (Chatting Style & Tone)】:
- ${finalChatStyle}
- 保持第一人称视角的沉浸式对话。
- 适当在动作或神态描述旁添加星号 (*), 例如：*微微一笑* 或 *叹了口气*，以此渲染对话环境。
- 绝不脱离设定，拒绝扮演旁观 of AI 助手。`;

    try {
      const payload = {
        name: finalName,
        avatar,
        description: desc.trim() || `${finalPersonality.substring(0, 30)}...`,
        systemInstruction,
        realImage: realImage || undefined,
        chatAvatar: chatAvatar || undefined,
      };

      console.log("[Character Save Payload]", {
        editingId,
        name: payload.name,
        avatar: payload.avatar,
        hasRealImage: !!payload.realImage,
        realImageLength: payload.realImage?.length || 0,
        hasChatAvatar: !!payload.chatAvatar,
        chatAvatarLength: payload.chatAvatar?.length || 0,
      });

      if (editingId) {
        if (onUpdateCharacter) {
          onUpdateCharacter(editingId, payload);
        }
        setSuccessMsg(`角色 "${finalName}" 头像与设定修改成功！`);
      } else {
        onAddCharacter(payload);
        setSuccessMsg(`角色 "${finalName}" 建立并保存成功！`);
      }
      
      // Reset form
      setEditingId(null);
      setName("");
      setNickname("");
      setAvatar("🤖");
      setAge("");
      setBackground("");
      setPersonality("");
      setChatStyle("");
      setDesc("");
      setRealImage("");
      setChatAvatar("");
      setForceSave(false);
      handleClearImport();

      // Auto switch to list to show created character
      setTimeout(() => {
        setSuccessMsg("");
        setActiveTab("list");
      }, 1200);
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
            <div className="p-3 bg-neutral-950 text-white text-[11px] font-sans rounded-xl border border-neutral-800 flex items-center gap-2 animate-fade-in">
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
                <span className="text-[11px] font-bold font-sans text-neutral-950">智能一键导入人设文档</span>
              </div>
              <span className="text-[9px] font-mono font-medium text-neutral-400 uppercase">.docx / .txt</span>
            </div>
            
            <p className="text-[10px] text-neutral-500 leading-relaxed font-sans">
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
                    <span className="text-[10px] text-neutral-700 font-sans font-bold">上传聊天头像</span>
                    <span className="text-[8px] text-neutral-400 font-sans">正方形比例最佳</span>
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
                    <span className="text-[10px] text-neutral-700 font-sans font-bold">上传真实面貌</span>
                    <span className="text-[8px] text-neutral-400 font-sans">高分辨率半身照</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Avatar selector & Name & Age */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">头像</label>
              <div className="relative">
                <select
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full text-center text-lg border border-neutral-200 focus:border-neutral-950 py-2 rounded-xl bg-white outline-none cursor-pointer appearance-none"
                >
                  {!PRESET_AVATARS.includes(avatar) && (
                    <option value={avatar}>{avatar} (导入)</option>
                  )}
                  {PRESET_AVATARS.map((av) => (
                    <option key={av} value={av}>{av}</option>
                  ))}
                </select>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-lg">
                  {avatar}
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
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
              <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">年龄 (Age)</label>
              <input
                type="text"
                placeholder="例如: 24 / 不详"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none text-center"
              />
            </div>
          </div>

          {/* Quick Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">一句话简介 (Slogan / Bio)</label>
            <input
              type="text"
              placeholder="例如: 常年穿梭于霓虹雨夜中的独行枪手。"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2 rounded-xl bg-white text-neutral-800 outline-none"
            />
          </div>

          {/* Personality Description (人设) */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">角色设定 / 人设背景 (Personality Profile)</label>
            <textarea
              rows={4}
              placeholder="详细描写角色身份、性格特征、过往经历。例如: 曾是机械义体突击队员，因看清集团黑幕而离职，为人冷酷执着，对无辜民众抱有同情心..."
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none resize-none leading-relaxed font-sans"
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
                  className="text-[9px] font-sans px-2 py-1 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/50 rounded-lg text-neutral-600 active:scale-95 transition-all"
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
              className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white text-neutral-800 outline-none resize-none leading-relaxed font-sans"
            />
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
              {editingId ? (forceSave ? "⚡ 强制修改保存角色" : "保存并修改角色 (SAVE CHANGES)") : (forceSave ? "⚡ 强制建立保存角色" : "建立并保存角色 (SAVE AGENT)")}
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
              <p className="text-xs text-neutral-400 font-sans">
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
                    <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center overflow-hidden text-xl shadow-inner shrink-0">
                      {char.chatAvatar ? (
                        <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        char.avatar
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans font-bold text-sm text-neutral-950">{char.name}</h3>
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
                      <span className="text-[10px] font-sans font-bold">编辑</span>
                    </button>
                    <button
                      onClick={() => onNavigateToChat(char.id)}
                      className="p-2 text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1"
                      title="开始对话"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-sans font-bold">对话</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmChar(char)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                      title="删除角色及记忆"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span className="text-[10px] font-sans font-bold text-red-600">删除</span>
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 space-y-1.5 text-xs text-neutral-600">
                  <div className="font-sans text-[11px] leading-relaxed">
                    <span className="font-bold text-neutral-800">一句话：</span>
                    {char.description}
                  </div>
                  <div className="font-sans text-[10px] text-neutral-400 line-clamp-3 leading-relaxed">
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
                <h3 className="font-sans font-bold text-sm text-neutral-900">是否删除角色？</h3>
                <p className="text-[11px] font-mono text-neutral-500">{deleteConfirmChar.name}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed font-sans bg-neutral-50 p-3 rounded-xl border border-neutral-100">
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

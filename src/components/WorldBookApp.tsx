import React, { useState } from "react";
import { ChevronLeft, Plus, Search, Trash2, Tag, BookOpen, Check, X, FileText, ToggleLeft, ToggleRight, Edit3 } from "lucide-react";
import { LoreEntry, Character, AppSettings } from "../types";
import JSZip from "jszip";

interface WorldBookAppProps {
  characters: Character[];
  loreList: LoreEntry[];
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onAddLore: (lore: Omit<LoreEntry, "id" | "createdAt">) => void;
  onUpdateLore: (id: string, updated: Partial<LoreEntry>) => void;
  onDeleteLore: (id: string) => void;
  onClose: () => void;
}

export default function WorldBookApp({ characters = [], loreList, settings, onSaveSettings, onAddLore, onUpdateLore, onDeleteLore, onClose }: WorldBookAppProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("全部");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newGroupInput, setNewGroupInput] = useState("");
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  
  const userGroups = settings.worldBookGroups || [];
  const displayCategories = ["全部", ...userGroups];


  // Form states
  const [title, setTitle] = useState("");
  const [keysInput, setKeysInput] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("其它");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]); // empty means "all characters"
  const [priority, setPriority] = useState<"pre" | "mid" | "post">("mid");
  const [mountType, setMountType] = useState<"always" | "trigger">("trigger");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleSaveLoreDirectly = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (!title.trim()) {
        setErrorMsg("请填写条目名称 (Title is required)");
        setToastMsg("保存失败，请重试");
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }
      if (!content.trim()) {
        setErrorMsg("请填写条目内容 (Content is required)");
        setToastMsg("保存失败，请重试");
        setTimeout(() => setToastMsg(null), 3000);
        return;
      }

      const triggerKeys = keysInput
        .split(/[,，\s]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (editingId) {
        onUpdateLore(editingId, {
          title: title.trim(),
          keys: triggerKeys,
          content: content.trim(),
          category: category,
          characterIds: selectedCharIds,
          priority: priority,
          mountType: mountType,
        });
      } else {
        onAddLore({
          title: title.trim(),
          keys: triggerKeys,
          content: content.trim(),
          category: category,
          enabled: true,
          characterIds: selectedCharIds,
          priority: priority,
          mountType: mountType,
        });
      }

      setToastMsg("保存成功");
      setTimeout(() => {
        setToastMsg(null);
        handleCancel();
      }, 1000);
    } catch (err) {
      console.error(err);
      setToastMsg("保存失败，请重试");
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setTitle("");
    setKeysInput("");
    setContent("");
    setCategory(userGroups.length > 0 ? userGroups[0] : "未分组");
    setSelectedCharIds([]);
    setPriority("mid");
    setMountType("trigger");
    setErrorMsg("");
    setIsAdding(true);
  };

  const handleStartEdit = (item: LoreEntry) => {
    setEditingId(item.id);
    setTitle(item.title);
    setKeysInput(item.keys.join(", "));
    setContent(item.content);
    
    let cat = item.category;
    if (!userGroups.includes(cat) && userGroups.length > 0) {
      cat = userGroups[0];
    }
    setCategory(cat);
    
    setSelectedCharIds(item.characterIds || []);
    setPriority(item.priority || "mid");
    setMountType(item.mountType || "trigger");
    setErrorMsg("");
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setTitle("");
    setKeysInput("");
    setContent("");
    setCategory(userGroups.length > 0 ? userGroups[0] : "未分组");
    setSelectedCharIds([]);
    setPriority("mid");
    setMountType("trigger");
    setErrorMsg("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileName = file.name.toLowerCase();
      let text = "";
      if (fileName.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(arrayBuffer);
        const documentXml = await zipContent.file("word/document.xml")?.async("string");
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
          text = textParts.join("\n");
        } else {
          throw new Error("Invalid docx structure");
        }
      } else {
        text = await file.text();
      }

      if (text) {
        setContent((prev) => (prev ? prev + "\n\n" + text : text));
        if (!title.trim()) {
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          setTitle(baseName);
        }
      }
    } catch (err) {
      console.error("Failed to parse file:", err);
      setErrorMsg("解析文件失败，请确保是有效的 .docx 或文本文档。");
    }
    e.target.value = "";
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim()) {
      setErrorMsg("请填写条目名称 (Title is required)");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("请填写条目内容 (Content is required)");
      return;
    }

    const triggerKeys = keysInput
      .split(/[,，\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (mountType === "trigger" && triggerKeys.length === 0) {
      setErrorMsg("在“关键词触发”模式下，至少需要填写一个触发词。");
      return;
    }

    if (editingId) {
      onUpdateLore(editingId, {
        title: title.trim(),
        keys: triggerKeys,
        content: content.trim(),
        category: category,
        characterIds: selectedCharIds,
        priority: priority,
        mountType: mountType,
      });
    } else {
      onAddLore({
        title: title.trim(),
        keys: triggerKeys,
        content: content.trim(),
        category: category,
        enabled: true,
        characterIds: selectedCharIds,
        priority: priority,
        mountType: mountType,
      });
    }

    handleCancel();
  };

  // Filter entries
  const filteredList = loreList.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === "全部" || item.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900 select-none animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 shrink-0">
        <button 
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-mono font-bold text-sm tracking-widest text-neutral-950 uppercase">世界书 (LORE)</span>
        <button
          onClick={handleStartAdd}
          className="p-1 text-black hover:bg-neutral-100 rounded-lg active:scale-95 transition-all"
          title="添加新设定 (Add Lore)"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {isAdding ? (
        /* Form: Add Lore Entry */
        <div className="flex-1 flex flex-col bg-neutral-50 animate-fade-in overflow-y-auto">
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-200">
              <span className="text-xs font-sans font-bold tracking-wider text-neutral-700">
                {editingId ? "编辑设定条目" : "创建新设定条目"}
              </span>
              <button 
                type="button" 
                onClick={handleCancel} 
                className="text-neutral-400 hover:text-neutral-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-100 text-[11px] text-red-700 rounded-lg">
                {errorMsg}
              </div>
            )}

            {toastMsg && (
              <div className={`p-3 text-xs rounded-lg text-center font-medium ${
                toastMsg.includes("成功") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-100"
              }`}>
                {toastMsg}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">条目名称 (Title)</label>
              <input
                type="text"
                placeholder="例如: 艾尔德利亚帝国"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">设定分类 (Category)</label>
              <div className="flex flex-wrap gap-1.5 text-[10px] text-center font-medium">
                {userGroups.map((cat) => (
                  <div key={cat} className="flex items-stretch rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 transition-all ${
                        category === cat
                          ? "bg-black text-white"
                          : "bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {cat}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`确定要删除分组 "${cat}" 吗？`)) {
                          const updated = userGroups.filter((g) => g !== cat);
                          onSaveSettings({ ...settings, worldBookGroups: updated });
                          if (category === cat) {
                            setCategory(updated.length > 0 ? updated[0] : "未分组");
                          }
                          if (activeCategory === cat) {
                            setActiveCategory("全部");
                          }
                        }
                      }}
                      className={`px-1.5 flex items-center justify-center transition-all ${
                        category === cat ? "bg-neutral-800 text-neutral-300 hover:text-white" : "bg-neutral-50 text-neutral-400 hover:bg-neutral-100 hover:text-red-500"
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {isAddingGroup ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newGroupInput}
                      onChange={(e) => setNewGroupInput(e.target.value)}
                      placeholder="新分组名..."
                      className="text-xs border border-neutral-200 px-2 py-1 rounded-lg w-24 outline-none focus:border-neutral-950"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newGroupInput.trim();
                        if (val && !userGroups.includes(val)) {
                          const updated = [...userGroups, val];
                          onSaveSettings({ ...settings, worldBookGroups: updated });
                          setCategory(val);
                        }
                        setIsAddingGroup(false);
                        setNewGroupInput("");
                      }}
                      className="p-1.5 bg-black text-white rounded-lg hover:bg-neutral-800"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingGroup(false);
                        setNewGroupInput("");
                      }}
                      className="p-1.5 bg-neutral-100 text-neutral-500 rounded-lg hover:bg-neutral-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingGroup(true)}
                    className="px-2 py-1.5 rounded-lg border border-dashed border-neutral-300 text-neutral-500 hover:text-black hover:border-black transition-all flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>添加分组</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mount Type & Priority (Grid Layout) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Mount Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">挂载选项 (Mount Option)</label>
                <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setMountType("trigger")}
                    className={`flex-1 py-1 text-[10px] font-sans rounded-md transition-all ${
                      mountType === "trigger"
                        ? "bg-white text-neutral-900 font-bold shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    关键词触发
                  </button>
                  <button
                    type="button"
                    onClick={() => setMountType("always")}
                    className={`flex-1 py-1 text-[10px] font-sans rounded-md transition-all ${
                      mountType === "always"
                        ? "bg-white text-neutral-900 font-bold shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    常规挂载
                  </button>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">优先级别 (Priority)</label>
                <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setPriority("pre")}
                    className={`flex-1 py-1 text-[10px] font-sans rounded-md transition-all ${
                      priority === "pre"
                        ? "bg-black text-white font-bold shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    title="前置优先：注入在最前，最容易被AI首先关注"
                  >
                    前
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("mid")}
                    className={`flex-1 py-1 text-[10px] font-sans rounded-md transition-all ${
                      priority === "mid"
                        ? "bg-black text-white font-bold shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    title="中置优先：常规居中注入"
                  >
                    中
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority("post")}
                    className={`flex-1 py-1 text-[10px] font-sans rounded-md transition-all ${
                      priority === "post"
                        ? "bg-black text-white font-bold shadow-sm"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                    title="后置优先：作为补充和参考"
                  >
                    后
                  </button>
                </div>
              </div>
            </div>

            {/* Character Mount List */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">
                挂载角色 (Mount Characters)
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-neutral-200 rounded-xl max-h-32 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCharIds([])}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 font-sans ${
                    selectedCharIds.length === 0
                      ? "bg-black text-white border-black font-semibold"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  ✨ 全部角色挂载 (All)
                </button>
                {characters.map((char) => {
                  const isSelected = selectedCharIds.includes(char.id);
                  return (
                    <button
                      type="button"
                      key={char.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCharIds(selectedCharIds.filter((id) => id !== char.id));
                        } else {
                          setSelectedCharIds([...selectedCharIds, char.id]);
                        }
                      }}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-all flex items-center gap-1 font-sans ${
                        isSelected
                          ? "bg-neutral-950 text-white border-neutral-950 font-semibold"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <span>{char.avatar}</span>
                      <span>{char.name}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[9px] text-neutral-400 block leading-normal">
                {selectedCharIds.length === 0 
                  ? "未指定特定角色，此设定将对【所有聊天角色】通用。" 
                  : `已指定此设定仅对上述 ${selectedCharIds.length} 个角色生效。`}
              </span>
            </div>

            {/* Trigger Keys */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">
                触发词 {mountType === "always" ? "(选填 - 始终常规挂载)" : "(必填)"}
              </label>
              <input
                type="text"
                placeholder={mountType === "always" ? "始终激活常规挂载，此处可选填触发词" : "英文逗号/中文逗号或空格隔开。例如: 帝国,艾尔德利亚,Eldoria"}
                value={keysInput}
                onChange={(e) => setKeysInput(e.target.value)}
                className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white outline-none"
              />
              <span className="text-[9px] text-neutral-400 block leading-normal">
                {mountType === "always" 
                  ? "此设定被设为【常规挂载】，将始终随设定的角色加载，无需手动匹配关键词触发。" 
                  : "当聊天中出现以上任意触发词时，系统将自动把该设定的详细内容注入 AI 记忆，引导其说话符合世界观背景。"}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-bold tracking-wider text-neutral-400 uppercase block">设定详情 (Lore Content)</label>
                <label className="cursor-pointer text-[10px] font-sans text-neutral-700 hover:text-black bg-white border border-neutral-200 hover:border-neutral-400 px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 transition-all">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-semibold">导入 Word (.docx)</span>
                  <input
                    type="file"
                    accept=".docx,.txt,.md"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <textarea
                rows={5}
                placeholder="详细描写该设定的历史背景、外貌细节、社会关系、禁忌知识等。支持自由书写，或通过上方按钮直接导入 Word 文档自动填充..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white outline-none resize-none leading-relaxed font-sans"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 text-xs font-mono font-bold tracking-widest text-white bg-black hover:bg-neutral-800 py-3 rounded-xl transition-colors"
              >
                {editingId ? "保存修改 (SAVE)" : "创建条目 (CREATE)"}
              </button>
              <button
                type="button"
                onClick={handleSaveLoreDirectly}
                className="px-5 text-xs font-mono font-bold tracking-widest text-black bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition-colors cursor-pointer"
              >
                保存
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 text-xs font-mono font-bold tracking-widest text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Main View: List of Lore Entries */
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Search bar */}
          <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索条目名称或触发词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border border-neutral-200 rounded-xl bg-white focus:outline-none focus:border-neutral-950"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex px-3 py-1.5 border-b border-neutral-100 bg-neutral-50 overflow-x-auto shrink-0 gap-1 scrollbar-none items-center">
            {displayCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap tracking-wide font-sans transition-all shrink-0 ${
                  activeCategory === cat
                    ? "bg-black text-white font-semibold"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="w-[1px] h-4 bg-neutral-300 mx-1 shrink-0"></div>
            {isAddingGroup ? (
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <input
                  type="text"
                  value={newGroupInput}
                  onChange={(e) => setNewGroupInput(e.target.value)}
                  placeholder="新分组..."
                  className="text-[11px] border border-neutral-200 px-2 py-1 rounded-md w-20 outline-none focus:border-neutral-950"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newGroupInput.trim();
                    if (val && !userGroups.includes(val)) {
                      const updated = [...userGroups, val];
                      onSaveSettings({ ...settings, worldBookGroups: updated });
                    }
                    setIsAddingGroup(false);
                    setNewGroupInput("");
                  }}
                  className="p-1 bg-black text-white rounded-md hover:bg-neutral-800"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingGroup(false);
                    setNewGroupInput("");
                  }}
                  className="p-1 bg-neutral-200 text-neutral-600 rounded-md hover:bg-neutral-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingGroup(true)}
                className="px-2 py-1 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-black hover:bg-neutral-200 rounded-lg shrink-0 transition-colors"
                title="添加新分组"
              >
                <Plus className="w-3 h-3" />
                <span>分组</span>
              </button>
            )}
          </div>

          {/* Lore Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 min-h-0">
            {filteredList.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-neutral-200 mx-auto stroke-[1.5]" />
                <p className="text-xs text-neutral-400 font-sans">
                  {loreList.length === 0 ? "空空如也，快添加一些专属世界设定吧" : "没有找到匹配的设定条目"}
                </p>
              </div>
            ) : (
              filteredList.map((item) => (
                <div key={item.id} className="p-4 space-y-2.5 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    {/* Title, category, priority, mount type */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-sans font-bold text-sm text-neutral-900">{item.title}</span>
                        <span className="text-[9px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md font-sans">
                          {item.category}
                        </span>

                        {/* Priority Badge */}
                        {item.priority === "pre" && (
                          <span className="text-[9px] font-semibold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md font-sans">
                            前置优先
                          </span>
                        )}
                        {item.priority === "post" && (
                          <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md font-sans">
                            后置优先
                          </span>
                        )}
                        {(item.priority === "mid" || !item.priority) && (
                          <span className="text-[9px] font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded-md font-sans">
                            中置优先
                          </span>
                        )}

                        {/* Mount Type Badge */}
                        {item.mountType === "always" ? (
                          <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md font-sans">
                            常规挂载 (始终激活)
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md font-sans">
                            关键词触发
                          </span>
                        )}
                      </div>

                      {/* Mounted Characters */}
                      <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                        <span className="font-sans font-medium text-[9px] text-neutral-400">挂载目标:</span>
                        {!item.characterIds || item.characterIds.length === 0 ? (
                          <span className="text-[9px] bg-purple-50 text-purple-600 border border-purple-100 px-1.5 py-0.2 rounded">全部角色通用</span>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.characterIds.map((charId) => {
                              const char = characters.find((c) => c.id === charId);
                              return char ? (
                                <span key={charId} className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5 font-sans">
                                  <span>{char.avatar}</span>
                                  <span>{char.name}</span>
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-neutral-400 block">
                        建立于 {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1 text-neutral-400 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-colors"
                        title="编辑条目"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onUpdateLore(item.id, { enabled: !item.enabled })}
                        className="text-neutral-400 hover:text-neutral-950 transition-colors"
                        title={item.enabled ? "禁用此条目" : "启用此条目"}
                      >
                        {item.enabled ? (
                          <ToggleRight className="w-8 h-8 text-black" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-neutral-300" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteLore(item.id)}
                        className="p-1 text-neutral-300 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-colors"
                        title="删除条目"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Keys badges */}
                  {item.keys && item.keys.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3 h-3 text-neutral-400 shrink-0" />
                      {item.keys.map((k, idx) => (
                        <span key={idx} className="text-[10px] font-mono font-medium text-neutral-600 bg-neutral-100 border border-neutral-200/50 px-1.5 py-0.5 rounded-md">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content snippet */}
                  <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                    {item.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Key, Database, Download, Upload, Trash2, Eye, EyeOff, Layers, Check } from "lucide-react";
import { AppSettings, ApiPreset } from "../types";

interface SettingsAppProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

type ScreenType = "main" | "api" | "data";

export default function SettingsApp({ settings, onSaveSettings, onClose }: SettingsAppProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("main");
  
  // API Settings State
  const [apiUrl, setApiUrl] = useState(settings.apiUrl || "");
  const [apiKey, setApiKey] = useState(settings.apiKey || "");
  const [model, setModel] = useState(settings.model || "");
  const [showKey, setShowKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  
  const [presets, setPresets] = useState<ApiPreset[]>(settings.apiPresets || []);
  const [activePresetId, setActivePresetId] = useState<string>(settings.activePresetId || "default");
  
  const [presetName, setPresetName] = useState("");
  const [isEditingPresetName, setIsEditingPresetName] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Data Management State
  const [storageUsed, setStorageUsed] = useState("0 KB");
  const [storageItems, setStorageItems] = useState(0);

  useEffect(() => {
    if (currentScreen === "data") {
      calculateStorage();
    }
  }, [currentScreen]);

  const calculateStorage = () => {
    let total = 0;
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || "";
        total += key.length + value.length;
        count++;
      }
    }
    setStorageItems(count);
    
    // Calculate in MB or KB
    const kb = total / 1024;
    if (kb > 1024) {
      setStorageUsed((kb / 1024).toFixed(2) + " MB");
    } else {
      setStorageUsed(kb.toFixed(2) + " KB");
    }
  };

  const handleFetchModels = async () => {
    if (!apiUrl || !apiKey) {
      alert("请先填写 API 接口地址和 API 密钥");
      return;
    }
    setFetchingModels(true);
    try {
      const response = await fetch("/api/fetch-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiUrl, apiKey }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFetchedModels(data.models || []);
      } else {
        alert(data.message || "拉取模型列表失败");
      }
    } catch (err: any) {
      alert(err.message || "网络请求异常");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSaveAsNewPreset = () => {
    if (!presetName.trim()) {
      alert("请输入配置名称");
      return;
    }
    const newPreset: ApiPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      apiUrl,
      apiKey,
      model
    };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    setActivePresetId(newPreset.id);
    setPresetName("");
    setIsEditingPresetName(false);
  };

  const handleSaveApi = () => {
    // Only update active preset if not default
    let updatedPresets = [...presets];
    if (activePresetId !== "default") {
      updatedPresets = updatedPresets.map(p => 
        p.id === activePresetId ? { ...p, apiUrl, apiKey, model } : p
      );
    }

    onSaveSettings({
      ...settings,
      apiUrl,
      apiKey,
      model,
      apiPresets: updatedPresets,
      activePresetId
    });
    setSaveMessage("已保存");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    if (activePresetId === id) {
      setActivePresetId("default");
      setApiUrl("");
      setApiKey("");
      setModel("");
    }
  };

  const handleExport = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key) || "";
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mobile_ai_data_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            for (const key in data) {
              localStorage.setItem(key, data[key]);
            }
            alert("导入成功，页面将刷新以应用数据");
            window.location.reload();
          } catch (err) {
            alert("导入失败：文件格式不正确");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClear = () => {
    if (window.confirm("确定要清理所有缓存数据吗？此操作不可逆！\n（你的角色、聊天记录和随笔都会被删除）")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-50 text-neutral-900 select-none animate-slide-up h-full">
      {currentScreen === "main" && (
        <>
          <div className="h-14 flex items-center justify-between px-3 border-b border-neutral-200 bg-white shrink-0">
            <button 
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-neutral-900">设置</span>
            <div className="w-8 h-8" />
          </div>

          <div className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => setCurrentScreen("api")}
              className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-neutral-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Key className="w-4 h-4 text-neutral-700" />
                </div>
                <span className="font-bold text-sm text-neutral-800">API 设置</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>

            <button 
              onClick={() => setCurrentScreen("data")}
              className="w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-neutral-100 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <Database className="w-4 h-4 text-neutral-700" />
                </div>
                <span className="font-bold text-sm text-neutral-800">数据管理</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </>
      )}

      {currentScreen === "api" && (
        <>
          <div className="h-14 flex items-center justify-between px-3 border-b border-neutral-200 bg-white shrink-0">
            <button 
              onClick={() => setCurrentScreen("main")}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-neutral-900">API 设置</span>
            <div className="w-8 h-8" />
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Presets List */}
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm space-y-3">
              <div className="text-xs font-bold text-neutral-500 mb-1">已保存的 API 预设</div>
              <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-none pr-1">
                <div 
                  onClick={() => {
                    setActivePresetId("default");
                    setApiUrl("");
                    setApiKey("");
                    setModel("");
                  }}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer flex items-center justify-between transition-colors ${activePresetId === "default" ? "bg-black text-white border-black" : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200"}`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs">官方默认免费通道</div>
                    <div className="text-[9px] opacity-70 mt-0.5 font-mono">Gemini 3.5-Flash (无需配置)</div>
                  </div>
                  {activePresetId === "default" && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                </div>

                {presets.map(preset => (
                  <div 
                    key={preset.id}
                    onClick={() => {
                      setActivePresetId(preset.id);
                      setApiUrl(preset.apiUrl);
                      setApiKey(preset.apiKey);
                      setModel(preset.model);
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer flex items-center justify-between transition-colors ${activePresetId === preset.id ? "bg-black text-white border-black" : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200"}`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-xs truncate">{preset.name}</div>
                      <div className="text-[9px] opacity-70 mt-0.5 font-mono truncate">{preset.model || "未设模型"}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {activePresetId === preset.id && <Check className="w-3.5 h-3.5" />}
                      <button 
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className={`p-1 rounded transition-colors ${activePresetId === preset.id ? "text-white/70 hover:text-white hover:bg-white/20" : "text-neutral-400 hover:text-red-500 hover:bg-red-50"}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Edit */}
            <div className="bg-white rounded-xl p-4 border border-neutral-200 shadow-sm space-y-4">
              <div className="text-xs font-bold text-neutral-500">
                {activePresetId === "default" ? "正在编辑 (新建配置)" : "编辑当前配置"}
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">API 接口地址 (Base URL)</label>
                <input
                  type="text"
                  placeholder="例如: https://api.openai.com/v1"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full text-xs border border-neutral-200 hover:border-neutral-300 focus:border-black px-3 py-2.5 rounded-lg outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    placeholder="输入 API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full text-xs font-mono border border-neutral-200 hover:border-neutral-300 focus:border-black pl-3 pr-10 py-2.5 rounded-lg outline-none transition-colors"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-700 rounded"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">模型名称 (Model)</label>
                  <button
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !apiUrl || !apiKey}
                    className="text-[10px] font-bold text-black underline hover:text-neutral-700 disabled:text-neutral-300 disabled:no-underline transition-colors"
                  >
                    {fetchingModels ? "拉取中..." : "拉取模型"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="例如: gemini-3.5-flash"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full text-xs border border-neutral-200 hover:border-neutral-300 focus:border-black px-3 py-2.5 rounded-lg outline-none transition-colors"
                />
                {fetchedModels.length > 0 && (
                  <div className="mt-2 p-2 bg-neutral-50 border border-neutral-200 rounded-lg max-h-32 overflow-y-auto scrollbar-none">
                    <div className="grid grid-cols-2 gap-1.5">
                      {fetchedModels.map(m => (
                        <button
                          key={m}
                          onClick={() => setModel(m)}
                          className={`text-[10px] font-mono text-left px-2 py-1.5 rounded-md truncate border transition-colors ${model === m ? "bg-black text-white border-black" : "bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200"}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100">
                {!isEditingPresetName ? (
                  <button
                    onClick={() => setIsEditingPresetName(true)}
                    className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    保存为新预设
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="配置名称..."
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      className="flex-1 text-xs border border-neutral-200 focus:border-black px-2.5 py-2 rounded-lg outline-none transition-colors"
                    />
                    <button
                      onClick={handleSaveAsNewPreset}
                      className="px-3 bg-black hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setIsEditingPresetName(false)}
                      className="px-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-xs font-bold rounded-lg transition-colors shrink-0"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-neutral-100 relative">
                <button
                  onClick={handleSaveApi}
                  className="w-full bg-black text-white font-bold text-xs py-3 rounded-lg active:scale-[0.98] transition-all hover:bg-neutral-800"
                >
                  应用并保存设置
                </button>
                {saveMessage && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1.5 rounded-full shadow-md border border-neutral-100 flex items-center gap-1.5 animate-fade-in pointer-events-none">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600">{saveMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {currentScreen === "data" && (
        <>
          <div className="h-14 flex items-center justify-between px-3 border-b border-neutral-200 bg-white shrink-0">
            <button 
              onClick={() => setCurrentScreen("main")}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-neutral-900">数据管理</span>
            <div className="w-8 h-8" />
          </div>

          <div className="flex-1 p-4 flex flex-col gap-4">
            <div className="bg-white rounded-xl p-6 border border-neutral-200 shadow-sm flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
                <Database className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="text-lg font-bold text-neutral-900">已用 {storageUsed}</div>
              <div className="text-xs text-neutral-500 font-medium">共 {storageItems} 条数据</div>
            </div>

            <div className="space-y-3 mt-2">
              <button
                onClick={handleExport}
                className="w-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-800 font-bold text-sm py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Upload className="w-4 h-4" />
                导出数据
              </button>
              
              <button
                onClick={handleImport}
                className="w-full bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-800 font-bold text-sm py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                导入数据
              </button>

              <button
                onClick={handleClear}
                className="w-full bg-red-50 border border-red-100 hover:border-red-200 text-red-600 font-bold text-sm py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Trash2 className="w-4 h-4" />
                清理缓存
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

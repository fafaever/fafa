import React, { useState, useRef } from "react";
import { ChevronLeft, Save, Trash2, Upload, RotateCcw, Download, Plus, Check, Monitor, Layout, Type, Palette, Package, Smartphone, Image as ImageIcon, Database, Cpu, HardDrive, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from "lucide-react";
import { AppSettings, FontOption, ThemePreset } from "../types";
import { apiFetchModels } from "../lib/api";

interface SettingsAppProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

const SettingsApp: React.FC<SettingsAppProps> = ({ settings, onUpdateSettings, onSaveSettings, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'api' | 'data' | 'interface'>('main');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['wallpaper', 'icons', 'font']));
  
  const [initialSettings] = useState<AppSettings>({ ...settings });
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isSavingApiPreset, setIsSavingApiPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [apiPresetName, setApiPresetName] = useState("");
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const wallpaper1Ref = useRef<HTMLInputElement>(null);
  const wallpaper2Ref = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [currentIconKey, setCurrentIconKey] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const apps = [
    { key: 'phonecheck', name: '查手机' },
    { key: 'universe', name: '宇宙' },
    { key: 'theater', name: '小剧场' },
    { key: 'forum', name: '论坛' },
    { key: 'gamelist', name: '游戏' },
    { key: 'memory', name: '记忆' },
    { key: 'cloud', name: '云端' },
    { key: 'help', name: '帮助' },
    { key: 'chat', name: '信息' },
    { key: 'worldbook', name: '世界书' },
    { key: 'creator', name: '档案' },
    { key: 'settings', name: '系统设置' },
  ];

  const defaultIcons: Record<string, string> = {
    'phonecheck': '/images/tubiao/查手机.jpg',
    'universe': '/images/tubiao/宇宙.jpg',
    'theater': '/images/tubiao/小剧场.jpg',
    'gamelist': '/images/tubiao/游戏.jpg',
    'memory': '/images/tubiao/记忆.jpg',
    'cloud': '/images/tubiao/云端.jpg',
    'help': '/images/tubiao/帮助.jpg',
    'chat': '/images/tubiao/信息.jpg',
    'worldbook': '/images/tubiao/世界书.jpg',
    'creator': '/images/tubiao/档案.jpg',
    'settings': '/images/tubiao/系统设置.jpg'
  };

  const DEFAULT_PRESETS: ThemePreset[] = [
    {
      id: 'preset-minimalist',
      name: '高级简约',
      homeWallpaper: '', 
      homeWallpaper2: '',
      appIcons: {},
      globalFont: 'playfair_inter',
      fontColorMode: 'black'
    },
    {
      id: 'preset-cute',
      name: '可爱趣味',
      homeWallpaper: '',
      homeWallpaper2: '',
      appIcons: {},
      globalFont: 'nunito',
      fontColorMode: 'black'
    }
  ];

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const GRADIENT_PRESETS = [
    { name: '淡粉→淡蓝', from: '#f472b6', to: '#38bdf8' },
    { name: '淡紫→淡蓝', from: '#c084fc', to: '#60a5fa' },
    { name: '暖橘→淡粉', from: '#fb923c', to: '#f472b6' },
    { name: '薄荷→淡粉', from: '#34d399', to: '#f472b6' },
    { name: '玫瑰→紫罗兰', from: '#fb7185', to: '#a855f7' },
  ];

  const handleUpdate = (updates: Partial<AppSettings>) => {
    onUpdateSettings({ ...settings, ...updates });
  };

  const handleReset = () => {
    onUpdateSettings(initialSettings);
  };

  const handleSave = () => {
    // If there's an active theme preset, update it
    let newThemePresets = [...(settings.themePresets || [])];
    if (settings.activeThemePresetId) {
      const idx = newThemePresets.findIndex(p => p.id === settings.activeThemePresetId);
      if (idx !== -1) {
        newThemePresets[idx] = {
          ...newThemePresets[idx],
          homeWallpaper: settings.homeWallpaper,
          homeWallpaper2: settings.homeWallpaper2,
          appIcons: settings.appIcons,
          globalFont: settings.globalFont,
          customFontUrl: settings.customFontUrl,
          fontColorMode: settings.fontColorMode,
          fontColor: settings.fontColor,
          fontGradient: settings.fontGradient,
        };
      }
    }

    const finalSettings = {
      ...settings,
      themePresets: newThemePresets
    };

    onSaveSettings(finalSettings);
    alert("设置已保存并应用");
  };

  const processImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            (img.width - size) / 2,
            (img.height - size) / 2,
            size,
            size,
            0,
            0,
            512,
            512
          );
          callback(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadWallpaper = (screen: 1 | 2) => {
    const input = screen === 1 ? wallpaper1Ref.current : wallpaper2Ref.current;
    if (input?.files?.[0]) {
      processImage(input.files[0], (base64) => {
        if (screen === 1) handleUpdate({ homeWallpaper: base64 });
        else handleUpdate({ homeWallpaper2: base64 });
      });
    }
  };

  const handleUploadIcon = (appKey: string) => {
    setCurrentIconKey(appKey);
    iconInputRef.current?.click();
  };

  const onIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && currentIconKey) {
      processImage(e.target.files[0], (base64) => {
        const newIcons = { ...settings.appIcons, [currentIconKey]: base64 };
        handleUpdate({ appIcons: newIcons });
      });
    }
  };

  const handleUploadFont = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleUpdate({ 
          globalFont: 'custom', 
          customFontUrl: event.target?.result as string 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newId = Date.now().toString();
    const newPreset: ThemePreset = {
      id: newId,
      name: presetName,
      homeWallpaper: settings.homeWallpaper,
      homeWallpaper2: settings.homeWallpaper2,
      appIcons: settings.appIcons,
      globalFont: settings.globalFont,
      customFontUrl: settings.customFontUrl,
      fontColorMode: settings.fontColorMode,
      fontColor: settings.fontColor,
      fontGradient: settings.fontGradient,
    };
    handleUpdate({
      themePresets: [...(settings.themePresets || []), newPreset],
      activeThemePresetId: newId
    });
    setPresetName("");
    setIsSavingPreset(false);
  };

  const applyPreset = (preset: ThemePreset) => {
    handleUpdate({
      homeWallpaper: preset.homeWallpaper,
      homeWallpaper2: preset.homeWallpaper2,
      appIcons: preset.appIcons,
      globalFont: preset.globalFont,
      customFontUrl: preset.customFontUrl,
      fontColorMode: preset.fontColorMode,
      fontColor: preset.fontColor,
      fontGradient: preset.fontGradient,
      activeThemePresetId: preset.id
    });
  };

  const saveApiPreset = () => {
    if (!apiPresetName.trim()) return;
    const newPreset = {
      id: Date.now().toString(),
      name: apiPresetName,
      apiUrl: settings.apiUrl,
      apiKey: settings.apiKey,
      model: settings.model
    };
    handleUpdate({
      apiPresets: [...(settings.apiPresets || []), newPreset]
    });
    setApiPresetName("");
    setIsSavingApiPreset(false);
  };

  const applyApiPreset = (preset: any) => {
    handleUpdate({
      apiUrl: preset.apiUrl,
      apiKey: preset.apiKey,
      model: preset.model,
      activePresetId: preset.id
    });
  };

  const deleteApiPreset = (id: string) => {
    handleUpdate({
      apiPresets: settings.apiPresets?.filter(p => p.id !== id),
      activePresetId: settings.activePresetId === id ? undefined : settings.activePresetId
    });
  };

  const handleFetchModels = async () => {
    if (!settings.apiUrl || !settings.apiKey) {
      alert("请先填写 API 地址和 API Key！");
      return;
    }
    setIsLoadingModels(true);
    try {
      const res = await apiFetchModels({
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey
      });
      if (res.success && res.models && res.models.length > 0) {
        setFetchedModels(res.models);
        // Automatically select the first model if current model is empty
        if (!settings.model && res.models[0]) {
          handleUpdate({ model: res.models[0] });
        }
        alert(`成功拉取到 ${res.models.length} 个可用模型！已填充到下方下拉框中。`);
      } else {
        alert("未获取到可用模型，请检查接口是否支持 /v1/models 路径。您可以手动输入模型名称进行连接。");
      }
    } catch (err: any) {
      console.error("[Fetch Models Error]:", err);
      alert(err.message || "拉取模型列表失败，请确认 API 路径和 Key 的正确性，或尝试直接在下方手动输入模型名称。");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const exportAllData = () => {
    const data: Record<string, any> = {};
    const keys = [
      "mobile_ai_settings",
      "mobile_ai_characters",
      "mobile_ai_lore",
      "mobile_ai_personas",
      "mobile_ai_sessions",
      "mobile_ai_forum_boards",
      "mobile_ai_forum_posts",
      "mobile_ai_forum_private_contacts",
      "mobile_ai_forum_user_bookmarks",
      "mobile_ai_forum_user_avatar",
      "mobile_ai_forum_user_nickname",
      "mobile_ai_forum_char_profiles",
      "mobile_ai_forum_pms",
      "mobile_ai_forum_p_count",
      "mobile_ai_forum_c_count",
      "mobile_ai_user_name_v1",
      "mobile_ai_user_avatar_v1",
      "mobile_ai_user_description_v1",
      "user_personas_v1",
      "mobile_ai_greeting",
      "mobile_ai_healing",
      "mobile_ai_card_left",
      "mobile_ai_card_right",
      "mobile_ai_forum_char_profiles"
    ];
    
    keys.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) {
        try {
          data[key] = JSON.parse(val);
        } catch (e) {
          data[key] = val;
        }
      }
    });

    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile_ai_os_full_data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          Object.keys(data).forEach(key => {
            const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
            localStorage.setItem(key, val);
          });
          alert("所有数据导入成功，正在刷新页面...");
          window.location.reload();
        } catch (err) {
          alert("导入失败，无效的 JSON 文件");
        }
      };
      reader.readAsText(file);
    }
  };

  const clearAllData = () => {
    setConfirmDialog({
      title: "清除所有数据",
      message: "确定要清除所有数据吗？此操作不可撤销。",
      onConfirm: () => {
        setConfirmDialog(null);
        localStorage.clear();
        window.location.reload();
      }
    });
  };

  const getDataStats = () => {
    const chars = JSON.parse(localStorage.getItem("mobile_ai_characters") || "[]").length;
    const lore = JSON.parse(localStorage.getItem("mobile_ai_lore") || "[]").length;
    const sessions = JSON.parse(localStorage.getItem("mobile_ai_sessions") || "[]").length;
    return chars + lore + sessions;
  };

  const deletePreset = (id: string) => {
    handleUpdate({
      themePresets: settings.themePresets?.filter(p => p.id !== id)
    });
  };

  const exportTheme = () => {
    const themeData = {
      homeWallpaper: settings.homeWallpaper,
      homeWallpaper2: settings.homeWallpaper2,
      appIcons: settings.appIcons,
      globalFont: settings.globalFont,
      customFontUrl: settings.customFontUrl
    };
    const blob = new Blob([JSON.stringify(themeData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          handleUpdate(data);
        } catch (err) {
          alert("导入失败，无效的 JSON 文件");
        }
      };
      reader.readAsText(file);
    }
  };

  const clearCache = () => {
    if (confirm("确定要清空所有设置吗？这包括壁纸、API 配置和世界书数据。")) {
      localStorage.removeItem("mobile_ai_settings");
      localStorage.removeItem("mobile_ai_characters");
      localStorage.removeItem("mobile_ai_lore");
      localStorage.removeItem("mobile_ai_personas");
      localStorage.removeItem("mobile_ai_sessions");
      window.location.reload();
    }
  };

  const handleBack = () => {
    if (activeSubTab === 'main') {
      onClose();
    } else {
      setActiveSubTab('main');
    }
  };

  const getPageTitle = () => {
    switch (activeSubTab) {
      case 'api': return "API 配置";
      case 'data': return "数据管理";
      case 'interface': return "界面设置";
      default: return "系统设置";
    }
  };

  return (
    <div className="h-full flex flex-col bg-white text-black relative">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-100 shrink-0 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1 hover:bg-neutral-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-['Playfair_Display'] font-bold tracking-tight">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${activeSubTab === 'interface' ? 'pb-32' : 'pb-6'}`}>
        {activeSubTab === 'main' && (
          <div className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* API Settings Card */}
            <button 
              onClick={() => setActiveSubTab('api')}
              className="w-full flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 hover:border-neutral-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">API 设置</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">配置 LLM 接口与模型</p>
              </div>
            </button>

            {/* Interface Settings Card */}
            <button 
              onClick={() => setActiveSubTab('interface')}
              className="w-full flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 hover:border-neutral-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Layout className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">界面设置</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">壁纸、图标、字体与预设</p>
              </div>
            </button>

            {/* Data Management Card */}
            <button 
              onClick={() => setActiveSubTab('data')}
              className="w-full flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 hover:border-neutral-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-neutral-200 text-neutral-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">数据管理</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">导入导出与清理数据</p>
              </div>
            </button>

            {/* About App (Simplified) */}
            <div className="pt-8 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mb-3">
                <span className="text-sm font-['Playfair_Display'] font-black">OS</span>
              </div>
              <h2 className="text-xs font-['Playfair_Display'] font-bold">Mobile AI OS</h2>
              <p className="text-[8px] font-bold uppercase tracking-widest mt-1">Version 2.4.0</p>
            </div>
          </div>
        )}

        {activeSubTab === 'interface' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Wallpaper Section */}
            <div className="border-b border-neutral-100">
              <button 
                onClick={() => toggleSection('wallpaper')}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-bold">壁纸设置</span>
                </div>
                <div className="w-5 h-5 flex items-center justify-center text-neutral-400">
                  {expandedSections.has('wallpaper') ? '▼' : '▶'}
                </div>
              </button>
              
              {expandedSections.has('wallpaper') && (
                <div className="px-5 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">主界面一</label>
                        <button onClick={() => handleUpdate({ homeWallpaper: "" })} className="text-[8px] font-bold text-neutral-400">重置</button>
                      </div>
                      <div 
                        onClick={() => wallpaper1Ref.current?.click()}
                        className="aspect-square w-full rounded-lg bg-neutral-50 border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden relative group"
                      >
                        {settings.homeWallpaper ? (
                          <img src={settings.homeWallpaper} className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">主界面二</label>
                        <button onClick={() => handleUpdate({ homeWallpaper2: "" })} className="text-[8px] font-bold text-neutral-400">重置</button>
                      </div>
                      <div 
                        onClick={() => wallpaper2Ref.current?.click()}
                        className="aspect-square w-full rounded-lg bg-neutral-50 border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 cursor-pointer overflow-hidden relative group"
                      >
                        {settings.homeWallpaper2 ? (
                          <img src={settings.homeWallpaper2} className="w-full h-full object-cover" />
                        ) : (
                          <Upload className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                  <input ref={wallpaper1Ref} type="file" accept="image/*" className="hidden" onChange={() => handleUploadWallpaper(1)} />
                  <input ref={wallpaper2Ref} type="file" accept="image/*" className="hidden" onChange={() => handleUploadWallpaper(2)} />
                </div>
              )}
            </div>

            {/* Icons Section */}
            <div className="border-b border-neutral-100">
              <button 
                onClick={() => toggleSection('icons')}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-bold">图标自定义</span>
                </div>
                <div className="w-5 h-5 flex items-center justify-center text-neutral-400">
                  {expandedSections.has('icons') ? '▼' : '▶'}
                </div>
              </button>

              {expandedSections.has('icons') && (
                <div className="px-5 pb-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <button onClick={() => handleUpdate({ appIcons: {} })} className="text-[9px] font-bold text-neutral-400 hover:text-black transition-colors">重置所有图标</button>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {apps.map(app => (
                      <div key={app.key} className="flex items-center justify-between p-1.5 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-white border border-neutral-100 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                            {settings.appIcons?.[app.key] ? (
                              <img src={settings.appIcons[app.key]} className="w-full h-full object-cover" />
                            ) : (
                              defaultIcons[app.key] ? (
                                <img src={defaultIcons[app.key]} className="w-full h-full object-cover opacity-60" />
                              ) : (
                                <div className="text-[7px] font-bold text-neutral-200 uppercase">Logo</div>
                              )
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-neutral-800">{app.name}</span>
                        </div>
                        <button 
                          onClick={() => handleUploadIcon(app.key)}
                          className="p-1.5 hover:bg-neutral-200 rounded-md transition-all"
                        >
                          <Upload className="w-3 h-3 text-neutral-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={onIconFileChange} />
                </div>
              )}
            </div>

            {/* Font Section */}
            <div className="border-b border-neutral-100">
              <button 
                onClick={() => toggleSection('font')}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-bold">字体设置</span>
                </div>
                <div className="w-5 h-5 flex items-center justify-center text-neutral-400">
                  {expandedSections.has('font') ? '▼' : '▶'}
                </div>
              </button>

              {expandedSections.has('font') && (
                <div className="px-5 pb-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'system', name: '系统默认' },
                      { id: 'playfair_inter', name: 'P.Display+Inter' },
                      { id: 'kaiti', name: '华文楷体' },
                      { id: 'nunito', name: 'Nunito (可爱)' },
                    ].map(font => (
                      <button 
                        key={font.id}
                        onClick={() => handleUpdate({ globalFont: font.id as FontOption })}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border-2 transition-all ${settings.globalFont === font.id ? 'border-black bg-black text-white' : 'border-neutral-100 bg-neutral-50 text-black hover:border-neutral-200'}`}
                      >
                        <span className="text-[10px] font-bold truncate pr-1">{font.name}</span>
                        {settings.globalFont === font.id && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div 
                    onClick={() => fontInputRef.current?.click()}
                    className={`px-3 py-2 rounded-lg border-2 border-dashed transition-all cursor-pointer flex items-center justify-center gap-2 ${settings.globalFont === 'custom' ? 'border-black bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}
                  >
                    <Type className={`w-3.5 h-3.5 ${settings.globalFont === 'custom' ? 'text-black' : 'text-neutral-300'}`} />
                    <span className="text-[9px] font-bold">{settings.globalFont === 'custom' ? '已应用自定义字体' : '上传 TTF'}</span>
                  </div>
                  <input ref={fontInputRef} type="file" accept=".ttf" className="hidden" onChange={handleUploadFont} />
                  
                  {/* Font Color Options */}
                  <div className="pt-2 border-t border-neutral-100 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">字体颜色</label>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleUpdate({ fontColorMode: 'black' })}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${settings.fontColorMode === 'black' || !settings.fontColorMode ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-200'}`}
                      >
                        默认黑色
                      </button>
                      <button 
                        onClick={() => handleUpdate({ fontColorMode: 'solid', fontColor: settings.fontColor || '#000000' })}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${settings.fontColorMode === 'solid' ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-200'}`}
                      >
                        纯色
                      </button>
                      <button 
                        onClick={() => {
                          const from = settings.fontGradientFrom || '#f472b6';
                          const to = settings.fontGradientTo || '#38bdf8';
                          const dir = settings.fontGradientDirection || 'to right';
                          handleUpdate({ 
                            fontColorMode: 'gradient',
                            fontGradientFrom: from,
                            fontGradientTo: to,
                            fontGradientDirection: dir,
                            fontGradient: `linear-gradient(${dir}, ${from}, ${to})`
                          });
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${settings.fontColorMode === 'gradient' ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 border-neutral-200'}`}
                      >
                        渐变
                      </button>
                    </div>

                    {/* Solid Color Picker */}
                    {settings.fontColorMode === 'solid' && (
                      <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-3 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                          <input 
                            type="color" 
                            value={settings.fontColor || '#000000'}
                            onChange={e => handleUpdate({ fontColorMode: 'solid', fontColor: e.target.value })}
                            className="w-9 h-9 rounded-lg overflow-hidden border-none cursor-pointer shrink-0 shadow-xs"
                          />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-mono font-bold text-neutral-800">{settings.fontColor || '#000000'}</span>
                            <span className="text-[9px] text-neutral-400">选择纯色后立即实时预览</span>
                          </div>
                        </div>

                        {/* Quick Preset Solid Color Chips */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-400">预设纯色</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { name: '默认黑', color: '#000000' },
                              { name: '深灰', color: '#333333' },
                              { name: '胭脂红', color: '#e11d48' },
                              { name: '宝蓝', color: '#2563eb' },
                              { name: '紫罗兰', color: '#7c3aed' },
                              { name: '翡翠绿', color: '#059669' },
                              { name: '暖琥珀', color: '#d97706' },
                              { name: '玫瑰粉', color: '#db2777' }
                            ].map(item => (
                              <button
                                key={item.color}
                                onClick={() => handleUpdate({ fontColorMode: 'solid', fontColor: item.color })}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-bold transition-all ${settings.fontColor === item.color ? 'border-black bg-neutral-100' : 'border-neutral-200 bg-white hover:border-neutral-300'}`}
                              >
                                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                                <span>{item.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gradient Selector */}
                    {settings.fontColorMode === 'gradient' && (
                      <div className="space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Direction Selection */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">渐变方向</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const from = settings.fontGradientFrom || '#f472b6';
                                const to = settings.fontGradientTo || '#38bdf8';
                                const grad = `linear-gradient(to right, ${from}, ${to})`;
                                handleUpdate({
                                  fontColorMode: 'gradient',
                                  fontGradientFrom: from,
                                  fontGradientTo: to,
                                  fontGradientDirection: 'to right',
                                  fontGradient: grad
                                });
                              }}
                              className={`py-1.5 px-3 rounded-lg border text-[10px] font-bold transition-all ${settings.fontGradientDirection === 'to right' || !settings.fontGradientDirection ? 'bg-black text-white border-black' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-300'}`}
                            >
                              左右渐变 (Horizontal)
                            </button>
                            <button
                              onClick={() => {
                                const from = settings.fontGradientFrom || '#f472b6';
                                const to = settings.fontGradientTo || '#38bdf8';
                                const grad = `linear-gradient(to bottom, ${from}, ${to})`;
                                handleUpdate({
                                  fontColorMode: 'gradient',
                                  fontGradientFrom: from,
                                  fontGradientTo: to,
                                  fontGradientDirection: 'to bottom',
                                  fontGradient: grad
                                });
                              }}
                              className={`py-1.5 px-3 rounded-lg border text-[10px] font-bold transition-all ${settings.fontGradientDirection === 'to bottom' ? 'bg-black text-white border-black' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-300'}`}
                            >
                              上下渐变 (Vertical)
                            </button>
                          </div>
                        </div>

                        {/* Preset Gradients */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">预设渐变方案</label>
                          <div className="grid grid-cols-2 gap-2">
                            {GRADIENT_PRESETS.map(g => {
                              const dir = settings.fontGradientDirection || 'to right';
                              const bgVal = `linear-gradient(${dir}, ${g.from}, ${g.to})`;
                              const isSelected = settings.fontGradientFrom === g.from && settings.fontGradientTo === g.to;
                              return (
                                <button 
                                  key={g.name}
                                  onClick={() => {
                                    handleUpdate({ 
                                      fontColorMode: 'gradient',
                                      fontGradientFrom: g.from,
                                      fontGradientTo: g.to,
                                      fontGradientDirection: dir,
                                      fontGradient: bgVal 
                                    });
                                  }}
                                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-start gap-1.5 relative overflow-hidden ${isSelected ? 'border-black bg-neutral-50' : 'border-neutral-100 bg-white hover:border-neutral-200'}`}
                                >
                                  <div 
                                    className="w-full h-5 rounded-md shadow-2xs"
                                    style={{ background: bgVal }}
                                  />
                                  <span className="text-[10px] font-bold text-neutral-800">{g.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Dual Color Pickers */}
                        <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-2">
                          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">自定义渐变双色</label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={settings.fontGradientFrom || '#f472b6'}
                                onChange={e => {
                                  const newFrom = e.target.value;
                                  const to = settings.fontGradientTo || '#38bdf8';
                                  const dir = settings.fontGradientDirection || 'to right';
                                  handleUpdate({
                                    fontColorMode: 'gradient',
                                    fontGradientFrom: newFrom,
                                    fontGradientTo: to,
                                    fontGradientDirection: dir,
                                    fontGradient: `linear-gradient(${dir}, ${newFrom}, ${to})`
                                  });
                                }}
                                className="w-7 h-7 rounded-lg border-none cursor-pointer shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-neutral-600">起点颜色</span>
                                <span className="text-[8px] font-mono text-neutral-400">{settings.fontGradientFrom || '#f472b6'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="color" 
                                value={settings.fontGradientTo || '#38bdf8'}
                                onChange={e => {
                                  const newTo = e.target.value;
                                  const from = settings.fontGradientFrom || '#f472b6';
                                  const dir = settings.fontGradientDirection || 'to right';
                                  handleUpdate({
                                    fontColorMode: 'gradient',
                                    fontGradientFrom: from,
                                    fontGradientTo: newTo,
                                    fontGradientDirection: dir,
                                    fontGradient: `linear-gradient(${dir}, ${from}, ${newTo})`
                                  });
                                }}
                                className="w-7 h-7 rounded-lg border-none cursor-pointer shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-neutral-600">终点颜色</span>
                                <span className="text-[8px] font-mono text-neutral-400">{settings.fontGradientTo || '#38bdf8'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Presets Section (Non-collapsible) */}
            <div className="border-b border-neutral-100">
              <div className="w-full flex items-center px-5 py-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs font-bold">主题预设</span>
                </div>
              </div>

              <div className="px-5 pb-4 space-y-4">
                {/* Default Presets */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">系统默认</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_PRESETS.map(preset => (
                      <div key={preset.id} className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg space-y-2">
                        <div>
                          <span className="text-[10px] font-bold block truncate">{preset.name}</span>
                          <span className="text-[8px] text-neutral-400 block mt-0.5 truncate">{preset.globalFont === 'nunito' ? '圆润可爱' : '优雅简约'}</span>
                        </div>
                        <button 
                          onClick={() => applyPreset(preset)}
                          className="w-full py-1 text-[9px] font-bold bg-white border border-neutral-200 rounded hover:border-black transition-all"
                        >
                          应用
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Presets */}
                {settings.themePresets && settings.themePresets.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">我的预设</label>
                    <div className="grid grid-cols-2 gap-2">
                      {settings.themePresets.map(preset => (
                        <div key={preset.id} className={`p-3 border rounded-lg space-y-2 relative group transition-all ${settings.activeThemePresetId === preset.id ? 'border-black bg-black/5' : 'bg-neutral-50 border-neutral-100'}`}>
                          {settings.activeThemePresetId === preset.id && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase">
                              <Check className="w-2 h-2" />
                              使用中
                            </div>
                          )}
                          <button 
                            onClick={() => deletePreset(preset.id)}
                            className="absolute bottom-2 right-2 p-1 text-neutral-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div>
                            <span className="text-[10px] font-bold block truncate pr-5">{preset.name}</span>
                            <span className="text-[8px] text-neutral-400 block mt-0.5 truncate">自定义预设</span>
                          </div>
                          <button 
                            onClick={() => applyPreset(preset)}
                            className={`w-full py-1 text-[9px] font-bold rounded transition-all ${settings.activeThemePresetId === preset.id ? 'bg-black text-white' : 'bg-white border border-neutral-200 hover:border-black'}`}
                          >
                            {settings.activeThemePresetId === preset.id ? '当前方案' : '应用'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save New Preset */}
                <div className="pt-2">
                  {isSavingPreset ? (
                    <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <input 
                        autoFocus
                        type="text" 
                        value={presetName}
                        onChange={e => setPresetName(e.target.value)}
                        placeholder="输入预设名称..."
                        className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-[10px] outline-none focus:border-black transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') savePreset();
                          if (e.key === 'Escape') setIsSavingPreset(false);
                        }}
                      />
                      <button 
                        onClick={savePreset}
                        className="bg-black text-white px-3 rounded-lg text-[10px] font-bold active:scale-95 transition-all"
                      >
                        确定
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsSavingPreset(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-neutral-200 rounded-lg hover:border-black hover:bg-neutral-50 transition-all group"
                    >
                      <Plus className="w-3 h-3 text-neutral-400 group-hover:text-black" />
                      <span className="text-[10px] font-bold text-neutral-500 group-hover:text-black">保存为新预设</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'api' && (
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">API 地址</label>
                    <input 
                      type="text" 
                      value={settings.apiUrl} 
                      onChange={e => handleUpdate({ apiUrl: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-black transition-all"
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">API Key</label>
                    <input 
                      type="password" 
                      value={settings.apiKey} 
                      onChange={e => handleUpdate({ apiKey: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-black transition-all"
                      placeholder="sk-..."
                    />
                  </div>
                  
                  {/* 模型选择下拉框和拉取模型按钮 */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">模型选择</label>
                    <div className="flex gap-2">
                      <select 
                        value={fetchedModels.includes(settings.model) ? settings.model : (settings.model ? "custom" : "")}
                        onChange={e => {
                          if (e.target.value && e.target.value !== "custom") {
                            handleUpdate({ model: e.target.value });
                          }
                        }}
                        className="flex-1 bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-black transition-all"
                      >
                        <option value="">-- 请选择或拉取模型 --</option>
                        {fetchedModels.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                        {settings.model && !fetchedModels.includes(settings.model) && (
                          <option value={settings.model}>{settings.model} (当前)</option>
                        )}
                        <option value="custom">✍️ 手动输入自定义...</option>
                      </select>
                      <button 
                        type="button"
                        onClick={handleFetchModels}
                        disabled={isLoadingModels}
                        className="px-4 bg-white hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold active:scale-95 transition-all shrink-0 flex items-center justify-center border border-neutral-200"
                      >
                        {isLoadingModels ? "拉取中..." : "拉取模型"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">模型名称 (可手动输入/修改作为备选)</label>
                    <input 
                      type="text" 
                      value={settings.model} 
                      onChange={e => handleUpdate({ model: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-black transition-all"
                      placeholder="gpt-4o / gemini-3.6-flash"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">API 协议格式</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdate({ apiFormat: 'openai' })}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          settings.apiFormat !== 'gemini' 
                            ? 'bg-black text-white border-black shadow-xs' 
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        OpenAI (messages)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate({ apiFormat: 'gemini' })}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          settings.apiFormat === 'gemini' 
                            ? 'bg-black text-white border-black shadow-xs' 
                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        Gemini (contents)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSave}
                    className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold shadow-md active:scale-[0.98] transition-all"
                  >
                    保存并应用
                  </button>
                </div>

                <div className="pt-4 border-t border-neutral-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">API 预设</label>
                    <div className="flex gap-2">
                      <select 
                        value={settings.activePresetId || ""}
                        onChange={(e) => {
                          const preset = settings.apiPresets?.find(p => p.id === e.target.value);
                          if (preset) {
                            if (window.confirm(`确认应用并自动填入预设“${preset.name}”的配置吗？\n(包含 API 地址、Key 和模型名称)`)) {
                              applyApiPreset(preset);
                            }
                          }
                        }}
                        className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-black"
                      >
                        <option value="">选择预设...</option>
                        {settings.apiPresets?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {settings.activePresetId && (
                        <button
                          type="button"
                          onClick={() => {
                            const preset = settings.apiPresets?.find(p => p.id === settings.activePresetId);
                            if (preset && window.confirm(`确定要删除选中的预设“${preset.name}”吗？`)) {
                              deleteApiPreset(preset.id);
                            }
                          }}
                          className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-bold border border-red-200/40 shrink-0 transition-all active:scale-95"
                          title="删除当前选中的预设"
                        >
                          删除预设
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isSavingApiPreset ? (
                      <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          autoFocus
                          type="text" 
                          value={apiPresetName}
                          onChange={e => setApiPresetName(e.target.value)}
                          placeholder="输入预设名称..."
                          className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none"
                        />
                        <button 
                          onClick={saveApiPreset}
                          className="px-4 bg-black text-white rounded-xl text-[10px] font-bold"
                        >
                          保存
                        </button>
                        <button 
                          onClick={() => setIsSavingApiPreset(false)}
                          className="px-3 bg-neutral-100 text-neutral-600 rounded-xl text-[10px]"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsSavingApiPreset(true)}
                        className="w-full py-2.5 border-2 border-dashed border-neutral-200 rounded-xl flex items-center justify-center gap-2 text-neutral-400 hover:text-black hover:border-black transition-all group"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="text-[10px] font-bold">保存当前为新预设</span>
                      </button>
                    )}
                  </div>
                </div>
             </div>
          </div>
        )}

        {activeSubTab === 'data' && (
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Database className="w-8 h-8 text-neutral-800" />
              </div>
              <div>
                <h3 className="text-sm font-bold">当前数据状态</h3>
                <p className="text-xs text-neutral-500 mt-1">共存储 {getDataStats()} 条核心业务数据</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={exportAllData}
                className="flex flex-col items-center gap-3 p-5 bg-white border border-neutral-100 rounded-2xl hover:border-black transition-all group"
              >
                <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <ArrowUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">导出 JSON 数据</span>
              </button>

              <button 
                onClick={() => document.getElementById('full-import-input')?.click()}
                className="flex flex-col items-center gap-3 p-5 bg-white border border-neutral-100 rounded-2xl hover:border-black transition-all group"
              >
                <div className="w-10 h-10 bg-neutral-50 rounded-xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <ArrowDown className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">导入 JSON 数据</span>
                <input id="full-import-input" type="file" accept=".json" className="hidden" onChange={importAllData} />
              </button>
            </div>

            <div className="pt-10 flex justify-center">
              <button 
                onClick={clearAllData}
                className="px-6 py-2 border border-neutral-200 rounded-full text-[10px] font-bold text-neutral-400 hover:text-red-500 hover:border-red-400 hover:bg-red-50/30 transition-all active:scale-95"
              >
                清除所有数据
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer (Fixed for Interface tab) */}
      {activeSubTab === 'interface' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-100 z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex flex-col">
          {/* Import/Export row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-50">
            <button 
              onClick={exportTheme}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-neutral-300 transition-all text-[9px] font-bold text-neutral-600 uppercase tracking-tight"
            >
              <Download className="w-3 h-3 text-neutral-400" />
              导出设置包
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-neutral-300 transition-all text-[9px] font-bold text-neutral-600 uppercase tracking-tight"
            >
              <Package className="w-3 h-3 text-neutral-400" />
              导入设置包
            </button>
          </div>

          {/* Action buttons row */}
          <div className="p-4 flex items-center justify-between">
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importTheme} />
            <button 
              onClick={handleReset}
              className="flex flex-col items-start group"
            >
              <div className="flex items-center gap-1.5 text-neutral-800">
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform" />
                <span className="text-xs font-bold">重置</span>
              </div>
              <span className="text-[10px] text-[#A8A39A] font-medium mt-0.5">恢复到当前预设状态</span>
            </button>

            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存并应用</span>
            </button>
          </div>
        </div>
      )}
      {confirmDialog && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[290px] rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-neutral-100 flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 tracking-wide">
                {confirmDialog.title}
              </h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setConfirmDialog(null)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="w-full bg-black hover:bg-neutral-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsApp;

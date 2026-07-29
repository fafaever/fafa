import React, { useState, useRef } from "react";
import { ChevronLeft, Save, Trash2, Upload, RotateCcw, Download, Plus, Check, X, Monitor, Layout, Type, Palette, Package, Smartphone, Image as ImageIcon, Database, Cpu, HardDrive, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Eye, EyeOff, Brain, Wand2 } from "lucide-react";
import { AppSettings, FontOption, ThemePreset } from "../types";
import { apiFetchModels } from "../lib/api";
import ImageGenSettingsApp from "./ImageGenSettingsApp";
import { compressImage } from "../utils/imageCompressor";

interface SettingsAppProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

const SettingsApp: React.FC<SettingsAppProps> = ({ settings, onUpdateSettings, onSaveSettings, onClose }) => {
  const [activeSubTab, setActiveSubTab] = useState<'main' | 'api' | 'data' | 'interface' | 'vector' | 'imageGen'>('main');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['wallpaper', 'icons', 'font']));
  
  const [initialSettings] = useState<AppSettings>({ ...settings });
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isSavingApiPreset, setIsSavingApiPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [apiPresetName, setApiPresetName] = useState("");
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelFetchResult, setModelFetchResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [isTestingVector, setIsTestingVector] = useState(false);
  const [vectorTestResult, setVectorTestResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [isApiPresetsExpanded, setIsApiPresetsExpanded] = useState(false);
  const [showFullApiKey, setShowFullApiKey] = useState(false);
  const [isApiKeyFocused, setIsApiKeyFocused] = useState(false);

  // Redesigned Main & Sub API states
  const [fetchedMainModels, setFetchedMainModels] = useState<string[]>([]);
  const [isLoadingMainModels, setIsLoadingMainModels] = useState(false);
  const [mainModelFetchResult, setMainModelFetchResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [fetchedSubModels, setFetchedSubModels] = useState<string[]>([]);
  const [isLoadingSubModels, setIsLoadingSubModels] = useState(false);
  const [subModelFetchResult, setSubModelFetchResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [fetchedVectorModels, setFetchedVectorModels] = useState<string[]>([]);
  const [isLoadingVectorModels, setIsLoadingVectorModels] = useState(false);
  const [vectorModelFetchResult, setVectorModelFetchResult] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [showPresetSaveModal, setShowPresetSaveModal] = useState<'main' | 'sub' | 'vector' | null>(null);
  const [presetSaveName, setPresetSaveName] = useState("");
  const [showFullMainApiKey, setShowFullMainApiKey] = useState(false);
  const [showFullSubApiKey, setShowFullSubApiKey] = useState(false);
  const [showFullVectorApiKey, setShowFullVectorApiKey] = useState(false);
  const [isMainApiKeyFocused, setIsMainApiKeyFocused] = useState(false);
  const [isSubApiKeyFocused, setIsSubApiKeyFocused] = useState(false);
  const [isVectorApiKeyFocused, setIsVectorApiKeyFocused] = useState(false);
  const [isMainPresetsExpanded, setIsMainPresetsExpanded] = useState(false);
  const [isSubPresetsExpanded, setIsSubPresetsExpanded] = useState(false);
  const [isVectorPresetsExpanded, setIsVectorPresetsExpanded] = useState(false);
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

  const processWallpaperImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const processImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadWallpaper = async (screen: 1 | 2) => {
    const input = screen === 1 ? wallpaper1Ref.current : wallpaper2Ref.current;
    if (input?.files?.[0]) {
      try {
        const base64 = await compressImage(input.files[0], 800, 0.7);
        if (screen === 1) handleUpdate({ homeWallpaper: base64 });
        else handleUpdate({ homeWallpaper2: base64 });
      } catch (err) {
        console.error("Wallpaper compression error:", err);
      } finally {
        if (input) input.value = '';
      }
    }
  };

  const handleUploadIcon = (appKey: string) => {
    setCurrentIconKey(appKey);
    iconInputRef.current?.click();
  };

  const onIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && currentIconKey) {
      try {
        const base64 = await compressImage(e.target.files[0], 800, 0.7);
        const newIcons = { ...settings.appIcons, [currentIconKey]: base64 };
        handleUpdate({ appIcons: newIcons });
      } catch (err) {
        console.error("Icon compression error:", err);
      }
    }
  };

  const handleUploadFont = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fontDataUrl = event.target?.result as string;
        try {
          localStorage.setItem("mobile_ai_custom_font_url", fontDataUrl);
          localStorage.setItem("mobile_ai_global_font", "custom");
        } catch (err) {
          console.error("Font persist error:", err);
        }
        handleUpdate({ 
          globalFont: 'custom', 
          customFontUrl: fontDataUrl 
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
      model: settings.model,
      apiFormat: settings.apiFormat
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
      apiFormat: preset.apiFormat || settings.apiFormat,
      activePresetId: preset.id
    });
  };

  const deleteApiPreset = (id: string) => {
    handleUpdate({
      apiPresets: settings.apiPresets?.filter(p => p.id !== id),
      activePresetId: settings.activePresetId === id ? undefined : settings.activePresetId
    });
  };

  const applyPresetToCard = (preset: any, type: 'main' | 'sub' | 'vector') => {
    if (type === 'main') {
      handleUpdate({
        apiUrl: preset.apiUrl,
        apiKey: preset.apiKey,
        model: preset.model,
        apiFormat: preset.apiFormat || 'openai',
        temperature: preset.temperature !== undefined ? preset.temperature : 0.8,
      });
    } else if (type === 'sub') {
      handleUpdate({
        subApiUrl: preset.apiUrl,
        subApiKey: preset.apiKey,
        subModel: preset.model,
        subApiFormat: preset.apiFormat || 'openai',
        subTemperature: preset.temperature !== undefined ? preset.temperature : 0.8,
      });
    } else {
      handleUpdate({
        vectorApiUrl: preset.apiUrl,
        vectorApiKey: preset.apiKey,
        vectorModel: preset.model,
      });
    }
  };

  const savePresetToLocal = (type: 'main' | 'sub' | 'vector') => {
    if (!presetSaveName.trim()) return;
    let url = "";
    let key = "";
    let mdl = "";
    let fmt: 'openai' | 'gemini' = "openai";
    let temp = 0.8;

    if (type === 'main') {
      url = settings.apiUrl;
      key = settings.apiKey;
      mdl = settings.model;
      fmt = settings.apiFormat || "openai";
      temp = settings.temperature || 0.8;
    } else if (type === 'sub') {
      url = settings.subApiUrl || settings.apiUrl;
      key = settings.subApiKey || "";
      mdl = settings.subModel || "";
      fmt = settings.subApiFormat || "openai";
      temp = settings.subTemperature || 0.8;
    } else {
      url = settings.vectorApiUrl || "";
      key = settings.vectorApiKey || "";
      mdl = settings.vectorModel || "";
    }

    const newPreset = {
      id: Date.now().toString(),
      name: presetSaveName,
      apiUrl: url,
      apiKey: key,
      model: mdl,
      apiFormat: fmt,
      temperature: temp,
    };

    handleUpdate({
      apiPresets: [...(settings.apiPresets || []), newPreset]
    });

    setPresetSaveName("");
    setShowPresetSaveModal(null);
  };

  const handleFetchModelsForCard = async (type: 'main' | 'sub' | 'vector') => {
    let url = "";
    let key = "";
    if (type === 'main') {
      url = settings.apiUrl;
      key = settings.apiKey;
    } else if (type === 'sub') {
      url = settings.subApiUrl || settings.apiUrl;
      key = settings.subApiKey || settings.apiKey;
    } else {
      url = settings.vectorApiUrl || "";
      key = settings.vectorApiKey || "";
    }

    if (!url || !key) {
      alert("请先填写 API 地址和 API Key！");
      return;
    }

    if (type === 'main') {
      setIsLoadingMainModels(true);
      setMainModelFetchResult(null);
    } else if (type === 'sub') {
      setIsLoadingSubModels(true);
      setSubModelFetchResult(null);
    } else {
      setIsLoadingVectorModels(true);
      setVectorModelFetchResult(null);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const res = await apiFetchModels({
        apiUrl: url,
        apiKey: key
      });
      
      clearTimeout(timeoutId);

      if (res.success && res.models && res.models.length > 0) {
        if (type === 'main') {
          setFetchedMainModels(res.models);
          if (!settings.model && res.models[0]) {
            handleUpdate({ model: res.models[0] });
          }
          setMainModelFetchResult({type: 'success', message: '主模型拉取成功，请选择模型'});
        } else if (type === 'sub') {
          setFetchedSubModels(res.models);
          if (!settings.subModel && res.models[0]) {
            handleUpdate({ subModel: res.models[0] });
          }
          setSubModelFetchResult({type: 'success', message: '副模型拉取成功，请选择模型'});
        } else {
          setFetchedVectorModels(res.models);
          if (!settings.vectorModel && res.models[0]) {
            handleUpdate({ vectorModel: res.models[0] });
          }
          setVectorModelFetchResult({type: 'success', message: '向量模型拉取成功，请选择模型'});
        }
      } else {
        const errObj = {type: 'error' as const, message: '未获取到可用模型。'};
        if (type === 'main') setMainModelFetchResult(errObj);
        else if (type === 'sub') setSubModelFetchResult(errObj);
        else setVectorModelFetchResult(errObj);
      }
    } catch (err: any) {
      console.error("[Fetch Models Error]:", err);
      let errMsg = err.message;
      if (errMsg.includes("abort")) {
        errMsg = "拉取超时，请检查网络或中转站状态。";
      }
      const errObj = {type: 'error' as const, message: errMsg || "拉取模型列表失败，请手动输入模型名称。"};
      if (type === 'main') setMainModelFetchResult(errObj);
      else if (type === 'sub') setSubModelFetchResult(errObj);
      else setVectorModelFetchResult(errObj);
    } finally {
      if (type === 'main') setIsLoadingMainModels(false);
      else if (type === 'sub') setIsLoadingSubModels(false);
      else setIsLoadingVectorModels(false);
    }
  };

  const testVectorConnection = async () => {
    const url = (settings.vectorApiUrl || "https://api.siliconflow.cn/v1").trim();
    const key = (settings.vectorApiKey || "").trim();
    const model = (settings.vectorModel || "BAAI/bge-m3").trim();

    if (!key) {
      alert("请先填写 Embedding API Key！");
      return;
    }

    setIsTestingVector(true);
    setVectorTestResult(null);

    try {
      const response = await fetch(`${url}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: model,
          input: ["测试连接"]
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && (data.data || data.embeddings)) {
          setVectorTestResult({ type: 'success', message: "✨ 连接测试成功！能够正常获取 Embedding 向量。" });
        } else {
          setVectorTestResult({ type: 'error', message: `连接成功，但返回数据格式不符合预期: ${JSON.stringify(data).slice(0, 100)}` });
        }
      } else {
        const errorText = await response.text();
        setVectorTestResult({ type: 'error', message: `连接测试失败 (${response.status}): ${errorText.slice(0, 150)}` });
      }
    } catch (err: any) {
      setVectorTestResult({ type: 'error', message: `连接测试失败: ${err.message || err}` });
    } finally {
      setIsTestingVector(false);
    }
  };

  const handleFetchModels = async () => {
    if (!settings.apiUrl || !settings.apiKey) {
      alert("请先填写 API 地址和 API Key！");
      return;
    }
    setIsLoadingModels(true);
    setModelFetchResult(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s frontend timeout

      const res = await apiFetchModels({
        apiUrl: settings.apiUrl,
        apiKey: settings.apiKey
      });
      
      clearTimeout(timeoutId);

      if (res.success && res.models && res.models.length > 0) {
        setFetchedModels(res.models);
        if (!settings.model && res.models[0]) {
          handleUpdate({ model: res.models[0] });
        }
        setModelFetchResult({type: 'success', message: '模型拉取成功，请选择模型'});
      } else {
        setModelFetchResult({type: 'error', message: '未获取到可用模型。'});
      }
    } catch (err: any) {
      console.error("[Fetch Models Error]:", err);
      let errMsg = err.message;
      if (errMsg.includes("abort")) {
        errMsg = "拉取超时，请检查网络或中转站状态。";
      }
      setModelFetchResult({type: 'error', message: errMsg || "拉取模型列表失败，请手动输入模型名称。"});
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
      case 'vector': return "向量记忆配置";
      case 'imageGen': return "生图设置";
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
        {activeSubTab === 'imageGen' ? (
          <ImageGenSettingsApp settings={settings} onUpdateSettings={onUpdateSettings} onClose={() => setActiveSubTab('main')} />
        ) : activeSubTab === 'main' && (
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

            {/* Vector Memory Card */}
            <button 
              onClick={() => setActiveSubTab('vector')}
              className="w-full flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 hover:border-neutral-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-[#5B507A] text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>向量记忆</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">配置向量检索与 Embedding/Rerank 模型</p>
              </div>
            </button>

            {/* Image Gen Card */}
            <button 
              onClick={() => setActiveSubTab('imageGen')}
              className="w-full flex items-center gap-4 p-5 bg-neutral-50 rounded-2xl border border-neutral-100 hover:bg-neutral-100 hover:border-neutral-200 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-neutral-900 text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Wand2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">生图功能</h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">配置图片生成 API 与预设</p>
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
                          <div className="w-8 h-8 rounded-md bg-transparent border border-neutral-200/50 flex items-center justify-center overflow-hidden shrink-0">
                            {settings.appIcons?.[app.key] ? (
                              <img src={settings.appIcons[app.key]} className="w-full h-full object-contain bg-transparent" style={{ backgroundColor: 'transparent' }} />
                            ) : (
                              defaultIcons[app.key] ? (
                                <img src={defaultIcons[app.key]} className="w-full h-full object-cover opacity-60 bg-transparent" style={{ backgroundColor: 'transparent' }} />
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

        {activeSubTab === 'vector' && (
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Title Section */}
            <div className="pb-2 border-b border-neutral-100">
              <h2 className="text-xl font-bold font-serif tracking-tight text-neutral-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                向量记忆管理 (Vector Memory)
              </h2>
              <p className="text-xs text-neutral-500 font-sans mt-1">
                配置用于角色世界书与记忆库高维向量检索的 Embedding 及 Rerank 服务
              </p>
            </div>

            {/* Main Configuration Card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 relative" id="vector-config-panel">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-sm font-bold text-neutral-900 font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>
                  向量模型与接口参数配置
                </span>
                <span className="text-[10px] font-mono font-bold text-[#5B507A] uppercase">
                  ACTIVE EMBEDDING SERVICE
                </span>
              </div>

              {/* Tips */}
              <div className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 font-sans">
                💡 <strong>关于向量记忆：</strong>高维向量（Embedding）用于计算对话历史与世界书设定之间的精准语义相似度。开启后，角色不仅能根据关键词触发设定，还能实现深度的模糊语义检索与情境记忆检索。
              </div>

              {/* Base URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Embedding Base URL (接口地址)
                </label>
                <input 
                  type="text" 
                  value={settings.vectorApiUrl ?? "https://api.siliconflow.cn/v1"} 
                  onChange={e => handleUpdate({ vectorApiUrl: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="https://api.siliconflow.cn/v1"
                />
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Embedding API Key
                </label>
                <div className="relative flex items-center">
                  <input 
                    type={showFullVectorApiKey ? "text" : "password"}
                    value={settings.vectorApiKey || ""} 
                    onChange={e => handleUpdate({ vectorApiKey: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 pr-10 text-xs outline-none focus:border-black transition-all font-mono"
                    placeholder="填写 API Key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFullVectorApiKey(!showFullVectorApiKey)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                  >
                    {showFullVectorApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Embedding Model */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                    Embedding 模型
                  </label>
                  <button 
                    type="button"
                    onClick={() => handleFetchModelsForCard('vector')}
                    disabled={isLoadingVectorModels}
                    className="text-[10px] font-bold text-[#5B507A] hover:text-black transition-colors flex items-center gap-1"
                  >
                    <span>{isLoadingVectorModels ? "拉取中..." : "拉取可用模型"}</span>
                  </button>
                </div>

                {vectorModelFetchResult && (
                  <div className={`text-[10px] px-2 py-1.5 rounded-lg font-sans ${vectorModelFetchResult.type === 'success' ? 'bg-neutral-50 border border-neutral-100 text-neutral-800' : 'bg-red-50 text-red-600'}`}>
                    {vectorModelFetchResult.message}
                  </div>
                )}

                {fetchedVectorModels.length > 0 ? (
                  <select
                    value={settings.vectorModel ?? "BAAI/bge-m3"}
                    onChange={e => handleUpdate({ vectorModel: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all appearance-none font-sans"
                  >
                    <option value="">-- 请选择模型 (或在下方手动输入) --</option>
                    {fetchedVectorModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : null}

                <input
                  type="text"
                  value={settings.vectorModel ?? "BAAI/bge-m3"}
                  onChange={e => handleUpdate({ vectorModel: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="BAAI/bge-m3"
                />
              </div>

              {/* Rerank Model */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Rerank 模型 <span className="text-neutral-400 text-[9px]">(可选)</span>
                </label>
                <input 
                  type="text" 
                  value={settings.rerankModel ?? "bge-reranker-v2-m3"} 
                  onChange={e => handleUpdate({ rerankModel: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="bge-reranker-v2-m3"
                />
              </div>

              {/* Dimension */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  向量维度 (Dimension)
                </label>
                <input 
                  type="number" 
                  value={settings.vectorDimension ?? 1024} 
                  onChange={e => handleUpdate({ vectorDimension: parseInt(e.target.value) || 1024 })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="1024 (bge-m3 为 1024)"
                />
              </div>

              {/* Test Results */}
              {vectorTestResult && (
                <div className={`text-xs px-3 py-2.5 rounded-xl font-sans border ${
                  vectorTestResult.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  {vectorTestResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="button"
                  onClick={testVectorConnection}
                  disabled={isTestingVector}
                  className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isTestingVector ? "测试中..." : "测试连接"}
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存配置
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'api' && (
          <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Header / Title Section */}
            <div className="pb-2 border-b border-neutral-100">
              <h2 className="text-xl font-bold font-serif tracking-tight text-neutral-900" style={{ fontFamily: 'Playfair Display, serif' }}>
                API 管理 (API Management)
              </h2>
              <p className="text-xs text-neutral-500 font-sans mt-1">
                独立配置用于对话的主接口及辅助后台分析的次接口
              </p>
            </div>

            {/* --- CARD 1: MAIN API CARD --- */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 relative" id="main-api-card">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-sm font-bold text-neutral-900 font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>
                  主 API 配置 (Main API)
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                  主对话模型
                </span>
              </div>

              {/* API Type Select Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  API 协议类型
                </label>
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
                    OpenAI
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
                    Gemini
                  </button>
                </div>
              </div>

              {/* Base URL Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Base URL (接口地址)
                </label>
                <input 
                  type="text" 
                  value={settings.apiUrl} 
                  onChange={e => handleUpdate({ apiUrl: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              {/* API Key with Show/Hide */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  API Key
                </label>
                <div className="relative flex items-center">
                  <input 
                    type={showFullMainApiKey ? "text" : "password"}
                    value={settings.apiKey} 
                    onChange={e => handleUpdate({ apiKey: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 pr-10 text-xs outline-none focus:border-black transition-all font-mono"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowFullMainApiKey(!showFullMainApiKey)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                    title={showFullMainApiKey ? "隐藏 Key" : "显示 Key"}
                  >
                    {showFullMainApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Name Input + Pull Button */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                    模型名称
                  </label>
                  <button 
                    type="button"
                    onClick={() => handleFetchModelsForCard('main')}
                    disabled={isLoadingMainModels}
                    className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors flex items-center gap-1"
                  >
                    <span>{isLoadingMainModels ? "拉取中..." : "拉取模型列表"}</span>
                  </button>
                </div>
                
                {mainModelFetchResult && (
                  <div className={`text-[10px] px-2 py-1.5 rounded-lg font-sans ${mainModelFetchResult.type === 'success' ? 'bg-neutral-50 border border-neutral-100 text-neutral-800' : 'bg-red-50 text-red-600'}`}>
                    {mainModelFetchResult.message}
                  </div>
                )}

                {fetchedMainModels.length > 0 ? (
                  <select
                    value={settings.model}
                    onChange={e => handleUpdate({ model: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all appearance-none font-sans"
                  >
                    {fetchedMainModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settings.model}
                    onChange={e => handleUpdate({ model: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                    placeholder="请输入或选择模型名称"
                  />
                )}
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                    模型温度 (Temperature)
                  </label>
                  <span className="text-xs font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                    {settings.temperature ?? 0.8}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature ?? 0.8}
                  onChange={e => handleUpdate({ temperature: parseFloat(e.target.value) })}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              {/* Action Rows: Save Config Button & Preset options */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                <button 
                  onClick={handleSave}
                  className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存配置
                </button>
                <button 
                  onClick={() => setShowPresetSaveModal('main')}
                  className="w-full py-2.5 bg-white border border-neutral-200 hover:border-black text-neutral-700 hover:text-black rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存为预设
                </button>
              </div>

              {/* Preset Loading list */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsMainPresetsExpanded(!isMainPresetsExpanded)}
                  className="w-full py-2 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-100 rounded-xl flex items-center justify-between px-3 text-[11px] font-bold text-neutral-600 transition-all"
                >
                  <span>应用/管理预设 ({settings.apiPresets?.length || 0})</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isMainPresetsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isMainPresetsExpanded && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {settings.apiPresets && settings.apiPresets.length > 0 ? (
                      settings.apiPresets.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-neutral-50/50 p-2 rounded-lg border border-neutral-100 text-[11px]">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-neutral-800 truncate">{p.name}</span>
                            <span className="text-[9px] text-neutral-400 truncate font-mono">{p.model} / {p.apiUrl}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => {
                                applyPresetToCard(p, 'main');
                                alert(`已应用预设: ${p.name}`);
                              }}
                              className="px-2 py-1 bg-white hover:bg-black hover:text-white rounded border border-neutral-200 font-bold text-[9px] text-neutral-600 transition-all"
                            >
                              应用
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要删除预设“${p.name}”吗？`)) {
                                  deleteApiPreset(p.id);
                                }
                              }}
                              className="p-1 hover:text-red-500 rounded hover:bg-white text-neutral-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-neutral-400 text-center py-2">暂无已保存预设</p>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* --- CARD 2: SUB API CARD --- */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 relative" id="sub-api-card">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-sm font-bold text-neutral-900 font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>
                  副 API 配置 (Sub API)
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                  记忆提取/后台任务
                </span>
              </div>

              {/* Sub API Hint Description */}
              <div className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 font-sans">
                💡 <strong>用于记忆提取等后台任务：</strong>不填则自动回退使用主 API。建议使用价格较低、吞吐速度更快的模型，以分担主模型的工作量。
              </div>

              {/* API Type Select Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  API 协议类型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdate({ subApiFormat: 'openai' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      settings.subApiFormat !== 'gemini' 
                        ? 'bg-black text-white border-black shadow-xs' 
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    OpenAI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate({ subApiFormat: 'gemini' })}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      settings.subApiFormat === 'gemini' 
                        ? 'bg-black text-white border-black shadow-xs' 
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    Gemini
                  </button>
                </div>
              </div>

              {/* Base URL Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Base URL (接口地址) <span className="text-neutral-400 text-[9px]">(可选)</span>
                </label>
                <input 
                  type="text" 
                  value={settings.subApiUrl || ""} 
                  onChange={e => handleUpdate({ subApiUrl: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="留空则使用主 API 地址"
                />
              </div>

              {/* API Key with Show/Hide */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  API Key <span className="text-neutral-400 text-[9px]">(可选)</span>
                </label>
                <div className="relative flex items-center">
                  <input 
                    type={showFullSubApiKey ? "text" : "password"}
                    value={settings.subApiKey || ""} 
                    onChange={e => handleUpdate({ subApiKey: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 pr-10 text-xs outline-none focus:border-black transition-all font-mono"
                    placeholder="留空则使用主 API Key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFullSubApiKey(!showFullSubApiKey)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                    title={showFullSubApiKey ? "隐藏 Key" : "显示 Key"}
                  >
                    {showFullSubApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Name Input + Pull Button */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                    模型名称
                  </label>
                  <button 
                    type="button"
                    onClick={() => handleFetchModelsForCard('sub')}
                    disabled={isLoadingSubModels}
                    className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors flex items-center gap-1"
                  >
                    <span>{isLoadingSubModels ? "拉取中..." : "拉取模型列表"}</span>
                  </button>
                </div>
                
                {subModelFetchResult && (
                  <div className={`text-[10px] px-2 py-1.5 rounded-lg font-sans ${subModelFetchResult.type === 'success' ? 'bg-neutral-50 border border-neutral-100 text-neutral-800' : 'bg-red-50 text-red-600'}`}>
                    {subModelFetchResult.message}
                  </div>
                )}

                {fetchedSubModels.length > 0 ? (
                  <select
                    value={settings.subModel || ""}
                    onChange={e => handleUpdate({ subModel: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all appearance-none font-sans"
                  >
                    <option value="">(继承主模型)</option>
                    {fetchedSubModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settings.subModel || ""}
                    onChange={e => handleUpdate({ subModel: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                    placeholder="留空则使用主模型名称"
                  />
                )}
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                    次模型温度 (Temperature)
                  </label>
                  <span className="text-xs font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                    {settings.subTemperature ?? 0.8}
                  </span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.subTemperature ?? 0.8}
                  onChange={e => handleUpdate({ subTemperature: parseFloat(e.target.value) })}
                  className="w-full accent-black cursor-pointer"
                />
              </div>

              {/* Action Rows: Save Config Button & Preset options */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                <button 
                  onClick={handleSave}
                  className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存配置
                </button>
                <button 
                  onClick={() => setShowPresetSaveModal('sub')}
                  className="w-full py-2.5 bg-white border border-neutral-200 hover:border-black text-neutral-700 hover:text-black rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存为预设
                </button>
              </div>

              {/* Preset Loading list */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubPresetsExpanded(!isSubPresetsExpanded)}
                  className="w-full py-2 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-100 rounded-xl flex items-center justify-between px-3 text-[11px] font-bold text-neutral-600 transition-all"
                >
                  <span>应用/管理预设 ({settings.apiPresets?.length || 0})</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isSubPresetsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isSubPresetsExpanded && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {settings.apiPresets && settings.apiPresets.length > 0 ? (
                      settings.apiPresets.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-neutral-50/50 p-2 rounded-lg border border-neutral-100 text-[11px]">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-neutral-800 truncate">{p.name}</span>
                            <span className="text-[9px] text-neutral-400 truncate font-mono">{p.model} / {p.apiUrl}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => {
                                applyPresetToCard(p, 'sub');
                                alert(`已应用预设: ${p.name}`);
                              }}
                              className="px-2 py-1 bg-white hover:bg-black hover:text-white rounded border border-neutral-200 font-bold text-[9px] text-neutral-600 transition-all"
                            >
                              应用
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要删除预设“${p.name}”吗？`)) {
                                  deleteApiPreset(p.id);
                                }
                              }}
                              className="p-1 hover:text-red-500 rounded hover:bg-white text-neutral-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-neutral-400 text-center py-2">暂无已保存预设</p>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* --- CARD 3: VECTOR API CARD --- */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm space-y-4 relative" id="vector-api-card">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-sm font-bold text-neutral-900 font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>
                  向量 API 配置 (Vector API)
                </span>
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
                  记忆检索/高维向量
                </span>
              </div>

              {/* Vector API Hint Description */}
              <div className="text-[11px] text-stone-500 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 font-sans">
                💡 <strong>用于记忆/设定向量匹配：</strong>用于计算世界书与记忆库的高维向量相似度检索。不配置则自动使用传统文本分词与关键词命中规则进行混合匹配。
              </div>

              {/* Base URL Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Base URL (接口地址) <span className="text-neutral-400 text-[9px]">(可选)</span>
                </label>
                <input 
                  type="text" 
                  value={settings.vectorApiUrl ?? "https://api.siliconflow.cn/v1"} 
                  onChange={e => handleUpdate({ vectorApiUrl: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="https://api.siliconflow.cn/v1"
                />
              </div>

              {/* API Key with Show/Hide */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  API Key <span className="text-neutral-400 text-[9px]">(可选)</span>
                </label>
                <div className="relative flex items-center">
                  <input 
                    type={showFullVectorApiKey ? "text" : "password"}
                    value={settings.vectorApiKey || ""} 
                    onChange={e => handleUpdate({ vectorApiKey: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 pr-10 text-xs outline-none focus:border-black transition-all font-mono"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowFullVectorApiKey(!showFullVectorApiKey)}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-700 transition-colors p-1"
                    title={showFullVectorApiKey ? "隐藏 Key" : "显示 Key"}
                  >
                    {showFullVectorApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Name Input + Pull Button */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                    模型名称 <span className="text-neutral-400 text-[9px]">(可选)</span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => handleFetchModelsForCard('vector')}
                    disabled={isLoadingVectorModels}
                    className="text-[10px] font-bold text-neutral-400 hover:text-black transition-colors flex items-center gap-1"
                  >
                    <span>{isLoadingVectorModels ? "拉取中..." : "拉取模型列表"}</span>
                  </button>
                </div>
                
                {vectorModelFetchResult && (
                  <div className={`text-[10px] px-2 py-1.5 rounded-lg font-sans ${vectorModelFetchResult.type === 'success' ? 'bg-neutral-50 border border-neutral-100 text-neutral-800' : 'bg-red-50 text-red-600'}`}>
                    {vectorModelFetchResult.message}
                  </div>
                )}

                {fetchedVectorModels.length > 0 ? (
                  <select
                    value={settings.vectorModel ?? "BAAI/bge-m3"}
                    onChange={e => handleUpdate({ vectorModel: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all appearance-none font-sans"
                  >
                    <option value="">text-embedding-3-small</option>
                    {fetchedVectorModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settings.vectorModel ?? "BAAI/bge-m3"}
                    onChange={e => handleUpdate({ vectorModel: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                    placeholder="BAAI/bge-m3"
                  />
                )}
              </div>

              {/* Rerank Model Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  Rerank 模型 <span className="text-neutral-400 text-[9px]">(可选)</span>
                </label>
                <input
                  type="text"
                  value={settings.rerankModel ?? "bge-reranker-v2-m3"}
                  onChange={e => handleUpdate({ rerankModel: e.target.value })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="bge-reranker-v2-m3"
                />
              </div>

              {/* Dimension Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1 font-sans">
                  向量维度 (Dimension)
                </label>
                <input 
                  type="number" 
                  value={settings.vectorDimension ?? 1024} 
                  onChange={e => handleUpdate({ vectorDimension: parseInt(e.target.value) || 1024 })}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all font-sans"
                  placeholder="1024"
                />
              </div>

              {/* Action Rows: Save Config Button & Preset options */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                <button 
                  onClick={handleSave}
                  className="w-full py-2.5 bg-black hover:bg-neutral-900 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存配置
                </button>
                <button 
                  onClick={() => setShowPresetSaveModal('vector')}
                  className="w-full py-2.5 bg-white border border-neutral-200 hover:border-black text-neutral-700 hover:text-black rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  保存为预设
                </button>
              </div>

              {/* Preset Loading list */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsVectorPresetsExpanded(!isVectorPresetsExpanded)}
                  className="w-full py-2 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-100 rounded-xl flex items-center justify-between px-3 text-[11px] font-bold text-neutral-600 transition-all"
                >
                  <span>应用/管理预设 ({settings.apiPresets?.length || 0})</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isVectorPresetsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isVectorPresetsExpanded && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {settings.apiPresets && settings.apiPresets.length > 0 ? (
                      settings.apiPresets.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-neutral-50/50 p-2 rounded-lg border border-neutral-100 text-[11px]">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-neutral-800 truncate">{p.name}</span>
                            <span className="text-[9px] text-neutral-400 truncate font-mono">{p.model} / {p.apiUrl}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => {
                                applyPresetToCard(p, 'vector');
                                alert(`已应用预设: ${p.name}`);
                              }}
                              className="px-2 py-1 bg-white hover:bg-black hover:text-white rounded border border-neutral-200 font-bold text-[9px] text-neutral-600 transition-all"
                            >
                              应用
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`确定要删除预设“${p.name}”吗？`)) {
                                  deleteApiPreset(p.id);
                                }
                              }}
                              className="p-1 hover:text-red-500 rounded hover:bg-white text-neutral-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-neutral-400 text-center py-2">暂无已保存预设</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Custom high-quality, high-contrast modal dialog to save presets */}
            {showPresetSaveModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 z-[120] animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-2xl max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="text-center space-y-1.5">
                    <h3 className="text-sm font-bold text-neutral-900 font-serif" style={{ fontFamily: 'Playfair Display, serif' }}>
                      保存为 API 配置预设
                    </h3>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      请输入预设名称，保存后该预设可在任何卡片中快速加载
                    </p>
                  </div>

                  <input
                    type="text"
                    autoFocus
                    value={presetSaveName}
                    onChange={e => setPresetSaveName(e.target.value)}
                    placeholder="e.g. 零一万物, DeepSeek 高速..."
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-black transition-all"
                    onKeyDown={e => {
                      if (e.key === "Enter") savePresetToLocal(showPresetSaveModal);
                      if (e.key === "Escape") setShowPresetSaveModal(null);
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setShowPresetSaveModal(null)}
                      className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-xl transition-all"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => savePresetToLocal(showPresetSaveModal)}
                      className="w-full bg-black hover:bg-neutral-900 text-white font-bold text-xs py-2 rounded-xl transition-all"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}

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

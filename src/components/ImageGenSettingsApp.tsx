import React, { useState, useEffect } from "react";
import { ChevronLeft, Save, Loader2, Download, Image as ImageIcon, Cpu } from "lucide-react";
import { AppSettings, ImageGenPreset } from "../types";
import { apiFetchModels } from "../lib/api";

interface ImageGenSettingsAppProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

const ImageGenSettingsApp: React.FC<ImageGenSettingsAppProps> = ({ settings, onUpdateSettings, onClose }) => {
  const [apiUrl, setApiUrl] = useState(settings.imageGenApiUrl || "");
  const [apiKey, setApiKey] = useState(settings.imageGenApiKey || "");
  const [model, setModel] = useState(settings.imageGenModel || "");
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<ImageGenPreset[]>(settings.imageGenPresets || []);
  
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    onUpdateSettings({
      ...settings,
      imageGenApiUrl: apiUrl,
      imageGenApiKey: apiKey,
      imageGenModel: model,
      imageGenPresets: presets
    });
  }, [apiUrl, apiKey, model, presets]);

  const handleFetchModels = async () => {
    if (!apiUrl || !apiKey) {
      alert("请填写 API 地址和 API Key");
      return;
    }
    setIsLoadingModels(true);
    try {
      const res = await apiFetchModels({ apiUrl, apiKey });
      if (res.success && res.models) {
        setFetchedModels(res.models);
        if (!model && res.models[0]) setModel(res.models[0]);
      } else {
        alert("获取模型失败");
      }
    } catch (e) {
      alert("获取模型出错");
    } finally {
      setIsLoadingModels(false);
    }
  };

  const savePreset = () => {
    if (!presetName) return;
    const newPreset: ImageGenPreset = {
      id: Date.now().toString(),
      name: presetName,
      apiUrl,
      apiKey,
      model
    };
    setPresets([...presets, newPreset]);
    setPresetName("");
  };

  const applyPreset = (preset: ImageGenPreset) => {
    setApiUrl(preset.apiUrl);
    setApiKey(preset.apiKey);
    setModel(preset.model);
  };

  const generateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    // Mock generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setImageUrl("https://placehold.co/512x512/png?text=Generated+Image");
    setIsGenerating(false);
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `image_${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 flex items-center gap-3 border-b border-neutral-100">
        <button onClick={onClose}><ChevronLeft /></button>
        <h1 className="font-bold">生图功能设置</h1>
      </div>
      <div className="p-6 space-y-6 overflow-y-auto">
        {/* API Config */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-400">API 配置</label>
          <input className="w-full p-2 border rounded" placeholder="Base URL" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
          <input className="w-full p-2 border rounded" placeholder="API Key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          <div className="flex gap-2">
            <input className="flex-1 p-2 border rounded" placeholder="Model Name" value={model} onChange={e => setModel(e.target.value)} />
            <button onClick={handleFetchModels} className="bg-black text-white p-2 rounded text-xs">{isLoadingModels ? <Loader2 className="animate-spin w-4 h-4" /> : "拉取模型"}</button>
          </div>
          {fetchedModels.length > 0 && (
            <select className="w-full p-2 border rounded" value={model} onChange={e => setModel(e.target.value)}>
              {fetchedModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
        
        {/* Presets */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-neutral-400">预设管理</label>
          <div className="flex gap-2">
            <input className="flex-1 p-2 border rounded" placeholder="预设名称" value={presetName} onChange={e => setPresetName(e.target.value)} />
            <button onClick={savePreset} className="bg-black text-white p-2 rounded text-xs"><Save className="w-4 h-4" /></button>
          </div>
          <select className="w-full p-2 border rounded" onChange={e => {
            const p = presets.find(p => p.id === e.target.value);
            if (p) applyPreset(p);
          }}>
            <option value="">应用预设</option>
            {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Generate */}
        <div className="space-y-3 pt-6 border-t">
          <label className="text-xs font-bold text-neutral-400">生图测试</label>
          <input className="w-full p-2 border rounded" placeholder="正向提示词" value={prompt} onChange={e => setPrompt(e.target.value)} />
          <input className="w-full p-2 border rounded" placeholder="负向提示词 (可选)" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} />
          <button onClick={generateImage} className="w-full bg-black text-white p-2 rounded text-sm">{isGenerating ? "生成中..." : "生成"}</button>
          {imageUrl && (
            <div className="space-y-2">
              <img src={imageUrl} alt="Generated" className="w-full rounded" />
              <button onClick={downloadImage} className="w-full bg-neutral-100 p-2 rounded text-sm flex items-center justify-center gap-2"><Download className="w-4 h-4" />下载图片</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenSettingsApp;

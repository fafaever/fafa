import React from "react";
import { ArrowLeft, BookOpen, MessageSquare, Map, Settings, Zap } from "lucide-react";

interface HelpAppProps {
  onClose: () => void;
}

export default function HelpApp({ onClose }: HelpAppProps) {
  return (
    <div className="w-full h-full bg-[#FAFAFA] flex flex-col  relative overflow-hidden animate-fade-in text-neutral-900">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 pt-12 pb-4 bg-white/80 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-10">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-neutral-600 hover:text-neutral-900 focus:outline-none active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 stroke-[1.5]" />
        </button>
        <span className="text-sm font-bold tracking-widest text-neutral-800">使用帮助</span>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold  tracking-tight text-neutral-900">
            基础教程
          </h1>
          <p className="text-xs text-neutral-500 leading-relaxed">
            欢迎使用极简 AI 终端，只需几步即可开启你的沉浸式交互体验。
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[14px]">👤</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-800">如何创建角色</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                点击主界面的“档案”应用，输入角色的名称、简介与设定提示词，点击保存即可。
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 stroke-[1.5] text-neutral-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-800">如何开始聊天</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                在“档案”中选择你创建的角色点击聊天图标，或者直接点击主界面的“信息”应用。
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="w-4 h-4 stroke-[1.5] text-neutral-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-800">如何切换世界书</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                在“世界书”应用中添加包含触发词的词条，AI 会在聊天中自动识别触发词并提取背景知识。
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[14px]">💭</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-800">如何查看心声</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                聊天时开启心声功能后，聊天记录下方会显示 AI 的内部思考过程与心理活动。
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
              <Settings className="w-4 h-4 stroke-[1.5] text-neutral-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-neutral-800">如何设置 API</h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                进入“设置”应用，填入你的 OpenAI 或兼容的 API Key 与接口地址，测试连接成功即可使用。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

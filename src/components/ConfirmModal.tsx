import React from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl p-5 shadow-xl w-full max-w-xs animate-fade-in border border-neutral-100">
        <h3 className="font-bold text-sm text-neutral-900 mb-2">{title}</h3>
        <p className="text-xs text-neutral-600 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 text-xs font-bold py-2 rounded-lg bg-neutral-100 hover:bg-neutral-200">取消</button>
          <button onClick={onConfirm} className="flex-1 text-xs font-bold py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white">确定</button>
        </div>
      </div>
    </div>
  );
}

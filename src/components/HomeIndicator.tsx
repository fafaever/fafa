import React from "react";

interface HomeIndicatorProps {
  onPressHome: () => void;
  showIndicator?: boolean;
}

export default function HomeIndicator({ onPressHome, showIndicator = true }: HomeIndicatorProps) {
  if (!showIndicator) return <div className="h-4 shrink-0" />;

  return (
    <div 
      className="w-full flex justify-center items-center py-3 select-none cursor-pointer shrink-0"
      onClick={onPressHome}
      title="返回桌面 (Return to Home)"
    >
      <div className="w-28 h-1 bg-neutral-800 rounded-full hover:bg-neutral-500 transition-colors duration-200" />
    </div>
  );
}

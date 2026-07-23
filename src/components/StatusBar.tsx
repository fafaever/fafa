import React, { useState, useEffect } from "react";
import { Wifi, Signal, Battery, Maximize2, Minimize2 } from "lucide-react";

export default function StatusBar() {
  const [time, setTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div 
      id="status_bar"
      className="flex justify-between items-center px-6 py-2.5 text-xs select-none font-sans text-neutral-800 bg-transparent shrink-0 border-b border-neutral-100/20"
    >
      {/* Left side: Time */}
      <span id="status_time" className="font-semibold tracking-tight">{time}</span>
      
      {/* Center: Fullscreen Toggle */}
      <button
        id="fullscreen_toggle_btn"
        onClick={toggleFullscreen}
        className="p-1 rounded-full hover:bg-neutral-200/50 active:scale-90 transition-all text-neutral-700 flex items-center justify-center"
        title={isFullscreen ? "退出全屏" : "切至全屏"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-3.5 h-3.5 stroke-[2]" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5 stroke-[2]" />
        )}
      </button>

      {/* Right side: Phone indicators */}
      <div id="status_indicators" className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-neutral-800">
        <Signal className="w-3.5 h-3.5 stroke-[1.5]" />
        <span className="text-[9px]">5G</span>
        <Wifi className="w-3.5 h-3.5 stroke-[1.5]" />
        <div className="flex items-center gap-0.5">
          <span className="text-[9px]">88%</span>
          <Battery className="w-4 h-4 stroke-[1.5]" />
        </div>
      </div>
    </div>
  );
}


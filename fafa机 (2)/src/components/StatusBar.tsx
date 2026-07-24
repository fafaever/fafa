import React, { useState, useEffect } from "react";
import { Wifi, Signal, Battery, Heart } from "lucide-react";

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
      className="flex justify-between items-center px-6 py-2.5 text-xs select-none bg-[#1A1A1A] shrink-0"
    >
      {/* Left side: Time */}
      <span id="status_time" className="font-serif font-medium tracking-tight text-white">{time}</span>
      
      {/* Center: Fullscreen Toggle */}
      <div className="flex-1 flex justify-center">
        <button
          id="fullscreen_toggle_btn"
          onClick={toggleFullscreen}
          className="p-1 rounded-full hover:bg-white/20 active:scale-90 transition-all text-white flex items-center justify-center"
          title={isFullscreen ? "退出全屏" : "切至全屏"}
        >
          <Heart className="w-4 h-4 stroke-[1.5]" />
        </button>
      </div>

      {/* Right side: Phone indicators */}
      <div id="status_indicators" className="flex items-center gap-1.5 font-serif text-[12px] font-medium text-white">
        <div className="flex items-center gap-1">
          <span>{time ? '88%' : ''}</span>
          <Battery className="w-4 h-4 stroke-[1.5]" />
        </div>
      </div>
    </div>
  );
}


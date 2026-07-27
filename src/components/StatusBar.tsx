import React, { useState, useEffect } from "react";
import { Signal, Battery, Heart } from "lucide-react";

export default function StatusBar({ onOpenFafa }: { onOpenFafa?: () => void }) {
  const [time, setTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateLevel = () => setBatteryLevel(Math.round(battery.level * 100));
        updateLevel();
        battery.addEventListener('levelchange', updateLevel);
        return () => battery.removeEventListener('levelchange', updateLevel);
      });
    }
  }, []);

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
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (isFs) {
        document.documentElement.classList.add("is-fullscreen");
      } else {
        document.documentElement.classList.remove("is-fullscreen");
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    handleFsChange();
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
      className="flex justify-between items-center px-4 py-2 text-xs select-none bg-[#1A1A1A] shrink-0 h-11"
    >
      {/* Left side: Time and black heart icon in the same row */}
      <div id="status_left" className="flex items-center gap-1.5 text-white">
        <span id="status_time" className="font-bold tracking-tight text-sm">{time}</span>
        <button
          id="fullscreen_toggle_btn"
          onClick={toggleFullscreen}
          className="p-1 rounded-full hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center text-white"
          title={isFullscreen ? "退出全屏" : "切至全屏"}
        >
          <Heart className="w-3.5 h-3.5 fill-black text-white stroke-[1.5]" />
        </button>
      </div>
      
      {/* Right side: Signal, Battery */}
      <div id="status_right" className="flex items-center gap-3 text-white">
        <div className="flex items-center gap-2">
          <Signal className="w-3.5 h-3.5 stroke-[2] opacity-80" />
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] opacity-80 font-medium">{batteryLevel !== null ? `${batteryLevel}%` : "--%"}</span>
            <Battery className="w-3.5 h-3.5 stroke-[2] opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from "react";
import { Wifi, Signal, Battery } from "lucide-react";

export default function StatusBar() {
  const [time, setTime] = useState("");

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

  return (
    <div className="flex justify-between items-center px-6 py-2.5 text-xs select-none font-sans text-neutral-800 bg-transparent shrink-0">
      {/* Left side: Time */}
      <span className="font-semibold tracking-tight">{time}</span>
      
      {/* Right side: Phone indicators */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium text-neutral-800">
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

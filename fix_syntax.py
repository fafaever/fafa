with open('src/components/UniverseApp.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = """      const nextExposure = 0;
      if (false) {
      } else {
                    setSelectedCharIds([...selectedCharIds, char.id]);
                  }
                }}
                className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition border ${isSelected ? "border-amber-500 bg-amber-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"}`}
              >
                <CharacterAvatar avatar={char.avatar} name={char.name} size={24} className="rounded-full shadow-xs shrink-0" />
                <span className="text-[11px] font-bold text-white flex-1 truncate">{char.name}</span>
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );"""

good_str = """      const nextExposure = 0;
      let systemStatusMsg = "";
      const favNames = Object.keys(favorChanges);
      if (favNames.length > 0) {
        systemStatusMsg += `💖 好感度变化：\n${favNames.map(name => {
          const cObj = activeChars.find(c => c.name === name);
          const cId = cObj?.id;
          const currentFav = cId ? updatedCharStates[cId]?.favorability : 50;
          const { diff, reason } = favorChanges[name];
          const isCompleted = currentFav >= 100 ? " 🎉【攻略完成】" : "";
          const reasonStr = reason ? `（${reason}）` : "";
          return `  - ${name} 好感度 ${diff > 0 ? "+" : ""}${diff}${reasonStr} (当前好感度: ${currentFav}/100${isCompleted})`;
        }).join("\\n")}\n`;
      }
      let factionProgMap = "";
      if (Object.keys(factionChatUpdates).length > 0) {
        factionProgMap = `📡 阵营频段已更新（${Object.keys(factionChatUpdates).length}条新情报）`;
      }
      
      let finalSysStr = [systemStatusMsg, factionProgMap].filter(Boolean).join("\\n");
      
      let nextActionOptions = actionOptions;
      if (gameEnding) {
         nextActionOptions = [];
         if (gameEnding === "perfect") finalSysStr += "\n\n✨ 【世界结局达成：Perfect Ending】✨\n所有任务均已完美完成。";
         else if (gameEnding === "failed") finalSysStr += "\n\n☠️ 【世界结局：Failed】☠️\n任务失败或暴露度过高，世界线崩溃。";
         else finalSysStr += "\n\n⚠️ 【世界结局：Partial】⚠️\n部分任务完成，世界线已强行收束。";
      }

      if (finalSysStr.trim()) {
        updatedMessages.push({
          id: Date.now().toString() + "_sys",
          role: "system",
          content: finalSysStr.trim(),
          timestamp: Date.now(),
        });
      }

      let updatedWorld: TransmigrationWorld = {
        ...activeWorld,
        messages: updatedMessages,
        characterStates: updatedCharStates,
        tasks: updatedTasks,
        actionOptions: nextActionOptions,
        status: gameEnding ? "completed" : "in_progress",
        exposureLevel: nextExposure,
        factionChats: factionChatUpdates,
        updatedAt: Date.now(),
      };

      setActiveWorld(updatedWorld);
      persistWorlds(worlds.map((w) => (w.id === updatedWorld.id ? updatedWorld : w)));

      setTimeout(() => {
        scrollTransmigrationToBottom(true);
      }, 100);
    } catch (e) {
      console.error(e);
      setMessages([...updatedMessages, { id: Date.now().toString(), role: "system", content: "引擎响应异常，请重试。" }]);
    } finally {
      setIsGenerating(false);
    }
  };"""

content = content.replace(bad_str, good_str)
with open('src/components/UniverseApp.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

import { Memory, ChatSession } from "../types";

export interface PrioritizedMemoryResult {
  simplifiedCoreMemories: Memory[];
  coreMemories: Memory[];
  unsummarizedChatMessages: any[];
  otherMemories: Memory[];
  formattedPromptText: string;
}

/**
 * 按照核心记忆优先级规则获取和格式化记忆库：
 * 1. 当某个时间段的聊天记录已被总结为核心记忆后，优先读取核心记忆（总结后的内容），不再读取该时间段的原始聊天上下文。
 * 2. 如果核心记忆已被简化（合并为日期范围卡片），则读取简化后的卡片内容。
 * 3. 未总结的时间段仍读取原始聊天上下文。
 * 4. 优先级：简化后的核心记忆 > 核心记忆 > 原始聊天上下文。
 */
export function getPrioritizedMemories(
  characterId: string,
  chatSessions?: ChatSession[]
): PrioritizedMemoryResult {
  if (!characterId) {
    return {
      simplifiedCoreMemories: [],
      coreMemories: [],
      unsummarizedChatMessages: [],
      otherMemories: [],
      formattedPromptText: "（暂无角色记忆与对话记录）",
    };
  }

  const savedMemoriesStr = localStorage.getItem(`mobile_ai_memories_${characterId}`);
  let rawMemories: Memory[] = [];
  try {
    if (savedMemoriesStr) {
      rawMemories = JSON.parse(savedMemoriesStr);
    }
  } catch (e) {
    console.error("Error parsing memories for priority rule:", e);
  }

  const simplifiedCoreMemories: Memory[] = [];
  const coreMemories: Memory[] = [];
  const otherMemories: Memory[] = [];

  rawMemories.forEach((m) => {
    if (!m || !m.text) return;
    const isSimplified = Boolean(
      m.isSimplified || (m.source && /^\d{1,2}\.\d{1,2}-\d{1,2}\.\d{1,2}$/.test(m.source.trim()))
    );
    if (isSimplified) {
      simplifiedCoreMemories.push(m);
    } else if (
      m.layer === 1 ||
      m.source === "系统自动提取" ||
      m.source === "手动提取" ||
      m.source === "核心记忆" ||
      m.source === "AI简化提取"
    ) {
      coreMemories.push(m);
    } else {
      otherMemories.push(m);
    }
  });

  // Also inspect vector_memories store
  try {
    const rawVecs = localStorage.getItem("vector_memories");
    if (rawVecs) {
      const vecParsed = JSON.parse(rawVecs);
      if (Array.isArray(vecParsed)) {
        vecParsed.forEach((v: any) => {
          if (v && v.text && (v.characterId === characterId || v.characterId === "all")) {
            const textExists = rawMemories.some((rm) => rm.text === v.text);
            if (!textExists) {
              const isSimp = Boolean(
                v.isSimplified || (v.source && /^\d{1,2}\.\d{1,2}-\d{1,2}\.\d{1,2}$/.test(v.source))
              );
              if (isSimp) {
                simplifiedCoreMemories.push({
                  id: v.id || `vec-${Date.now()}`,
                  characterId,
                  text: v.text,
                  timestamp: v.timestamp || Date.now(),
                  layer: 1,
                  source: v.source || "简化卡片",
                  isSimplified: true,
                });
              } else if (v.source === "核心记忆" || v.source === "系统自动提取") {
                coreMemories.push({
                  id: v.id || `vec-${Date.now()}`,
                  characterId,
                  text: v.text,
                  timestamp: v.timestamp || Date.now(),
                  layer: 1,
                  source: v.source || "核心记忆",
                });
              } else {
                otherMemories.push({
                  id: v.id || `vec-${Date.now()}`,
                  characterId,
                  text: v.text,
                  timestamp: v.timestamp || Date.now(),
                  layer: 2,
                  source: v.source || "向量记忆",
                });
              }
            }
          }
        });
      }
    }
  } catch (e) {}

  // Determine latest summarized timestamp from existing core memories / simplified cards
  let latestSummarizedTime = 0;
  [...simplifiedCoreMemories, ...coreMemories].forEach((cm) => {
    if (cm.timestamp && cm.timestamp > latestSummarizedTime) {
      latestSummarizedTime = cm.timestamp;
    }
  });

  // Retrieve unsummarized chat context from chat session history
  let unsummarizedChatMessages: any[] = [];
  try {
    let sessionsToSearch = chatSessions;
    if (!sessionsToSearch) {
      const storedSessions = localStorage.getItem("mobile_ai_chat_sessions");
      if (storedSessions) {
        sessionsToSearch = JSON.parse(storedSessions);
      }
    }
    const charSession = sessionsToSearch?.find((s) => s.characterId === characterId);
    if (charSession && charSession.messages && charSession.messages.length > 0) {
      if (latestSummarizedTime > 0) {
        unsummarizedChatMessages = charSession.messages.filter(
          (msg: any) =>
            (msg.timestamp || 0) > latestSummarizedTime &&
            msg.content &&
            !msg.content.startsWith("【系统")
        );
      } else {
        unsummarizedChatMessages = charSession.messages.filter(
          (msg: any) => msg.content && !msg.content.startsWith("【系统")
        );
      }
    }
  } catch (e) {
    console.error("Error reading unsummarized chat messages:", e);
  }

  // Format into hierarchical prompt text according to explicit priority:
  // 简化后的核心记忆 > 核心记忆 > 原始聊天上下文
  const promptLines: string[] = [];

  if (simplifiedCoreMemories.length > 0) {
    promptLines.push(`【1. 简化后的核心记忆 (优先级最高 - 日期范围卡片)】:`);
    simplifiedCoreMemories.forEach((m) => {
      promptLines.push(`- [简化卡片 ${m.source || ""}] ${m.text}`);
    });
  }

  if (coreMemories.length > 0) {
    promptLines.push(`【2. 核心记忆 (优先级次高 - 总结后的事件与事实)】:`);
    coreMemories.forEach((m) => {
      promptLines.push(`- [核心记忆 ${m.source || ""}] ${m.text}`);
    });
  }

  if (unsummarizedChatMessages.length > 0) {
    promptLines.push(`【3. 未总结的时间段原始聊天上下文 (基础优先级)】:`);
    const recentMsgs = unsummarizedChatMessages.slice(-10);
    recentMsgs.forEach((msg) => {
      promptLines.push(`- ${msg.role === "user" ? "用户" : "角色"}: ${msg.content}`);
    });
  } else if (simplifiedCoreMemories.length > 0 || coreMemories.length > 0) {
    promptLines.push(`【3. 原始聊天上下文】: （已总结为核心记忆，替代该时间段的原始聊天记录）`);
  } else {
    promptLines.push(`【3. 原始聊天上下文】: （暂无历史聊天记录）`);
  }

  if (otherMemories.length > 0) {
    promptLines.push(`【4. 其他辅助记忆】:`);
    otherMemories.slice(-5).forEach((m) => {
      promptLines.push(`- [${m.source || "记忆"}] ${m.text}`);
    });
  }

  return {
    simplifiedCoreMemories,
    coreMemories,
    unsummarizedChatMessages,
    otherMemories,
    formattedPromptText: promptLines.join("\n"),
  };
}

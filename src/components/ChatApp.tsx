import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Send, Sparkles, Plus, Trash2, Edit, RefreshCw, MessageSquarePlus, MessageSquare, MoreHorizontal, User, CornerDownRight, ScrollText, Check, Menu, X, CornerUpLeft, Quote, Dices, Users, Compass, Heart, Search, AlertCircle, Phone, Video, CreditCard, MapPin, Gift, Gamepad2, Wallet, BookOpen, Image, Calendar, Copy, Settings, Camera, Share2, CheckSquare } from "lucide-react";
import { apiChat, getPhoneContent, getThreeDataSourcesPrompt } from "../lib/api";
import { getDefaultAvatar } from "../lib/avatarUtils";
import { Character, Message, LoreEntry, AppSettings, ChatSession, UserPersona, MomentPost, MomentComment } from "../types";
import ProfileView from "./ProfileView";
import { OfflineMeetView } from "./OfflineMeetView";

import { CharacterAvatar } from "./CharacterAvatar";

interface ChatAppProps {
  characters: Character[];
  loreList: LoreEntry[];
  settings: AppSettings;
  sessions: ChatSession[];
  onAddCharacter: (char: Omit<Character, "id" | "createdAt">) => void;
  onUpdateCharacter: (char: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateSessionMessages: (targetId: string, messages: Message[], currentOS?: string, extraFields?: Partial<ChatSession>) => void;
  onClose: () => void;
  onOpenApp?: (appId: string) => void;
  onActiveCharChange?: (charId: string | null) => void;
  isGeneratingMap?: Record<string, boolean>;
  onTriggerAiReply?: (characterId: string, customMessages?: Message[]) => Promise<void>;
  userPersonas: UserPersona[];
}

const getAgeFromInstruction = (inst: string) => {
  if (!inst) return "不详";
  const match = inst.match(/-\s*年龄:\s*([^\n]+)/);
  return match ? match[1].trim() : "不详";
};

const getPersonalityFromInstruction = (inst: string) => {
  if (!inst) return "无核心背景设定。";
  const match = inst.match(/【基本设定 \/ 人设 \(Personality Profile\)】:([\s\S]*?)【语言口吻与聊天风格/);
  if (match) {
    return match[1].replace(/-\s*姓名:[^\n]*\n?/, "").replace(/-\s*年龄:[^\n]*\n?/, "").trim();
  }
  return inst;
};

const getEmotionIconPath = (emotion: string): string | null => {
  return null;
};

const parseOS = (osStr: string | undefined | null) => {
  if (!osStr || osStr.trim() === "") {
    return {
      text: "（os：...）",
      emotion: "无",
      emoji: "💭",
      icon: null as string | null
    };
  }

  // Find the last bracketed content
  const bracketRegex = /\[([^\]]+)\]$/; // matches [emotion] at the very end of the string
  const match = osStr.match(bracketRegex);
  
  let emotion = "平静";
  let text = osStr;
  
  if (match) {
    emotion = match[1].trim();
    // Remove the trailing bracketed emotion tag from the text
    text = osStr.substring(0, match.index).trim();
  } else {
    // Fallback: search for any [emotion] in the string if not strictly at the end
    const generalBracketRegex = /\[([^\]]+)\]/g;
    const allMatches = [...osStr.matchAll(generalBracketRegex)];
    if (allMatches.length > 0) {
      const lastMatch = allMatches[allMatches.length - 1];
      emotion = lastMatch[1].trim();
      text = osStr.replace(generalBracketRegex, "").trim();
    }
  }

  // Map emotion to emoji
  let emoji = "✨";
  const em = emotion.toLowerCase();
  if (em.includes("喜") || em.includes("乐") || em.includes("欢") || em.includes("开") || em.includes("甜")) emoji = "😊";
  else if (em.includes("悲") || em.includes("哀") || em.includes("哭") || em.includes("难") || em.includes("伤")) emoji = "😢";
  else if (em.includes("怒") || em.includes("生") || em.includes("气") || em.includes("烦") || em.includes("躁") || em.includes("狂")) emoji = "💢";
  else if (em.includes("惊") || em.includes("震") || em.includes("呆") || em.includes("傻")) emoji = "😮";
  else if (em.includes("羞") || em.includes("傲") || em.includes("娇") || em.includes("红") || em.includes("扭") || em.includes("涩")) emoji = "😳";
  else if (em.includes("汗") || em.includes("无") || em.includes("尴尬") || em.includes("哑口")) emoji = "😅";
  else if (em.includes("疲") || em.includes("困") || em.includes("累") || em.includes("倦") || em.includes("叹")) emoji = "🥱";
  else if (em.includes("爱") || em.includes("恋") || em.includes("心") || em.includes("宠") || em.includes("感")) emoji = "🥰";
  else if (em.includes("坏") || em.includes("狡") || em.includes("得") || em.includes("戏") || em.includes("恶") || em.includes("邪")) emoji = "😏";
  else if (em.includes("思") || em.includes("虑") || em.includes("疑") || em.includes("奇") || em.includes("纳") || em.includes("探")) emoji = "🤔";
  else if (em.includes("怕") || em.includes("控") || em.includes("恐") || em.includes("惧") || em.includes("抖")) emoji = "😨";
  else if (em.includes("冷") || em.includes("漠") || em.includes("平") || em.includes("淡") || em.includes("静")) emoji = "😐";
  else if (em.includes("好") || em.includes("善") || em.includes("乖")) emoji = "😇";

  return {
    text: text,
    emotion: emotion,
    emoji: emoji,
    icon: getEmotionIconPath(emotion)
  };
};

export default function ChatApp({
  characters,
  loreList,
  settings,
  sessions,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onUpdateSessionMessages,
  onClose,
  onOpenApp,
  onActiveCharChange,
  isGeneratingMap,
  onTriggerAiReply,
  userPersonas: userPersonasProp,
}: ChatAppProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "library">("library");
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // Multi-select message states
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);

  // Fullscreen & visualViewport keyboard adaptation
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement || document.documentElement.classList.contains("is-fullscreen"));
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement || document.documentElement.classList.contains("is-fullscreen");
      setIsFullscreen(isFs);
      if (!isFs) {
        setKeyboardHeight(0);
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    
    const observer = new MutationObserver(() => {
      const isFs = document.documentElement.classList.contains("is-fullscreen") || !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) setKeyboardHeight(0);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!window.visualViewport) return;
      const isFs = document.documentElement.classList.contains("is-fullscreen") || !!document.fullscreenElement;
      if (!isFs) {
        // 非全屏模式下，键盘弹出时不改变输入框位置
        setKeyboardHeight(0);
        return;
      }
      // 全屏模式下，使用 window.visualViewport 获取键盘高度
      const diff = window.innerHeight - window.visualViewport.height;
      if (diff > 100) {
        setKeyboardHeight(diff);
      } else {
        setKeyboardHeight(0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
      handleResize();
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, [isFullscreen]);

  const inputAreaStyle = isFullscreen && keyboardHeight > 0 ? {
    position: "absolute" as const,
    bottom: `${keyboardHeight + 4}px`,
    left: 0,
    right: 0,
    zIndex: 30,
  } : {
    position: "relative" as const,
    bottom: "0px"
  };

  // -------------------- BOTTOM TAB STATES --------------------
  const [mainTab, setMainTab] = useState<"chat" | "contacts" | "moments" | "me">("chat");

  // User Profile details
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem("mobile_ai_user_name_v1") || "我";
  });
  const [userNameInput, setUserNameInput] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem("mobile_ai_user_avatar_v1") || "";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contacts searching
  const [searchQuery, setSearchQuery] = useState("");

  // Unread status mapping
  const [unreads, setUnreads] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("mobile_ai_unreads_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return { "char-preset-fafa": true };
  });

  const clearUnread = (charId: string) => {
    const next = { ...unreads, [charId]: false };
    setUnreads(next);
    localStorage.setItem("mobile_ai_unreads_v1", JSON.stringify(next));
  };

  // Moments feed state & publish modal state
  const [moments, setMoments] = useState<MomentPost[]>([]);
  const [isPublishMomentOpen, setIsPublishMomentOpen] = useState(false);
  const [newMomentContent, setNewMomentContent] = useState("");
  const [newMomentImage, setNewMomentImage] = useState<string | null>(null);
  const [newMomentVisibility, setNewMomentVisibility] = useState<"all" | "visible_some" | "invisible_some">("all");
  const [selectedCharIdsForVisibility, setSelectedCharIdsForVisibility] = useState<string[]>([]);
  const [isCharPickerOpen, setIsCharPickerOpen] = useState(false);

  // Comment & AI Generation state
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [activeReplyToName, setActiveReplyToName] = useState<string | null>(null);
  const [commentInputText, setCommentInputText] = useState("");
  const [isGeneratingComments, setIsGeneratingComments] = useState<{ [postId: string]: boolean }>({});
  const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
  const momentFileInputRef = useRef<HTMLInputElement>(null);

  // Share Moment Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetPost, setShareTargetPost] = useState<MomentPost | null>(null);

  // Delete Moment Post states & logic
  const [deleteMenuPost, setDeleteMenuPost] = useState<MomentPost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const momentLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartTouchPost = (post: MomentPost) => {
    if (momentLongPressTimerRef.current) clearTimeout(momentLongPressTimerRef.current);
    momentLongPressTimerRef.current = setTimeout(() => {
      setDeleteMenuPost(post);
    }, 500);
  };

  const handleEndTouchPost = () => {
    if (momentLongPressTimerRef.current) {
      clearTimeout(momentLongPressTimerRef.current);
      momentLongPressTimerRef.current = null;
    }
  };

  const handleExecuteDeleteMomentPost = (postId: string) => {
    const targetPost = moments.find(m => m.id === postId);
    if (!targetPost) {
      setDeleteMenuPost(null);
      setShowDeleteConfirm(false);
      return;
    }

    // 1. Remove post from moments feed
    const updatedMoments = moments.filter(m => m.id !== postId);
    setMoments(updatedMoments);
    localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(updatedMoments));

    // 2. Remove character memory records in localStorage (char_settings_v1_*)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("char_settings_v1_")) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed.memories)) {
                parsed.memories = parsed.memories.filter((mem: string) => {
                  if (typeof mem !== "string") return true;
                  const includesId = mem.includes(postId);
                  const includesContent = targetPost.content && targetPost.content.length > 2 && mem.includes(targetPost.content.substring(0, 15));
                  const includesAuthorAndMoment = mem.includes("朋友圈") && mem.includes(targetPost.authorName);
                  return !(includesId || includesContent || includesAuthorAndMoment);
                });
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch (e) {
              console.error("Failed to clean character memory key:", key, e);
            }
          }
        }
      }
    } catch (e) {
      console.error("Error clearing character memories for moment:", e);
    }

    // 3. Remove shared moment messages in chat sessions
    try {
      sessions.forEach((s) => {
        let changed = false;
        const updatedMsgs = (s.messages || []).filter((m) => {
          if (m.type === "moment" && m.momentData?.id === postId) {
            changed = true;
            return false;
          }
          if (m.content && (m.content.includes(postId) || (targetPost.content && targetPost.content.length > 3 && m.content.includes(targetPost.content)))) {
            if (m.content.includes("[MOMENT_SHARE]") || m.content.includes("[用户向你分享了一条朋友圈动态]")) {
              changed = true;
              return false;
            }
          }
          return true;
        });

        if (changed) {
          onUpdateSessionMessages(s.id, updatedMsgs);
        }
      });
    } catch (e) {
      console.error("Error clearing shared moment messages in chat sessions:", e);
    }

    setDeleteMenuPost(null);
    setShowDeleteConfirm(false);
    setCopyToast("已彻底删除动态及关联的角色记忆");
    setTimeout(() => setCopyToast(null), 2000);
  };
  
  // Custom Character Creation Form
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [charName, setCharName] = useState("");
  const [charAvatar, setCharAvatar] = useState("🤖");
  const [charDesc, setCharDesc] = useState("");
  const [charSys, setCharSys] = useState("");
  const [charError, setCharError] = useState("");
  const [charUserPersonaId, setCharUserPersonaId] = useState("");
  const [userPersonas, setUserPersonas] = useState<UserPersona[]>(() => {
    if (userPersonasProp && userPersonasProp.length > 0) return userPersonasProp;
    try {
      const stored = localStorage.getItem("user_personas_v1");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showUserPersonas, setShowUserPersonas] = useState(false);
  const [editingPersona, setEditingPersona] = useState<UserPersona | null>(null);
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [personaName, setPersonaName] = useState("");
  const [personaAvatar, setPersonaAvatar] = useState("");
  const [personaDesc, setPersonaDesc] = useState("");
  const [personaError, setPersonaError] = useState("");

  // Group chat states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupAvatarInput, setGroupAvatarInput] = useState("💬");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState("");
  const [showGroupPlusMenu, setShowGroupPlusMenu] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);

  const getCharacterGroupRoleType = (char: Character) => {
    const text = `${char.systemInstruction || ""} ${char.description || ""}`.toLowerCase();
    if (
      text.includes("活泼") || text.includes("话痨") || text.includes("话多") || 
      text.includes("唠叨") || text.includes("外向") || text.includes("热情") ||
      text.includes("lively") || text.includes("talkative") || text.includes("chattery") ||
      text.includes("energetic")
    ) {
      return "talkative";
    }
    if (
      text.includes("高冷") || text.includes("冷漠") || text.includes("高傲") || 
      text.includes("沉默") || text.includes("话少") || text.includes("安静") ||
      text.includes("silent") || text.includes("cold") || text.includes("aloof") ||
      text.includes("quiet") || text.includes("reserved")
    ) {
      return "silent";
    }
    if (
      text.includes("温柔") || text.includes("体贴") || text.includes("善良") || 
      text.includes("倾听") || text.includes("和蔼") || text.includes("gentle") ||
      text.includes("kind") || text.includes("listener") || text.includes("soft")
    ) {
      return "gentle";
    }
    return "default";
  };

  const handleSendGroupMessageOnly = () => {
    if (!inputText.trim() || isGenerating || !activeSession || !activeSession.isGroup) return;
    const userMsgText = inputText.trim();
    setInputText("");

    let updatedMessages = [...(activeSession.messages || [])];
    if (editingMessageId) {
      updatedMessages = updatedMessages.map((m) =>
        m.id === editingMessageId ? { ...m, content: userMsgText, timestamp: Date.now() } : m
      );
      setEditingMessageId(null);
    } else {
      const newUserMsg: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: userMsgText,
        timestamp: Date.now(),
        quotedMsg: quotedMsgState || undefined,
      };
      setQuotedMsgState(null);
      updatedMessages.push(newUserMsg);

      if (pendingResendRecallId) {
        updatedMessages = updatedMessages.filter((m) => m.id !== pendingResendRecallId);
        setPendingResendRecallId(null);
      }
    }

    onUpdateSessionMessages(activeSession.id, updatedMessages, undefined, {
      groupName: activeSession.groupName,
      groupAvatar: activeSession.groupAvatar,
      memberIds: activeSession.memberIds,
      syncMemory: activeSession.syncMemory,
      worldSetting: activeSession.worldSetting,
      isGroup: true,
    });

    setTimeout(scrollToBottom, 100);
  };

  const handleSendGroupMessage = () => {
    if (!inputText.trim() || isGenerating || !activeSession || !activeSession.isGroup) return;
    const userMsgText = inputText.trim();
    setInputText("");

    let updatedMessages = [...(activeSession.messages || [])];
    const isEditing = !!editingMessageId;

    if (isEditing) {
      updatedMessages = updatedMessages.map((m) =>
        m.id === editingMessageId ? { ...m, content: userMsgText, timestamp: Date.now() } : m
      );
      setEditingMessageId(null);
    } else {
      const newUserMsg: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: userMsgText,
        timestamp: Date.now(),
        quotedMsg: quotedMsgState || undefined,
      };
      setQuotedMsgState(null);
      updatedMessages.push(newUserMsg);

      if (pendingResendRecallId) {
        updatedMessages = updatedMessages.filter((m) => m.id !== pendingResendRecallId);
        setPendingResendRecallId(null);
      }
    }

    onUpdateSessionMessages(activeSession.id, updatedMessages, undefined, {
      groupName: activeSession.groupName,
      groupAvatar: activeSession.groupAvatar,
      memberIds: activeSession.memberIds,
      syncMemory: activeSession.syncMemory,
      worldSetting: activeSession.worldSetting,
      isGroup: true,
    });

    setTimeout(scrollToBottom, 100);

    // Automatically trigger AI replies after a short delay (only if not editing)
    if (!isEditing) {
      setTimeout(() => {
        handleTriggerGroupAiReply(updatedMessages);
      }, 600);
    }
  };

  const handleSendGroupVoiceMessage = () => {
    setShowGroupPlusMenu(false);
    if (!activeSession || !activeSession.isGroup) return;
    const duration = Math.floor(Math.random() * 8) + 3; // 3 to 10 seconds
    const content = `🎙️ [语音消息] ${duration}"`;
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    onUpdateSessionMessages(activeSession.id, [...activeSession.messages, userMsg], undefined, {
      groupName: activeSession.groupName,
      groupAvatar: activeSession.groupAvatar,
      memberIds: activeSession.memberIds,
      syncMemory: activeSession.syncMemory,
      worldSetting: activeSession.worldSetting,
      isGroup: true,
    });
    setTimeout(scrollToBottom, 100);
  };

  const handleTriggerGroupAiReply = async (customMessages?: Message[]) => {
    if (isGenerating || !activeSession || !activeSession.isGroup) return;
    setApiError(null);
    setIsGenerating(true);

    try {
      const memberIds = activeSession.memberIds || [];
      if (memberIds.length === 0) {
        setIsGenerating(false);
        return;
      }

      // Determine who speaks in this round of chat
      const speakers: string[] = [];
      memberIds.forEach(mId => {
        const char = characters.find(c => c.id === mId);
        if (!char) return;
        const charType = getCharacterGroupRoleType(char);
        
        if (charType === "talkative") {
          speakers.push(mId);
          if (Math.random() < 0.5) {
            speakers.push(mId);
          }
        } else if (charType === "silent") {
          if (Math.random() < 0.4) {
            speakers.push(mId);
          }
        } else if (charType === "gentle") {
          if (Math.random() < 0.7) {
            speakers.push(mId);
          }
        } else {
          if (Math.random() < 0.8) {
            speakers.push(mId);
          }
        }
      });

      if (speakers.length === 0) {
        const fallbackId = memberIds[Math.floor(Math.random() * memberIds.length)];
        speakers.push(fallbackId);
      }

      let shuffledSpeakers = [...speakers].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffledSpeakers.length - 1; i++) {
        if (shuffledSpeakers[i] === shuffledSpeakers[i + 1]) {
          for (let j = i + 2; j < shuffledSpeakers.length; j++) {
            if (shuffledSpeakers[j] !== shuffledSpeakers[i]) {
              const temp = shuffledSpeakers[i + 1];
              shuffledSpeakers[i + 1] = shuffledSpeakers[j];
              shuffledSpeakers[j] = temp;
              break;
            }
          }
        }
      }

      const minReplies = settings?.groupChatMinReplies || 1;
      const maxRepliesLimit = settings?.groupChatMaxReplies || 6;
      // Randomly decide how many replies for this round, capped by available speakers
      const targetRepliesCount = Math.floor(Math.random() * (Math.max(1, maxRepliesLimit - minReplies + 1))) + minReplies;
      const finalSpeakers = shuffledSpeakers.slice(0, targetRepliesCount);

      let currentMessages = customMessages || [...activeSession.messages];

      for (let i = 0; i < finalSpeakers.length; i++) {
        const respondingCharId = finalSpeakers[i];
        const respondingChar = characters.find(c => c.id === respondingCharId);
        if (!respondingChar) continue;

        if (!respondingChar.systemInstruction || !respondingChar.description) {
           alert("角色 " + respondingChar.name + " 人设信息缺失，请检查角色设定");
           continue;
        }

        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const savedSettings = localStorage.getItem(`char_settings_v1_${respondingCharId}`);
        let memories: string[] = ["初始记忆：对用户很友好。"];
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            memories = parsed.memories || [];
          } catch (e) {}
        }

        let systemInstruction = `你正在参与群聊「${activeSession.groupName}」。同群成员有：${characters.filter(c => memberIds.includes(c.id)).map(c => c.name).join('、')}。`;
        systemInstruction += getPhoneContent(respondingCharId);
        
        if (activeSession.worldSetting && activeSession.worldSetting.trim()) {
          systemInstruction += `\n\n【当前群聊的世界设定/叙事背景】：\n${activeSession.worldSetting.trim()}\n\n【注意】：此世界设定只作为你当前在群聊中的身份定位、叙事背景 and 对话氛围，绝对不能改变或覆盖你原本的性格特征、说话风格和人设偏好。请保持你原本人设的同时，自然地融入并符合这一背景设定与氛围，在发言和互动时予以符合。`;
        }
        
        systemInstruction += `\n\n请保持你的人设，自然地在群聊中回复用户或其他成员。`;

        systemInstruction += `\n\n【群聊发言及互动规则】：
- 在此群聊中，其他角色也会随机、轮流发言，发表他们自己的观点和回复。
- 请仔细阅读上下文中的消息历史，注意其他角色的名字（消息格式为 "[角色名]: 消息内容" ），你可以积极、自然地对其他群成员的发言进行吐槽、赞同、调侃、反驳、插嘴，也可以选择回答用户的问题。
- 请务必与其他角色产生互动，形成自然流畅 of 群聊闲聊/交谈氛围，而不是只和用户对话。
- 回复内容必须简短自然，像在真实的群聊中打字发言一样，不要包含任何系统提示或元注解。`;

        const charType = getCharacterGroupRoleType(respondingChar);
        if (charType === "talkative") {
          systemInstruction += `\n你当前在群聊中是活泼/话痨人设，可以多说一些或多互动，语气可以更热情活泼，展现你的特定发言习惯（如喜欢插话等）。`;
        } else if (charType === "silent") {
          systemInstruction += `\n你当前在群聊中是高冷/沉默人设，发言次数较少，请进行非常简短的回应。`;
        } else if (charType === "gentle") {
          systemInstruction += `\n你当前在群聊中是温柔/倾听人设，发言频率适中，不会抢话，展现体贴入微的倾听感。`;
        }

        const cleanCharacter = {
          id: respondingChar.id,
          name: respondingChar.name,
          avatar: respondingChar.avatar,
          description: respondingChar.description || "一个充满魅力的角色",
          systemInstruction: systemInstruction,
          model: respondingChar.model || settings?.model || "gemini-3.6-flash",
        };

        const requestParams = {
          messages: currentMessages,
          character: cleanCharacter,
          settings: {
            ...settings,
            model: respondingChar.model || settings?.model || "gemini-3.6-flash",
          },
          chatMode: "online",
          replyLength: charType === "silent" ? "short" : "medium",
          replyCount: 1,
          mood: "平静",
          memories: memories,
          isGroup: true,
          // Mandatory data sources injection
          systemInstruction: systemInstruction + "\n\n" + getThreeDataSourcesPrompt(respondingChar, memories, [])
        };

        const data = await apiChat(requestParams);
        const replyText = data.text || "嗯嗯！";

        const newBotMsg: Message = {
          id: `msg-${Date.now()}-bot-${respondingCharId}-${i}`,
          role: "assistant",
          content: replyText,
          timestamp: Date.now(),
          os: data.os || undefined,
          senderId: respondingChar.id,
          senderName: respondingChar.name,
          senderAvatar: respondingChar.chatAvatar || respondingChar.avatar,
        };

        currentMessages = [...currentMessages, newBotMsg];
        onUpdateSessionMessages(activeSession.id, currentMessages, undefined, {
          groupName: activeSession.groupName,
          groupAvatar: activeSession.groupAvatar,
          memberIds: activeSession.memberIds,
          syncMemory: activeSession.syncMemory,
          worldSetting: activeSession.worldSetting,
          isGroup: true,
        });

        setTimeout(scrollToBottom, 100);

        if (activeSession.syncMemory !== false) {
          memberIds.forEach(mId => {
            try {
              const key = `char_settings_v1_${mId}`;
              const mSaved = localStorage.getItem(key);
              let mData = mSaved ? JSON.parse(mSaved) : {};
              let mMemories = mData.memories || [];
              const fact = `[群聊「${activeSession.groupName}」] ${respondingChar.name} 回复了用户：「${replyText.substring(0, 30)}」`;
              if (!mMemories.includes(fact)) {
                mData.memories = [...mMemories, fact];
                localStorage.setItem(key, JSON.stringify(mData));
              }
            } catch (e) {}
          });
        }
      }
    } catch (err: any) {
      console.error("Group chat AI reply error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Messaging thread states
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"online" | "offline">("online");

  useEffect(() => {
    // Force 100dvh for mobile browser height consistency
    document.documentElement.style.height = '100dvh';
  }, []);

  // New features states
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [showOfflineMeet, setShowOfflineMeet] = useState(false);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [quotedMsgState, setQuotedMsgState] = useState<Message | null>(null);
  const [pendingResendRecallId, setPendingResendRecallId] = useState<string | null>(null);
  const [showAllOsModal, setShowAllOsModal] = useState(false);
  const [msgOsModalTarget, setMsgOsModalTarget] = useState<Message | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fallbackCopyText = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      console.error("Copy failed", e);
    }
    document.body.removeChild(textarea);
  };

  const handleCopyContent = (content: string) => {
    if (!content) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).catch(() => {
        fallbackCopyText(content);
      });
    } else {
      fallbackCopyText(content);
    }
    setCopyToast("已复制");
    setShowBottomSheet(false);
    setTimeout(() => {
      setCopyToast(null);
    }, 1500);
  };

  // Extract all OS entries in chronological order (from old to new)
  const getSessionOsHistory = () => {
    if (!activeSession || !activeSession.messages) return [];
    const items: { id: string; msg: Message; os: string; timestamp: number }[] = [];

    activeSession.messages.forEach((m) => {
      if (m.os && m.os.trim()) {
        items.push({
          id: `os-${m.id}`,
          msg: m,
          os: m.os,
          timestamp: m.timestamp,
        });
      }
    });

    // Fallback: If no message has m.os saved, but activeSession.currentOS exists,
    // attach currentOS to the last assistant message (or last message)
    if (items.length === 0 && activeSession.currentOS && activeSession.currentOS.trim()) {
      const lastAssistantMsg = [...activeSession.messages].reverse().find((m) => m.role === "assistant") || activeSession.messages[activeSession.messages.length - 1];
      if (lastAssistantMsg) {
        items.push({
          id: `os-current-${lastAssistantMsg.id}`,
          msg: lastAssistantMsg,
          os: activeSession.currentOS,
          timestamp: lastAssistantMsg.timestamp,
        });
      }
    }

    // Ensure chronological order (from old to new)
    items.sort((a, b) => a.timestamp - b.timestamp);
    return items;
  };

  // Character specific settings (dynamic)
  const [replyLength, setReplyLength] = useState<"short" | "medium" | "detailed">("short");
  const [minReplies, setMinReplies] = useState<number>(1);
  const [maxReplies, setMaxReplies] = useState<number>(6);
  const [minRepliesInput, setMinRepliesInput] = useState<string>("1");
  const [maxRepliesInput, setMaxRepliesInput] = useState<string>("6");

  useEffect(() => {
    setMinRepliesInput(minReplies.toString());
  }, [minReplies]);

  useEffect(() => {
    setMaxRepliesInput(maxReplies.toString());
  }, [maxReplies]);
  const [activeMessaging, setActiveMessaging] = useState<boolean>(false);
  const [activeMessagingDelay, setActiveMessagingDelay] = useState<number>(1);
  const [timePerception, setTimePerception] = useState<boolean>(false);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [memories, setMemories] = useState<string[]>([]);
  const [newMemoryInput, setNewMemoryInput] = useState<string>("");
  const [chatWallpapers, setChatWallpapers] = useState<string[]>([]);
  const [currentChatWallpaper, setCurrentChatWallpaper] = useState<string | null>(null);

  const compressImage = (file: File, maxSizeKB: number = 300): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.85;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          const tryCompress = () => {
            if (dataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
              quality -= 0.1;
              dataUrl = canvas.toDataURL('image/jpeg', quality);
              tryCompress();
            } else {
              resolve(dataUrl);
            }
          };
          tryCompress();
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Mood State (randomized per visit)
  const [mood, setMood] = useState<"开心" | "平静" | "疲惫" | "烦躁">("平静");

  // Synchronize active character with parent
  useEffect(() => {
    if (onActiveCharChange) {
      onActiveCharChange(activeCharId);
    }
  }, [activeCharId, onActiveCharChange]);

  // Synchronize isGenerating with parent background generation status
  const propGenerating = isGeneratingMap?.[activeCharId || ""] || false;
  useEffect(() => {
    if (propGenerating !== isGenerating) {
      setIsGenerating(propGenerating);
    }
  }, [propGenerating, isGenerating]);

  // Sub-account creation state
  const [subAccountParentId, setSubAccountParentId] = useState<string | null>(null);
  const [subAccountName, setSubAccountName] = useState("");
  const [subAccountAvatar, setSubAccountAvatar] = useState("🤖");
  const [subAccountPurpose, setSubAccountPurpose] = useState("");
  const [subAccountError, setSubAccountError] = useState("");

  useEffect(() => {
    if (subAccountParentId) {
      const parent = characters.find(c => c.id === subAccountParentId);
      if (parent) {
        setSubAccountName(`${parent.name} 小号`);
        setSubAccountAvatar(parent.chatAvatar || parent.avatar || "🤖");
        setSubAccountPurpose("");
        setSubAccountError("");
      }
    }
  }, [subAccountParentId, characters]);

  // Action panel & features states
  const [showActionPanel, setShowActionPanel] = useState(false);
  const [activeCall, setActiveCall] = useState<null | "voice" | "video">(null);
  const [activeModal, setActiveModal] = useState<null | "transfer" | "location" | "redpacket" | "games">(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [locationName, setLocationName] = useState("");
  const [redpacketAmount, setRedpacketAmount] = useState("");
  const [redpacketBlessing, setRedpacketBlessing] = useState("恭喜发财，大吉大利");

  // Wallet states
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem("mobile_ai_wallet_balance_v1");
    return saved !== null ? Number(saved) : 0.00;
  });
  const [walletTransactions, setWalletTransactions] = useState<Array<{
    id: string;
    type: "income" | "expense";
    amount: number;
    name: string;
    timestamp: number;
    note?: string;
  }>>(() => {
    const saved = localStorage.getItem("mobile_ai_wallet_transactions_v1");
    return saved ? JSON.parse(saved) : [];
  });
  const [showWallet, setShowWallet] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmountInput, setTopUpAmountInput] = useState("");
  const [topUpNoteInput, setTopUpNoteInput] = useState("");

  // Top-up wallet logic
  const handleTopUp = () => {
    const amtNum = Number(topUpAmountInput);
    if (!topUpAmountInput || isNaN(amtNum) || amtNum <= 0) return;
    const newBalance = walletBalance + amtNum;
    setWalletBalance(newBalance);
    localStorage.setItem("mobile_ai_wallet_balance_v1", newBalance.toString());

    const note = topUpNoteInput.trim() || "充值";
    const newTx = {
      id: `tx-${Date.now()}`,
      type: "income" as const,
      amount: amtNum,
      name: "充值",
      timestamp: Date.now(),
      note
    };
    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    localStorage.setItem("mobile_ai_wallet_transactions_v1", JSON.stringify(updatedTxs));

    setShowTopUpModal(false);
    setTopUpAmountInput("");
    setTopUpNoteInput("");
  };

  // Helper to trigger specific AI actions like photo or invitation
  const handleTriggerAiAction = async (type: "photo" | "invitation") => {
    if (isGenerating || !activeCharId || !activeSession) return;
    
    const userPrompt = type === "photo" ? "（你给我发张照片吧）" : "（我想约你出来见个面）";
    const systemPrompt = type === "photo" 
      ? "【系统提示：请立刻给用户分享一张符合当前场景和人设的照片，使用 [图片：描述内容] 格式，语气要契合人设。】" 
      : "【系统提示：请立刻向用户发起线下见面邀请，使用 [OFFLINE_INVITATION]邀请话语|pending 格式，邀请话语要由你亲口说出，极其契合人设。】";

    const newUserMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: userPrompt,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeSession.messages, newUserMsg];
    onUpdateSessionMessages(activeCharId, updatedMessages);

    // Now trigger AI with hidden instruction
    const hiddenPromptMsg: Message = {
      id: `msg-${Date.now()}-system`,
      role: "user",
      content: systemPrompt,
      timestamp: Date.now() + 1,
    };

    handleTriggerAiReply([...updatedMessages, hiddenPromptMsg]);
  };

  const handleConfirmTransfer = () => {
    if (!transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) return;
    const amtNum = Number(transferAmount);
    const amt = amtNum.toFixed(2);
    const note = transferNote.trim() || "转账";
    const content = `[TRANSFER]${amt}|${note}`;

    const record = { id: `transfer-${Date.now()}`, timestamp: Date.now(), amount: amt, note, characterId: activeCharId, characterName: activeChar?.name };
    const saved = localStorage.getItem("mobile_ai_transfers_v1");
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem("mobile_ai_transfers_v1", JSON.stringify([record, ...list]));

    // Update wallet balance and transactions
    const newBalance = walletBalance - amtNum;
    setWalletBalance(newBalance);
    localStorage.setItem("mobile_ai_wallet_balance_v1", newBalance.toString());

    const newTx = {
      id: `tx-${Date.now()}`,
      type: "expense" as const,
      amount: amtNum,
      name: activeChar?.name || "对方",
      timestamp: Date.now(),
      note
    };
    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    localStorage.setItem("mobile_ai_wallet_transactions_v1", JSON.stringify(updatedTxs));

    const newMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now()
    };
    if (activeSession && activeCharId) {
      onUpdateSessionMessages(activeCharId, [...activeSession.messages, newMsg]);
    }
    setActiveModal(null);
    setTransferAmount("");
    setTransferNote("");
  };

  const handleCollectCharacterTransfer = (msgId: string, amountStr: string, note: string, transferId: string) => {
    if (!activeSession || !activeCharId) return;
    const amountNum = Number(amountStr);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId && (m.type === "transfer" || m.content.startsWith("[CHARACTER_TRANSFER]"))) {
        const parts = m.content.replace("[CHARACTER_TRANSFER]", "").split("|");
        return {
          ...m,
          content: m.content.startsWith("[CHARACTER_TRANSFER]")
            ? `[CHARACTER_TRANSFER]${parts[0]}|${parts[1]}|collected|${parts[3] || ""}`
            : m.content,
          transferData: m.transferData ? { ...m.transferData, status: "collected" as const } : undefined
        };
      }
      return m;
    });
    onUpdateSessionMessages(activeCharId, updatedMessages);

    const newBalance = walletBalance + amountNum;
    setWalletBalance(newBalance);
    localStorage.setItem("mobile_ai_wallet_balance_v1", newBalance.toString());

    const newTx = {
      id: `tx-${Date.now()}`,
      type: "income" as const,
      amount: amountNum,
      name: activeChar?.name || "对方",
      timestamp: Date.now(),
      note: note ? `转账附言: ${note}` : "转账收入"
    };
    const updatedTxs = [newTx, ...walletTransactions];
    setWalletTransactions(updatedTxs);
    localStorage.setItem("mobile_ai_wallet_transactions_v1", JSON.stringify(updatedTxs));

    const record = {
      id: transferId || `transfer-${Date.now()}`,
      characterId: activeCharId,
      characterName: activeChar?.name || "对方",
      amount: amountNum,
      note,
      timestamp: Date.now(),
      status: "collected"
    };
    const savedTransfers = localStorage.getItem("mobile_ai_character_transfers_v1");
    const transfersList = savedTransfers ? JSON.parse(savedTransfers) : [];
    localStorage.setItem("mobile_ai_character_transfers_v1", JSON.stringify([record, ...transfersList]));
  };

  const handleReturnCharacterTransfer = (msgId: string, transferId: string) => {
    if (!activeSession || !activeCharId) return;

    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId && (m.type === "transfer" || m.content.startsWith("[CHARACTER_TRANSFER]"))) {
        const parts = m.content.replace("[CHARACTER_TRANSFER]", "").split("|");
        return {
          ...m,
          content: m.content.startsWith("[CHARACTER_TRANSFER]")
            ? `[CHARACTER_TRANSFER]${parts[0]}|${parts[1]}|returned|${parts[3] || ""}`
            : m.content,
          transferData: m.transferData ? { ...m.transferData, status: "returned" as const } : undefined
        };
      }
      return m;
    });
    onUpdateSessionMessages(activeCharId, updatedMessages);

    const disappointedMsg: Message = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "哼，居然把我的钱退回来了……好心当成驴肝肺！",
      timestamp: Date.now(),
    };
    onUpdateSessionMessages(activeCharId, [...updatedMessages, disappointedMsg]);
  };

  // Accept offline meeting invitation
  const handleAcceptOfflineInvitation = (msgId: string) => {
    if (!activeSession || !activeCharId) return;
    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId) {
        const parts = m.content.replace("[OFFLINE_INVITATION]", "").split("|");
        const note = parts[0] || "邀请你线下见面";
        return {
          ...m,
          content: `[OFFLINE_INVITATION]${note}|accepted`,
        };
      }
      return m;
    });
    onUpdateSessionMessages(activeCharId, updatedMessages);
    setShowOfflineMeet(true);
  };

  // Decline offline meeting invitation
  const handleDeclineOfflineInvitation = (msgId: string) => {
    if (!activeSession || !activeCharId) return;
    const updatedMessages = activeSession.messages.map((m) => {
      if (m.id === msgId) {
        const parts = m.content.replace("[OFFLINE_INVITATION]", "").split("|");
        const note = parts[0] || "邀请你线下见面";
        return {
          ...m,
          content: `[OFFLINE_INVITATION]${note}|declined`,
        };
      }
      return m;
    });

    const politeReplies = [
      "好吧，那下次有空再约。",
      "嗯嗯明白，那你先忙！下次见啦。",
      "没关系，那改天有合适的时间我们再约。",
      "好的，没问题！下次随时喊我。",
    ];
    const replyText = politeReplies[Math.floor(Math.random() * politeReplies.length)];

    const aiMsg: Message = {
      id: `ai-decline-reply-${Date.now()}`,
      role: "assistant",
      content: replyText,
      timestamp: Date.now(),
    };

    onUpdateSessionMessages(activeCharId, [...updatedMessages, aiMsg]);
  };

  const handleSyncOfflineMemory = (summaryText: string) => {
    if (!activeSession || !activeCharId) return;

    const snippet = summaryText.replace(/\s+/g, " ").slice(0, 200);
    const memoryContent = `【线下见面回忆】与你线下见面：${snippet}...`;

    const currentMsgs = activeSession.messages;
    const lastMsg = currentMsgs[currentMsgs.length - 1];

    if (lastMsg && lastMsg.content.startsWith("【线下见面回忆】")) {
      const updated = currentMsgs.map((m) =>
        m.id === lastMsg.id ? { ...m, content: memoryContent, timestamp: Date.now() } : m
      );
      onUpdateSessionMessages(activeCharId, updated);
    } else {
      const memoryMsg: Message = {
        id: `offline-mem-${Date.now()}`,
        role: "assistant",
        content: memoryContent,
        timestamp: Date.now(),
      };
      onUpdateSessionMessages(activeCharId, [...currentMsgs, memoryMsg]);
    }
  };

  const handleConfirmLocation = () => {
    const loc = locationName.trim() || "某处地点";
    const content = `[LOCATION]${loc}`;

    const record = { id: `location-${Date.now()}`, timestamp: Date.now(), location: loc, characterId: activeCharId };
    const saved = localStorage.getItem("mobile_ai_locations_v1");
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem("mobile_ai_locations_v1", JSON.stringify([record, ...list]));

    const newMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now()
    };
    if (activeSession && activeCharId) {
      onUpdateSessionMessages(activeCharId, [...activeSession.messages, newMsg]);
    }
    setActiveModal(null);
    setLocationName("");
  };

  const handleConfirmRedPacket = () => {
    if (!redpacketAmount || isNaN(Number(redpacketAmount)) || Number(redpacketAmount) <= 0) return;
    const amt = Number(redpacketAmount).toFixed(2);
    const blessing = redpacketBlessing.trim() || "恭喜发财，大吉大利";
    const content = `[REDPACKET]${amt}|${blessing}`;

    const record = { id: `redpacket-${Date.now()}`, timestamp: Date.now(), amount: amt, blessing, characterId: activeCharId };
    const saved = localStorage.getItem("mobile_ai_redpackets_v1");
    const list = saved ? JSON.parse(saved) : [];
    localStorage.setItem("mobile_ai_redpackets_v1", JSON.stringify([record, ...list]));

    const newMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content,
      timestamp: Date.now()
    };
    if (activeSession && activeCharId) {
      onUpdateSessionMessages(activeCharId, [...activeSession.messages, newMsg]);
    }
    setActiveModal(null);
    setRedpacketAmount("");
    setRedpacketBlessing("恭喜发财，大吉大利");
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active character
  const activeChar = characters.find((c) => c.id === activeCharId) || null;

  // Check for preselected character redirection from Character Creator
  // -------------------- MOMENTS SEEDING & DYNAMIC POST GENERATION --------------------
  useEffect(() => {
    const savedMoments = localStorage.getItem("mobile_ai_moments_posts_v1");
    if (savedMoments) {
      try {
        setMoments(JSON.parse(savedMoments));
      } catch (e) {
        console.error("Error reading moments", e);
      }
    } else {
      const initialMoments: any[] = [];
      setMoments(initialMoments);
      localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(initialMoments));
    }
  }, [characters]);

  const handleMomentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("图片文件过大，请选择 5MB 以内的图片");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewMomentImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishMoment = () => {
    if (!newMomentContent.trim() && !newMomentImage) return;

    const userNickname = localStorage.getItem("mobile_ai_forum_user_nickname") || "用户";
    const userAvatar = localStorage.getItem("mobile_ai_forum_user_avatar") || "";

    const newPost: MomentPost = {
      id: `moment-user-${Date.now()}`,
      authorName: userNickname,
      authorAvatar: userAvatar || "👤",
      content: newMomentContent.trim(),
      image: newMomentImage || undefined,
      visibility: newMomentVisibility,
      targetCharacterIds: newMomentVisibility !== "all" ? selectedCharIdsForVisibility : [],
      timestamp: Date.now(),
      likes: 0,
      likedByUser: false,
      comments: [],
    };

    const updated = [newPost, ...moments];
    setMoments(updated);
    localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(updated));

    setNewMomentContent("");
    setNewMomentImage(null);
    setNewMomentVisibility("all");
    setSelectedCharIdsForVisibility([]);
    setIsPublishMomentOpen(false);

    // 朋友圈动态发布同步生成评论：自动触发生成一轮3-6条互动评论
    handleGenerateCommentsForPost(newPost.id, updated);
  };

  const handleConfirmShareToCharacter = (char: Character, post: MomentPost) => {
    let session = sessions.find((s) => s.characterId === char.id);
    const currentMsgs = session ? session.messages : [];

    const shareMsg: Message = {
      id: `msg-${Date.now()}-share`,
      role: "user",
      content: `[MOMENT_SHARE]${JSON.stringify({
        id: post.id,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        content: post.content,
        image: post.image,
        mediaEmojis: post.mediaEmojis,
        timestamp: post.timestamp,
      })}`,
      timestamp: Date.now(),
      type: "moment",
      momentData: post,
    };

    const updatedMsgs = [...currentMsgs, shareMsg];
    onUpdateSessionMessages(char.id, updatedMsgs);

    setIsShareModalOpen(false);
    setShareTargetPost(null);

    // 自动跳转到与该角色的聊天界面，方便与角色讨论相关内容
    setActiveCharId(char.id);
    setActiveTab("chat");
    setMainTab("chat");

    setCopyToast(`已分享朋友圈动态给 ${char.name}`);
    setTimeout(() => setCopyToast(null), 2000);
  };

  // 朋友圈动态自动生成规则：每次刷新/生成 3-6 条动态，根据角色人设决定发动态频率
  const handleTriggerBatchMoments = async () => {
    if (isGeneratingPosts) return;
    setIsGeneratingPosts(true);

    try {
      const postCount = Math.floor(Math.random() * 4) + 3; // 3 to 6 posts
      
      // Calculate frequency weight for each character based on persona
      const evaluatedChars = characters.map(c => {
        const text = `${c.name} ${c.description || ''} ${c.systemInstruction || ''}`.toLowerCase();
        let score = 2; // default weight
        if (/活泼|热心|外向|社交|唠叨|助手|甜妹|开心|记录|碎碎念|可爱|日常|乐天|话痨|表达|分享/.test(text)) score += 3;
        if (/高冷|冰冷|傲娇|沉默|寡言|无情|离群|冷漠|孤僻|厌世|冷酷/.test(text)) score -= 1.8;
        return { character: c, score: Math.max(score, 0.2) };
      });

      // Select postCount characters weighted by posting frequency score
      const selectedChars: Character[] = [];
      if (evaluatedChars.length > 0) {
        for (let i = 0; i < postCount; i++) {
          const totalWeight = evaluatedChars.reduce((sum, item) => sum + item.score, 0);
          let rand = Math.random() * totalWeight;
          let chosen = evaluatedChars[0].character;
          for (const item of evaluatedChars) {
            if (rand <= item.score) {
              chosen = item.character;
              break;
            }
            rand -= item.score;
          }
          selectedChars.push(chosen);
        }
      }

      let newGeneratedPosts: MomentPost[] = [];

      if (settings && (settings.apiKey || settings.apiUrl)) {
        try {
          const prompt = `你是一个朋友圈动态批量生成器。
现在应用中有以下角色列表（请根据各自性格与发动态频率喜好生成动态）：
${selectedChars.map((c, idx) => `${idx + 1}. ID: "${c.id}", 名字: "${c.name}", 人设: "${c.description || '无'}"`).join("\n")}

生成要求：
1. 总共恰好生成 ${postCount} 条朋友圈动态。
2. 语言极其贴合各自角色的性格人设，表达生动自然（分享生活小确幸、吐槽、感悟、照片随感、打卡美食等）。
3. 每条动态请附带 1-2 条初始角色或 NPC 评论。
4. 请严格返回纯 JSON 数组格式（不要包含 Markdown 代码块或额外说明文字）：
[
  {
    "characterId": "角色ID",
    "characterName": "角色名字",
    "content": "动态文字正文",
    "mediaEmojis": "☕️",
    "comments": [
      {
        "authorName": "角色或NPC名字",
        "authorAvatar": "Emoji或头像",
        "isNpc": false,
        "replyToName": "",
        "content": "评论内容"
      }
    ]
  }
]`;

          const charToUse = selectedChars[0] || { id: "moments-generator", name: "朋友圈助手", description: "朋友圈动态生成", memories: [] };
          const res = await apiChat({
            character: charToUse,
            messages: [{ role: "user", content: prompt }],
            settings,
            systemInstruction: "你是一个朋友圈动态生成助手，请根据角色人设生成真实生动的动态。必须只返回JSON数组。\n\n" + getThreeDataSourcesPrompt(charToUse, (charToUse as any).memories || [], [])
          });

          const rawText = res.text || "";
          const jsonMatch = rawText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            newGeneratedPosts = parsed.map((item: any, idx: number) => {
              const charObj = characters.find(c => c.id === item.characterId) || selectedChars[idx % selectedChars.length] || characters[0];
              return {
                id: `moment-gen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
                characterId: charObj.id,
                authorName: charObj.name,
                authorAvatar: charObj.chatAvatar || charObj.avatar || "🤖",
                isCharacter: true,
                content: item.content || "今天也是充满能量的一天！",
                mediaEmojis: item.mediaEmojis || "✨",
                timestamp: Date.now() - idx * 1000 * 60 * 3,
                likes: Math.floor(Math.random() * 12) + 1,
                likedByUser: false,
                comments: Array.isArray(item.comments) ? item.comments.map((c: any, cIdx: number) => ({
                  id: `cmt-init-${Date.now()}-${idx}-${cIdx}`,
                  authorName: c.authorName || "NPC小明",
                  authorAvatar: c.authorAvatar || "💬",
                  isNpc: c.isNpc !== false,
                  content: c.content || "顶一下！",
                  replyToName: c.replyToName || undefined,
                  timestamp: Date.now() - idx * 1000 * 60 * 3 + (cIdx + 1) * 20000,
                })) : []
              };
            });
          }
        } catch (e) {
          console.warn("API batch moments generation failed, using local offline generator", e);
        }
      }

      // Offline generator fallback if API not configured or failed
      if (newGeneratedPosts.length === 0) {
        const topicTemplates = [
          { text: "今天在路边遇到了一只超级可爱的三花猫，蹭了我好久！感觉一整天的心情都被治愈了。🐱✨", emoji: "🐱🐾" },
          { text: "终于打卡了那家想去很久的手冲咖啡馆，浓郁的特调拿铁真的名不虚传！☕️📖", emoji: "☕️🍰" },
          { text: "夜跑完顺便抬头看了一下天空，今晚的月色和星光好温柔啊。夜生活才刚刚开始呢！🌌🏃", emoji: "🌙✨" },
          { text: "今天尝试做了一顿新菜，虽然样子长得奇奇怪怪的，但是味道居然意外地还不错？🍳😋", emoji: "🍳🍕" },
          { text: "在书店泡了一整下午，翻到了很多意想不到的好书。生活需要偶尔这样放空慢下来。📚🌿", emoji: "📖☕️" },
          { text: "有时候感觉时间过得好快，但只要记下这些平凡的小时刻，每一天就都有了独特的意义。🌟", emoji: "🌱☁️" },
          { text: "突然好想吃火锅啊……有没有人现在要一起组队去夜宵的？速速报上名来！🍲🔥", emoji: "🍲🍻" },
          { text: "今天的代码/工作进度非常顺利，提前搞定！准备好好奖励自己一个大号冰淇淋！🍨🍦", emoji: "🍨🎉" }
        ];

        newGeneratedPosts = selectedChars.slice(0, postCount).map((charObj, idx) => {
          const template = topicTemplates[(idx + Math.floor(Math.random() * topicTemplates.length)) % topicTemplates.length];
          const npcNames = ["路人甲", "隔壁小明", "吃瓜群众", "咖啡店长", "吃货小张", "社恐网友"];
          const randomNpc = npcNames[Math.floor(Math.random() * npcNames.length)];
          const otherChar = characters.find(c => c.id !== charObj.id) || charObj;

          const initialComments: MomentComment[] = [
            {
              id: `cmt-offline-${Date.now()}-${idx}-1`,
              authorName: randomNpc,
              authorAvatar: "💬",
              isNpc: true,
              content: "拍得真不错！前排围观～",
              timestamp: Date.now() - idx * 60000 + 15000,
            },
            {
              id: `cmt-offline-${Date.now()}-${idx}-2`,
              authorName: otherChar.name,
              authorAvatar: otherChar.chatAvatar || otherChar.avatar || "🤖",
              characterId: otherChar.id,
              isNpc: false,
              replyToName: randomNpc,
              content: `@${randomNpc} 哈哈同意！我也觉得很赞`,
              timestamp: Date.now() - idx * 60000 + 30000,
            }
          ];

          return {
            id: `moment-gen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            characterId: charObj.id,
            authorName: charObj.name,
            authorAvatar: charObj.chatAvatar || charObj.avatar || "🤖",
            isCharacter: true,
            content: template.text,
            mediaEmojis: template.emoji,
            timestamp: Date.now() - idx * 1000 * 60 * 3,
            likes: Math.floor(Math.random() * 10) + 1,
            likedByUser: false,
            comments: initialComments
          };
        });
      }

      const updatedMoments = [...newGeneratedPosts, ...moments];
      setMoments(updatedMoments);
      localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(updatedMoments));
    } catch (err) {
      console.error("Error generating batch moments", err);
    } finally {
      setIsGeneratingPosts(false);
    }
  };

  // 生成一轮新评论（包含角色回复用户、角色回复NPC、NPC回复角色、NPC之间互相回复，每轮3-6条）
  const handleGenerateCommentsForPost = async (postId: string, customPostList?: MomentPost[]) => {
    const targetMomentsList = customPostList || moments;
    const post = targetMomentsList.find(m => m.id === postId);
    if (!post) return;

    setIsGeneratingComments(prev => ({ ...prev, [postId]: true }));

    try {
      const commentCount = Math.floor(Math.random() * 4) + 3; // 3 to 6 comments
      let newComments: MomentComment[] = [];

      if (settings && (settings.apiKey || settings.apiUrl)) {
        try {
          const existingCommentsText = (post.comments || [])
            .map(c => `- ${c.authorName}${c.replyToName ? `(回复 ${c.replyToName})` : ''}: ${c.content}`)
            .join("\n");

          const prompt = `你是一个朋友圈动态评论区AI生成器。
当前朋友圈动态如下：
- 发布者：【${post.authorName}】
- 内容：【${post.content || "(图片动态)"}】
- 现有评论：
${existingCommentsText || "暂无评论"}

应用中角色列表：
${characters.map(c => `- 名字: "${c.name}", 人设: "${c.description || '无'}"`).join("\n")}

现在请为此动态生成新一轮评论，必须恰好生成 ${commentCount} 条评论。
互动关系要求丰富多样，包含以下形式：
1. 角色回复动态发布者或用户；
2. 角色回复 NPC（如：路人甲、邻居大叔、咖啡师、吃瓜群众等）；
3. NPC 回复角色；
4. NPC 之间互相回复（必须正确填写 replyToName）。

请严格返回纯 JSON 数组格式（不要包含 Markdown 代码块）：
[
  {
    "authorName": "名字（可以是角色名或NPC名）",
    "authorAvatar": "Emoji或头像",
    "isNpc": false,
    "replyToName": "被回复者的名字或空字符串",
    "content": "评论内容"
  }
]`;

          const res = await apiChat({
            character: { id: "comments-generator", name: "评论生成助手", description: "评论区生成" },
            messages: [{ role: "user", content: prompt }],
            settings,
            systemInstruction: "你是一个朋友圈评论生成器，生成生动有爱的互动评论。必须只返回纯JSON数组。"
          });

          const rawText = res.text || "";
          const jsonMatch = rawText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            newComments = parsed.map((item: any, idx: number) => ({
              id: `cmt-gen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
              authorName: item.authorName || "吃瓜群众",
              authorAvatar: item.authorAvatar || (item.isNpc ? "💬" : "🤖"),
              isNpc: item.isNpc !== false,
              replyToName: item.replyToName || undefined,
              content: item.content || "说得太对了！",
              timestamp: Date.now() + idx * 1000
            }));
          }
        } catch (e) {
          console.warn("API comment generation failed, using local offline generator", e);
        }
      }

      // Offline generator fallback for 3-6 comments
      if (newComments.length === 0) {
        const npcPool = ["路人甲", "隔壁小明", "咖啡馆店长", "吃瓜群众", "吃货小张", "社恐网友", "热心邻居"];
        const charPool = characters.length > 0 ? characters : [{ id: "c1", name: "角色小助手", avatar: "🤖", chatAvatar: "", description: "" }];
        const userNickname = localStorage.getItem("mobile_ai_forum_user_nickname") || "用户";

        const c1 = charPool[0];
        const c2 = charPool[1] || charPool[0];
        const npc1 = npcPool[Math.floor(Math.random() * npcPool.length)];
        const npc2 = npcPool[(Math.floor(Math.random() * npcPool.length) + 1) % npcPool.length];

        const patterns = [
          [
            { author: c1.name, avatar: c1.chatAvatar || c1.avatar || "🤖", isNpc: false, replyTo: "", content: "哇，这篇写得太棒了！强推顶一下！" },
            { author: npc1, avatar: "💬", isNpc: true, replyTo: c1.name, content: `@${c1.name} 哈哈完全同意！我也想去同款地点` },
            { author: userNickname, avatar: "👤", isNpc: false, replyTo: npc1, content: `@${npc1} 真的假的？环境确实超好看` },
            { author: c2.name, avatar: c2.chatAvatar || c2.avatar || "🤖", isNpc: false, replyTo: userNickname, content: `@${userNickname} 下次也带上我吧～` },
            { author: npc2, avatar: "💬", isNpc: true, replyTo: c2.name, content: `@${c2.name} 围观吃瓜，排队加一！` },
            { author: c1.name, avatar: c1.chatAvatar || c1.avatar || "🤖", isNpc: false, replyTo: npc2, content: `@${npc2} 评论区好热闹呀！` }
          ],
          [
            { author: npc1, avatar: "💬", isNpc: true, replyTo: "", content: "前排围观，抢个沙发～" },
            { author: c1.name, avatar: c1.chatAvatar || c1.avatar || "🤖", isNpc: false, replyTo: npc1, content: `@${npc1} 抢得真快，板凳留给我！` },
            { author: npc2, avatar: "💬", isNpc: true, replyTo: c1.name, content: `@${c1.name} 哈哈哈哈，大家都好有梗` },
            { author: c2.name, avatar: c2.chatAvatar || c2.avatar || "🤖", isNpc: false, replyTo: npc2, content: `@${npc2} 保持队形，继续盖楼！` }
          ]
        ];

        const chosenPattern = patterns[Math.floor(Math.random() * patterns.length)].slice(0, commentCount);

        newComments = chosenPattern.map((item, idx) => ({
          id: `cmt-offgen-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          authorName: item.author,
          authorAvatar: item.avatar,
          isNpc: item.isNpc,
          replyToName: item.replyTo || undefined,
          content: item.content,
          timestamp: Date.now() + idx * 1000
        }));
      }

      setMoments((prev) => {
        const updatedMoments = prev.map(m => {
          if (m.id === postId) {
            return {
              ...m,
              comments: [...(m.comments || []), ...newComments]
            };
          }
          return m;
        });
        localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(updatedMoments));
        return updatedMoments;
      });
    } catch (err) {
      console.error("Error generating comments for post", err);
    } finally {
      setIsGeneratingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddUserComment = (postId: string) => {
    if (!commentInputText.trim()) return;

    const userNickname = localStorage.getItem("mobile_ai_forum_user_nickname") || "用户";
    const userAvatar = localStorage.getItem("mobile_ai_forum_user_avatar") || "";

    const newCmt: MomentComment = {
      id: `cmt-user-${Date.now()}`,
      authorName: userNickname,
      authorAvatar: userAvatar || "👤",
      isNpc: false,
      content: commentInputText.trim(),
      replyToName: activeReplyToName || undefined,
      timestamp: Date.now()
    };

    const updatedMoments = moments.map(m => {
      if (m.id === postId) {
        return {
          ...m,
          comments: [...(m.comments || []), newCmt]
        };
      }
      return m;
    });

    setMoments(updatedMoments);
    localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(updatedMoments));

    setCommentInputText("");
    setActiveReplyPostId(null);
    setActiveReplyToName(null);
  };

  const handleLikeMoment = (id: string) => {
    const next = moments.map((m) => {
      if (m.id === id) {
        const liked = m.likedByUser;
        return {
          ...m,
          likes: liked ? m.likes - 1 : m.likes + 1,
          likedByUser: !liked,
        };
      }
      return m;
    });
    setMoments(next);
    localStorage.setItem("mobile_ai_moments_posts_v1", JSON.stringify(next));
  };

  // Helper: Format relative timestamp
  const formatRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 0) return "刚刚";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}小时前`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "昨天";
    if (diffDays === 2) return "前天";
    return `${diffDays}天前`;
  };

  const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const isToday = now.toDateString() === date.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    
    if (isToday) {
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    } else if (isYesterday) {
      return "昨天";
    } else {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}-${day}`;
    }
  };

  // User Profile actions
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        canvas.width = 120;
        canvas.height = 120;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          setUserAvatar(base64);
          localStorage.setItem("mobile_ai_user_avatar_v1", base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = () => {
    if (userNameInput.trim()) {
      setUserName(userNameInput.trim());
      localStorage.setItem("mobile_ai_user_name_v1", userNameInput.trim());
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    const preselected = localStorage.getItem("mobile_ai_preselected_char");
    if (preselected) {
      localStorage.removeItem("mobile_ai_preselected_char");
      if (characters.some((c) => c.id === preselected)) {
        setActiveCharId(preselected);
        setActiveTab("chat");
        setApiError(null);
      }
    }
  }, [characters]);

  // Active session
  const activeSession = activeCharId
    ? sessions.find((s) => s.characterId === activeCharId || s.id === activeCharId) || ({
        id: activeCharId,
        characterId: activeCharId.startsWith("group-") ? undefined : activeCharId,
        isGroup: activeCharId.startsWith("group-"),
        messages: [],
        lastActive: Date.now(),
        currentOS: undefined
      } as ChatSession)
    : null;

  // Load character-specific settings
  useEffect(() => {
    if (activeCharId) {
      const activeChar = characters.find(c => c.id === activeCharId);
      const isSub = activeChar?.isSubAccount;
      const parentId = activeChar?.parentCharacterId;

      // Mood randomization when opening chat / changing character
      const moods: Array<"开心" | "平静" | "疲惫" | "烦躁"> = ["开心", "平静", "疲惫", "烦躁"];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      setMood(randomMood);

      const savedSelf = localStorage.getItem(`char_settings_v1_${activeCharId}`);
      let parsedSelf: any = {};
      if (savedSelf) {
        try {
          parsedSelf = JSON.parse(savedSelf);
        } catch (e) {
          console.error(e);
        }
      }

      // Load memories from parent if sub-account, otherwise from self
      let memoriesToLoad = parsedSelf.memories || ["初始记忆：对用户很友好。"];
      if (isSub && parentId) {
        const savedParent = localStorage.getItem(`char_settings_v1_${parentId}`);
        if (savedParent) {
          try {
            const parsedParent = JSON.parse(savedParent);
            memoriesToLoad = parsedParent.memories || memoriesToLoad;
          } catch (e) {
            console.error(e);
          }
        }
      }

      setReplyLength(parsedSelf.replyLength !== undefined ? parsedSelf.replyLength : "short");
      setMinReplies(parsedSelf.minReplies !== undefined ? parsedSelf.minReplies : 1);
      setMaxReplies(parsedSelf.maxReplies !== undefined ? parsedSelf.maxReplies : 6);
      setActiveMessaging(parsedSelf.activeMessaging !== undefined ? parsedSelf.activeMessaging : false);
      setActiveMessagingDelay(parsedSelf.activeMessagingDelay !== undefined ? parsedSelf.activeMessagingDelay : 1);
      setTimePerception(parsedSelf.timePerception !== undefined ? parsedSelf.timePerception : false);
      setIsBlocked(parsedSelf.isBlocked !== undefined ? parsedSelf.isBlocked : false);
      setMemories(memoriesToLoad);

      const savedWallpapers = localStorage.getItem(`chat_wallpapers_${activeCharId}`);
      if (savedWallpapers) {
        try {
          setChatWallpapers(JSON.parse(savedWallpapers));
        } catch (e) {
          setChatWallpapers([]);
        }
      } else {
        setChatWallpapers([]);
      }

      const savedWp = localStorage.getItem(`chat_current_wallpaper_${activeCharId}`);
      setCurrentChatWallpaper(savedWp || null);
    }
  }, [activeCharId, characters]);

  const saveSettings = (updated: Partial<{
    replyLength: "short" | "medium" | "detailed";
    minReplies: number;
    maxReplies: number;
    activeMessaging: boolean;
    activeMessagingDelay: number;
    timePerception: boolean;
    isBlocked: boolean;
    memories: string[];
    userPersonaId?: string;
  }>) => {
    if (!activeCharId) return;
    const activeChar = characters.find(c => c.id === activeCharId);

    const current = {
      replyLength,
      minReplies,
      maxReplies,
      activeMessaging,
      activeMessagingDelay,
      timePerception,
      isBlocked,
      memories,
      ...updated,
    };
    localStorage.setItem(`char_settings_v1_${activeCharId}`, JSON.stringify(current));

    // If active character is a sub-account, also save memories to the parent's settings
    if (activeChar?.isSubAccount && activeChar.parentCharacterId && updated.memories) {
      const parentId = activeChar.parentCharacterId;
      const savedParent = localStorage.getItem(`char_settings_v1_${parentId}`);
      let parentSettings: any = {};
      if (savedParent) {
        try {
          parentSettings = JSON.parse(savedParent);
        } catch (e) {}
      }
      parentSettings.memories = updated.memories;
      localStorage.setItem(`char_settings_v1_${parentId}`, JSON.stringify(parentSettings));
    }

    // Conversely, if the active character is a parent, sync memories to all of its sub-accounts
    if (updated.memories) {
      characters.forEach(char => {
        if (char.isSubAccount && char.parentCharacterId === activeCharId) {
          const savedSub = localStorage.getItem(`char_settings_v1_${char.id}`);
          let subSettings: any = {};
          if (savedSub) {
            try {
              subSettings = JSON.parse(savedSub);
            } catch (e) {}
          }
          subSettings.memories = updated.memories;
          localStorage.setItem(`char_settings_v1_${char.id}`, JSON.stringify(subSettings));
        }
      });
    }
  };

  const extractMemoryFromMessage = (text: string) => {
    let fact: string | null = null;
    const cleanText = text.trim();
    if (cleanText.includes("我叫") || cleanText.includes("名字是")) {
      const match = cleanText.match(/(?:我叫|名字是)\s*([^\s，。！？、]+)/);
      if (match) fact = `用户名字是 ${match[1]}`;
    } else if (cleanText.includes("我喜欢") || cleanText.includes("最爱")) {
      const match = cleanText.match(/(?:我喜欢|最爱)\s*([^\s，。！？、]{2,8})/);
      if (match) fact = `用户喜欢 ${match[1]}`;
    } else if (cleanText.includes("今天我") || cleanText.includes("今天去")) {
      const match = cleanText.match(/(?:今天我|今天去)\s*([^\s，。！？、]{2,10})/);
      if (match) fact = `用户今天 ${match[1]}`;
    } else if (cleanText.length > 3 && cleanText.length < 15) {
      if (cleanText.startsWith("我很") || cleanText.startsWith("我好")) {
        fact = `用户觉得 ${cleanText.slice(2)}`;
      }
    }

    if (fact && !memories.includes(fact)) {
      const updated = [...memories, fact];
      setMemories(updated);
      saveSettings({ memories: updated });
    }
  };

  // Scroll to bottom when messages or generating state changes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === "chat") {
      scrollToBottom();
    }
  }, [activeSession?.messages, isGenerating, activeTab]);

  // Handle Character Selection
  const handleSelectChar = (id: string) => {
    setActiveCharId(id);
    setActiveTab("chat");
    setApiError(null);
  };

  // Create new Custom Character
  const handleCreateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    setCharError("");

    if (!charName.trim()) {
      setCharError("请输入角色名称");
      return;
    }
    if (!charSys.trim()) {
      setCharError("请输入设定指令 (System Instruction)");
      return;
    }

    onAddCharacter({
      name: charName.trim(),
      avatar: charAvatar.trim() || "🤖",
      description: charDesc.trim() || "暂无简介",
      systemInstruction: charSys.trim() || `你正在扮演角色 "${charName.trim()}"。`,
      model: settings?.model || "gemini-3.6-flash",
      userPersonaId: charUserPersonaId || undefined,
    });

    // Reset Form
    setCharName("");
    setCharAvatar("🤖");
    setCharDesc("");
    setCharSys("");
    setCharUserPersonaId("");
    setIsCreatingChar(false);
  };

  // Save User Persona (create or update)
  const handleSavePersona = () => {
    setPersonaError("");
    if (!personaName.trim()) {
      setPersonaError("请输入设定名称");
      return;
    }
    if (!personaDesc.trim()) {
      setPersonaError("请输入人设简介/背景说明");
      return;
    }

    let updatedList: UserPersona[] = [];
    if (editingPersona) {
      // Update
      updatedList = userPersonas.map((p) => {
        if (p.id === editingPersona.id) {
          return {
            ...p,
            name: personaName.trim(),
            avatar: personaAvatar.trim() || "👤",
            description: personaDesc.trim(),
          };
        }
        return p;
      });
    } else {
      // Create
      const newPersona: UserPersona = {
        id: `up-${Date.now()}`,
        name: personaName.trim(),
        avatar: personaAvatar.trim() || "👤",
        description: personaDesc.trim(),
        createdAt: Date.now(),
      };
      updatedList = [...userPersonas, newPersona];
    }

    setUserPersonas(updatedList);
    localStorage.setItem("user_personas_v1", JSON.stringify(updatedList));

    // Reset forms
    setPersonaName("");
    setPersonaAvatar("");
    setPersonaDesc("");
    setEditingPersona(null);
    setIsCreatingPersona(false);
  };

  // Delete User Persona
  const handleDeletePersona = (id: string) => {
    const updatedList = userPersonas.filter((p) => p.id !== id);
    setUserPersonas(updatedList);
    localStorage.setItem("user_personas_v1", JSON.stringify(updatedList));

    // Cascade unbind
    characters.forEach((c) => {
      if (c.userPersonaId === id) {
        onUpdateCharacter({ ...c, userPersonaId: undefined });
      }
    });
  };

  // Lore matcher: check if the latest user text contains active lore keys or is always active, filtered by active character and sorted by priority.
  const matchLore = (text: string): { matched: LoreEntry[]; keys: string[] } => {
    const activeLore = loreList.filter((l) => l.enabled !== false);
    const matched: LoreEntry[] = [];
    const matchedKeys: string[] = [];

    activeLore.forEach((lore) => {
      // Filter by character mounting (empty/undefined characterIds means mounted to all characters)
      if (lore.characterIds && lore.characterIds.length > 0 && activeCharId) {
        if (!lore.characterIds.includes(activeCharId)) {
          return; // Skip if not mounted on this character
        }
      }

      // Check mounting option
      const isAlwaysActive = lore.mountType === "always";
      let isMatched = false;

      if (isAlwaysActive) {
        isMatched = true;
      } else {
        // Keyword-based trigger (or default if mountType not specified)
        isMatched = lore.keys.some((key) => {
          const lowerKey = key.toLowerCase();
          const lowerText = text.toLowerCase();
          return lowerText.includes(lowerKey);
        });
      }

      if (isMatched) {
        matched.push(lore);
        if (isAlwaysActive) {
          matchedKeys.push(`${lore.title} (常规挂载)`);
        } else {
          matchedKeys.push(lore.title);
        }
      }
    });

    // Sort matched entries by priority: "pre" (前) -> "mid" (中) -> "post" (后) (default is "mid")
    const priorityWeight = { pre: 1, mid: 2, post: 3 };
    matched.sort((a, b) => {
      const weightA = priorityWeight[a.priority || "mid"];
      const weightB = priorityWeight[b.priority || "mid"];
      return weightA - weightB;
    });

    return { matched, keys: matchedKeys };
  };

  const activeCharacter = characters.find(c => c.id === activeCharId);
  
  useEffect(() => {
    if (activeChar) {
      setIsBlocked(activeChar.isBlocked || false);
    }
  }, [activeChar]);
  
  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating || !activeCharId || !activeSession || isBlocked) return;

    const userText = inputText.trim();
    setInputText("");
    setApiError(null);

    // Extract dynamic memories
    extractMemoryFromMessage(userText);

    // Build User Message
    let updatedMessages = [...(activeSession.messages || [])];
    if (editingMessageId) {
      updatedMessages = updatedMessages.map((m) =>
        m.id === editingMessageId ? { ...m, content: userText, timestamp: Date.now() } : m
      );
      setEditingMessageId(null);
    } else {
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: userText,
        timestamp: Date.now(),
        quotedMsg: quotedMsgState || undefined,
      };
      setQuotedMsgState(null);
      updatedMessages.push(userMessage);

      if (pendingResendRecallId) {
        updatedMessages = updatedMessages.filter((m) => m.id !== pendingResendRecallId);
        setPendingResendRecallId(null);
      }
    }

    onUpdateSessionMessages(activeCharId, updatedMessages);
    // Send button strictly sends user message only. AI reply must be manually triggered via Heart button.
  };

  // Trigger AI reply (supporting customMessages, replyLength, replyCount, mood, memories)
  const handleTriggerAiReply = async (customMessages?: Message[]) => {
    if (isGenerating || !activeCharId || !activeSession || (!activeChar && !activeSession.isGroup)) return;
    setApiError(null);
    setIsGenerating(true);

    try {
      if (onTriggerAiReply) {
        await onTriggerAiReply(activeCharId, customMessages);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "未知错误，生成回复失败。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger personality-matching active message after user being away/offline
  const handleTriggerActiveMessage = async (delayHours: number) => {
    if (!activeChar || !activeCharId || !activeSession || isBlocked) return;

    setApiError(null);
    setIsGenerating(true);

    // Format a friendly duration string for the AI prompt
    let timeStr = `${delayHours}小时`;
    if (delayHours === 0.003) {
      timeStr = "一段时间 (系统测试用: 10秒)";
    } else if (delayHours < 1) {
      timeStr = `${Math.round(delayHours * 60)}分钟`;
    }

    const currentHistory = activeSession.messages;

    // Create a special hidden system instruction embedded inside a user message to prompt the active message
    const promptMessage: Message = {
      id: `active-prompt-${Date.now()}`,
      role: "user",
      content: `【系统提示：由于用户已经离开该应用 ${timeStr} 没联系你，请你作为 ${activeChar.name} 主动给用户发送一条关怀、吐槽、想念或分享趣事的小消息。你发送的消息内容必须非常符合你的人设（可以表达想念、吐槽生活、分享趣味日常、见闻或冷知识）。请确保你的语气也契合你当前的心情（${mood}）。请严格遵守字数限制，以极短的短句形式输出，每句不能超过15个字。直接以你（角色本人）的语气输出内容，千万不要包含任何关于系统提示、线下见面元注解（如“角色名：”、“*想着*”）或括号提示。】`,
      timestamp: Date.now(),
    };

    try {
      // 1. Lore matching on the active thread history
      const lastUserMsg = [...currentHistory].reverse().find((m) => m.role === "user");
      const { matched, keys } = lastUserMsg ? matchLore(lastUserMsg.content) : { matched: [], keys: [] };

      // Determine reply count (for active messages, usually 1 or randomized based on settings) based on character personality/archetype (强化条数绑定规则)
      const getReplyCountForCharacter = (char: any, minRep: number, maxRep: number): number => {
        const name = char?.name || "";
        const desc = char?.description || "";
        const sys = char?.systemInstruction || "";
        const combined = `${name} ${desc} ${sys}`.toLowerCase();

        const isColdOrSilent = /冷|少|静|高冷|克制|淡|不善言辞|冰/i.test(combined);
        const isLivelyOrTalkative = /热|活泼|话痨|痨|多话|话多|健谈|啰唆/i.test(combined);
        const isGentleOrListening = /温|暖|听|倾听|治愈|缓/i.test(combined);

        if (isColdOrSilent) {
          // 高冷/话少人设：即使设置范围是 1-10 条，也只回复 1-2 条，用简短语句表达。
          return Math.floor(Math.random() * 2) + 1; // 1 or 2 replies
        }

        if (isLivelyOrTalkative) {
          // 活泼/话痨人设：在设置范围内取偏大值，可连续发送多条消息。
          const mid = Math.floor((minRep + maxRep) / 2);
          const start = Math.max(minRep, mid);
          const end = Math.max(start, maxRep);
          return Math.floor(Math.random() * (end - start + 1)) + start;
        }

        if (isGentleOrListening) {
          // 温和/倾听型人设：回复条数适中，以回应和承接为主。
          const mid = Math.round((minRep + maxRep) / 2);
          const start = Math.max(1, mid - 1);
          const end = Math.min(maxRep, mid + 1);
          return Math.floor(Math.random() * (end - start + 1)) + start;
        }

        // Default fallback random
        return Math.max(1, Math.floor(Math.random() * (maxRep - minRep + 1)) + minRep);
      };

      const count = getReplyCountForCharacter(activeChar, minReplies, maxReplies);

      // 2. Request API response
      const cleanCharacter = {
        id: activeChar.id,
        name: activeChar.name,
        avatar: activeChar.avatar,
        description: activeChar.description || "一个充满魅力的角色",
        systemInstruction: activeChar.systemInstruction || `你正在扮演角色 "${activeChar.name}"。请保持符合人设的自然日常对话。`,
        model: activeChar.model || settings?.model || "gemini-3.6-flash",
      };
      const requestParams = {
        messages: [...currentHistory, promptMessage], // append hidden prompt message
        character: cleanCharacter,
        settings: {
          ...settings,
          model: activeChar.model || settings?.model || "gemini-3.6-flash",
        },
        matchedLore: matched,
        chatMode: chatMode,
        replyLength: replyLength,
        replyCount: count,
        mood: mood,
        memories: memories,
      };
      console.log('请求参数:', requestParams);
      let data;
      try {
        data = await apiChat(requestParams);
      } catch (networkErr: any) {
        throw networkErr;
      }

        

      // 3. Build Assistant Messages (handling split messages and splitting into short sentences)
      const text = data.text || "";
      
      // Split by [SPLIT] first, then by punctuation (。！？!?), newlines, etc.
      const splitByPreset = text.split("[SPLIT]").map((p: string) => p.trim()).filter(Boolean);
      const parts: string[] = [];
      for (const p of splitByPreset) {
        const matches = p.match(/[^。！？!?\n\r]+[。！？!?\n\r]*/g);
        if (matches) {
          for (const m of matches) {
            const trimmed = m.trim();
            if (trimmed) {
              parts.push(trimmed);
            }
          }
        } else {
          const trimmed = p.trim();
          if (trimmed) {
            parts.push(trimmed);
          }
        }
      }
      
      if (parts.length > 0) {
        let currentMessages = [...currentHistory];
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const newBotMsg: Message = {
            id: `msg-${Date.now() + i}-assistant`,
            role: "assistant",
            content: part,
            timestamp: Date.now(),
            matchedLoreKeys: keys.length > 0 ? keys : undefined,
            os: i === parts.length - 1 ? (data.os || undefined) : undefined,
          };
          currentMessages = [...currentMessages, newBotMsg];
          const osToSave = i === parts.length - 1 ? (data.os || "") : undefined;
          onUpdateSessionMessages(activeCharId, currentMessages, osToSave);
          
          // If there are subsequent messages, simulate a natural typing interval of 1-3 seconds
          if (i < parts.length - 1) {
            setIsGenerating(true); // Keep typing indicator visible
            const delayMs = Math.floor(Math.random() * 2000) + 1000; // 1000ms - 3000ms
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      } else {
        const fallbackMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: text || "...",
          timestamp: Date.now(),
          matchedLoreKeys: keys.length > 0 ? keys : undefined,
        };
        onUpdateSessionMessages(activeCharId, [...currentHistory, fallbackMsg], data.os || "");
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "未能触发角色的主动留言。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Check for offline/away active messages upon character load or tab activation
  useEffect(() => {
    if (!activeCharId || !activeSession || !activeMessaging || isBlocked) return;

    const checkOfflineMessage = async () => {
      const saved = localStorage.getItem(`char_settings_v1_${activeCharId}`);
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved);
        const savedActiveMessaging = parsed.activeMessaging !== undefined ? parsed.activeMessaging : false;
        const savedDelay = parsed.activeMessagingDelay !== undefined ? parsed.activeMessagingDelay : 1;
        
        if (savedActiveMessaging && activeSession.lastActive > 0) {
          const elapsedMs = Date.now() - activeSession.lastActive;
          const delayMs = savedDelay * 3600 * 1000;
          
          if (elapsedMs >= delayMs) {
            // Update lastActive timestamp first to prevent double-triggering
            onUpdateSessionMessages(activeCharId, activeSession.messages);
            
            // Trigger active message!
            console.log(`[Active Message] User away for ${elapsedMs / 1000}s (threshold: ${delayMs / 1000}s). Triggering active message.`);
            await handleTriggerActiveMessage(savedDelay);
          }
        }
      } catch (e) {
        console.error("Error in checkOfflineMessage:", e);
      }
    };

    // Delay checking slightly to ensure session and local storage are synchronized
    const timer = setTimeout(() => {
      checkOfflineMessage();
    }, 800);

    return () => clearTimeout(timer);
  }, [activeCharId]);

  // Handle visibility changes (e.g. user minimizing app and coming back later)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeCharId && activeSession && activeMessaging && !isBlocked) {
        const saved = localStorage.getItem(`char_settings_v1_${activeCharId}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const savedActiveMessaging = parsed.activeMessaging !== undefined ? parsed.activeMessaging : false;
            const savedDelay = parsed.activeMessagingDelay !== undefined ? parsed.activeMessagingDelay : 1;
            
            if (savedActiveMessaging && activeSession.lastActive > 0) {
              const elapsedMs = Date.now() - activeSession.lastActive;
              const delayMs = savedDelay * 3600 * 1000;
              if (elapsedMs >= delayMs) {
                // Update lastActive timestamp first to prevent double-triggering
                onUpdateSessionMessages(activeCharId, activeSession.messages);
                handleTriggerActiveMessage(savedDelay);
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeCharId, activeSession, activeMessaging, isBlocked]);

  // Timers for long press
  const longPressTimerRef = useRef<any>(null);

  const handleTouchStart = (msg: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMessage(msg);
      setShowBottomSheet(true);
    }, 500); // 500ms
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleMouseDown = (msg: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setActiveMessage(msg);
      setShowBottomSheet(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setActiveMessage(msg);
    setShowBottomSheet(true);
  };

  const handleDoubleClick = (msg: Message) => {
    setActiveMessage(msg);
    setShowBottomSheet(true);
  };

  // Clear Chat History
  const handleClearHistory = () => {
    if (!activeCharId) return;
    setConfirmDialog({
      title: "清空聊天记录",
      message: "确定要清空与该角色的聊天记录吗？此操作无法撤销。",
      onConfirm: () => {
        onUpdateSessionMessages(activeCharId, []);
        setConfirmDialog(null);
      }
    });
  };

  // Reset Conversation (all memories cleared + chat messages cleared)
  const handleResetConversation = async () => {
    if (!activeChar || !activeCharId) return;
    setConfirmDialog({
      title: "重置对话及记忆",
      message: "确定要重置与该角色的对话吗？这将清空所有历史聊天记录和记忆，回到最原始状态。",
      onConfirm: () => {
        onUpdateSessionMessages(activeCharId, []);
        setMemories([]);
        saveSettings({ memories: [] });
        setConfirmDialog(null);
      }
    });
  };

  // Export Chat history to .txt
  const handleExportChat = () => {
    if (!activeSession || activeSession.messages.length === 0) {
      alert("没有对话记录可以导出。");
      return;
    }
    
    let content = `与角色 [${activeChar?.name}] 的聊天记录导出\n`;
    content += `导出时间: ${new Date().toLocaleString()}\n`;
    content += `========================================\n\n`;
    
    activeSession.messages.forEach((msg) => {
      const roleName = msg.role === "user" ? "用户" : activeChar?.name || "角色";
      const timeStr = new Date(msg.timestamp).toLocaleString();
      content += `[${timeStr}] ${roleName}:\n${msg.content}\n\n`;
    });
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `与_${activeChar?.name || "AI"}_的聊天记录_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reroll AI reply
  const handleReroll = async () => {
    if (!activeMessage || activeMessage.role !== "assistant" || !activeSession) return;
    
    if (activeSession.isGroup) {
      // Group chat reroll/regenerate: Regenerate the whole contiguous block of assistant messages
      const msgIdx = activeSession.messages.findIndex(m => m.id === activeMessage.id);
      if (msgIdx === -1) return;

      // Find the start of the current assistant round
      let startIdx = msgIdx;
      while (startIdx > 0 && activeSession.messages[startIdx - 1].role === "assistant") {
        startIdx--;
      }

      const priorMessages = activeSession.messages.slice(0, startIdx);

      onUpdateSessionMessages(activeSession.id, priorMessages, undefined, {
        groupName: activeSession.groupName,
        groupAvatar: activeSession.groupAvatar,
        memberIds: activeSession.memberIds,
        syncMemory: activeSession.syncMemory,
        worldSetting: activeSession.worldSetting,
        isGroup: true,
      });

      setShowBottomSheet(false);

      // Trigger new AI reply with the remaining history
      await handleTriggerGroupAiReply(priorMessages);
    } else {
      if (!activeCharId) return;
      // Find index of the last user message
      const lastUserIdx = activeSession.messages.map(m => m.role).lastIndexOf("user");
      
      // Remove all assistant messages after the last user message
      const updatedMessages = lastUserIdx === -1 
        ? [] 
        : activeSession.messages.slice(0, lastUserIdx + 1);

      onUpdateSessionMessages(activeCharId, updatedMessages);
      setShowBottomSheet(false);

      // Trigger new AI reply with the remaining history
      await handleTriggerAiReply(updatedMessages);
    }
  };

  // Helper to check if parenthetical text is a kaomoji rather than roleplay action
  const isKaomojiOrNotAction = (str: string): boolean => {
    if (!str) return false;
    const kaomojiPattern = /[｡•ᴗ•◡◕‿°□╯︵┻━＞﹏＜๑^vﾟДー；~¯\\\/│┃┏┓┗┛┣┫┳┻╋┼═║╓╩┯┸┺]/;
    if (kaomojiPattern.test(str)) return true;
    if (!/[\u4e00-\u9fa5]/.test(str) && (str.length <= 8 || /[^a-zA-Z0-9\s]/.test(str))) {
      return true;
    }
    return false;
  };

  // Beautiful Markdown/Asterisk parser for roleplay:
  // e.g., *looks around nervously* Hello -> looks around nervously (italicized, lighter text) + Hello (normal)
  const renderMessageContent = (content: string, msg?: Message) => {
    if (msg?.role === "user" && !msg?.type && !content.startsWith("[CHARACTER_TRANSFER]") && !content.startsWith("[OFFLINE_INVITATION]") && !content.startsWith("[OFFLINE_MEET_SESSION]") && !content.startsWith("[TRANSFER]") && !content.startsWith("[LOCATION]") && !content.startsWith("[REDPACKET]") && !content.startsWith("[图片")) {
      return <span>{content}</span>;
    }

    if (content.startsWith("[OFFLINE_MEET_SESSION]")) {
      const parts = content.replace("[OFFLINE_MEET_SESSION]", "").split("|");
      const idPart = parts.find((p) => p.startsWith("id="));
      const statusPart = parts.find((p) => p.startsWith("status="));
      const status = statusPart ? statusPart.split("=")[1] : "active";
      const meetId = idPart ? idPart.split("=")[1] : "";

      const handleEndMeet = (action: "save" | "delete") => {
        if (!activeSession || !activeCharId) return;
        const updatedMessages = activeSession.messages.map((m) => {
          if (m.id === msg?.id) {
            return {
              ...m,
              content: `[OFFLINE_MEET_SESSION]id=${meetId}|status=ended|action=${action}`,
            };
          }
          return m;
        });

        if (action === "save") {
          // Attempt to find history in localstorage
          const historyKey = `mobile_ai_offline_history_${activeCharId}`;
          const historyRaw = localStorage.getItem(historyKey);
          let summary = "线下见面过程";
          if (historyRaw) {
             try {
                const historyArr = JSON.parse(historyRaw);
                const firstOne = historyArr[0];
                if (firstOne && firstOne.summary) {
                   summary = firstOne.summary;
                }
             } catch(e) {}
          }
          
          const memoryContent = `【线下见面回忆】（该次见面记忆已被注入长期记忆中）\n${summary}`;
          const memoryMsg: Message = {
            id: `msg-${Date.now()}-memory-injection`,
            role: "assistant",
            content: memoryContent,
            timestamp: Date.now() + 10,
          };
          updatedMessages.push(memoryMsg);
        } else {
          const sysMsg: Message = {
            id: `msg-${Date.now()}-memory-delete`,
            role: "system",
            content: "【线下见面的记忆已被遗忘】",
            timestamp: Date.now() + 10,
          };
          updatedMessages.push(sysMsg);
        }

        onUpdateSessionMessages(activeCharId, updatedMessages);
      };

      return (
        <div className="relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-blue-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px]">
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[3px] bg-blue-500 rounded-[1.5px]" />
          <div className="pl-2 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-xs  font-bold text-blue-900 flex items-center gap-1.5 shrink-0">
                线下界面
              </span>
              <span className={`text-[10px]  font-medium px-2 py-0.5 rounded-full ${
                status === "active" ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-500"
              }`}>
                {status === "active" ? "进行中" : "已结束"}
              </span>
            </div>
            
            <p className="text-xs  text-neutral-600 leading-relaxed break-words line-clamp-3">
              正在进行一场读取主线上下文的线下约会。
            </p>

            <div className="pt-2 flex flex-col gap-2 border-t border-neutral-100">
              {status === "active" ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOfflineMeet(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold  text-xs py-2 rounded-[10px] transition-colors active:scale-95"
                  >
                    继续见面
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEndMeet("save")}
                      className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold  text-xs py-2 rounded-[10px] transition-colors active:scale-95"
                    >
                      结束并注入记忆
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEndMeet("delete")}
                      className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold  text-xs py-2 rounded-[10px] transition-colors active:scale-95"
                    >
                      结束并删除记忆
                    </button>
                  </div>
                </>
              ) : (
                <span className="text-xs text-neutral-400  block text-center py-1">
                  该场见面已结束
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (msg?.type === "transfer" || content.startsWith("[CHARACTER_TRANSFER]")) {
      let amount = "0.00";
      let note = "转账";
      let status = "pending";
      let transferId = "";

      if (msg?.transferData) {
        amount = msg.transferData.amount;
        note = msg.transferData.note;
        status = msg.transferData.status;
        transferId = msg.transferData.transferId;
      } else if (content.startsWith("[CHARACTER_TRANSFER]")) {
        const parts = content.replace("[CHARACTER_TRANSFER]", "").split("|");
        amount = parts[0] || "0.00";
        note = parts[1] || "转账";
        status = parts[2] || "pending";
        transferId = parts[3] || "";
      }

      const isCollected = status === "collected";
      const isReturned = status === "returned";
      const isPending = status === "pending";

      return (
        <div
          className={`relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-neutral-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px] ${
            !isPending ? "opacity-80" : ""
          }`}
        >
          {/* 左侧极细深灰色竖条 (2px 宽，圆角 1px)，作为视觉点缀 */}
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[2px] bg-neutral-800 rounded-[1px]" />

          <div className="pl-2 space-y-2.5">
            {/* 第一行：左侧“💳 转账”，右侧金额（大号艺术字体，深灰色 28px Playfair Display） */}
            <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100/80 pb-2.5">
              <span className="text-xs  font-medium text-neutral-600 flex items-center gap-1.5 shrink-0">
                💳 转账
              </span>
              <span className=" text-[28px] font-bold text-neutral-800 tracking-tight leading-none shrink-0">
                ¥{amount}
              </span>
            </div>

            {/* 第二行：转账人（加粗）+ “向你转账”，灰色小字 */}
            <div className="text-xs  text-neutral-500 flex items-center">
              <span className="font-bold text-neutral-800 mr-1">
                {activeChar?.name || "对方"}
              </span>
              向你转账
            </div>

            {/* 第三行：附言（小字，斜体，暖灰色） */}
            {note && (
              <p className="text-[11px]  italic text-stone-500 leading-relaxed break-words">
                “{note}”
              </p>
            )}

            {/* 底部：右对齐按钮 */}
            <div className="flex items-center justify-end gap-2 pt-1.5">
              {isPending && msg && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReturnCharacterTransfer(msg.id, transferId);
                    }}
                    className="text-xs  text-neutral-400 hover:text-neutral-600 px-2 py-1 transition-colors"
                  >
                    退回
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCollectCharacterTransfer(msg.id, amount, note, transferId);
                    }}
                    className="bg-black hover:bg-neutral-800 active:scale-95 text-white  text-xs font-medium rounded-[8px] px-[20px] py-[8px] transition-all shadow-xs cursor-pointer"
                  >
                    确认收款
                  </button>
                </>
              )}
              {isCollected && (
                <button
                  disabled
                  type="button"
                  className="bg-neutral-300 text-white  text-xs font-medium rounded-[8px] px-[20px] py-[8px] cursor-not-allowed"
                >
                  已收款
                </button>
              )}
              {isReturned && (
                <button
                  disabled
                  type="button"
                  className="bg-neutral-200 text-neutral-400  text-xs font-medium rounded-[8px] px-[20px] py-[8px] cursor-not-allowed"
                >
                  已退回
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (content.startsWith("[TRANSFER]")) {
      const parts = content.replace("[TRANSFER]", "").split("|");
      const amount = parts[0] || "0.00";
      const note = parts[1] || "转账";
      return (
        <div className="relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-neutral-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px]">
          {/* 左侧极细深灰色竖条 (2px 宽，圆角 1px)，作为视觉点缀 */}
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[2px] bg-neutral-800 rounded-[1px]" />

          <div className="pl-2 space-y-2.5">
            {/* 第一行：左侧“💳 转账”，右侧金额（大号艺术字体，深灰色 28px Playfair Display） */}
            <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100/80 pb-2.5">
              <span className="text-xs  font-medium text-neutral-600 flex items-center gap-1.5 shrink-0">
                💳 转账
              </span>
              <span className=" text-[28px] font-bold text-neutral-800 tracking-tight leading-none shrink-0">
                ¥{amount}
              </span>
            </div>

            {/* 第二行：转账人（加粗）+ “向你转账”，灰色小字 */}
            <div className="text-xs  text-neutral-500 flex items-center">
              你向
              <span className="font-bold text-neutral-800 mx-1">
                {activeChar?.name || "对方"}
              </span>
              转账
            </div>

            {/* 第三行：附言（小字，斜体，暖灰色） */}
            {note && (
              <p className="text-[11px]  italic text-stone-500 leading-relaxed break-words">
                “{note}”
              </p>
            )}

            {/* 底部：状态展示 */}
            <div className="flex items-center justify-end pt-1.5">
              <button
                disabled
                type="button"
                className="bg-neutral-100 text-neutral-500  text-xs font-medium rounded-[8px] px-[20px] py-[8px] cursor-default"
              >
                等待对方接收
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (content.startsWith("[LOCATION]")) {
      const locName = content.replace("[LOCATION]", "");
      return (
        <div className="bg-neutral-100 border border-neutral-200 rounded-xl p-3 space-y-1.5 text-xs text-neutral-900 select-none shadow-sm">
          <div className="flex items-center gap-2 font-bold border-b border-neutral-200/60 pb-1.5">
            <span className="text-base">📍</span>
            <span className="truncate">共享位置</span>
          </div>
          <p className="text-xs  font-medium text-neutral-800">{locName}</p>
        </div>
      );
    }
    if (content.startsWith("[MOMENT_SHARE]") || msg?.type === "moment" || msg?.momentData) {
      let momentObj = msg?.momentData;
      if (!momentObj) {
        try {
          const jsonStr = content.replace("[MOMENT_SHARE]", "");
          momentObj = JSON.parse(jsonStr);
        } catch (e) {}
      }

      const authorName = momentObj?.authorName || "朋友圈动态";
      const authorAvatar = momentObj?.authorAvatar || "📱";
      const textContent = momentObj?.content || "";
      const img = momentObj?.image;

      return (
        <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 space-y-2 text-xs text-neutral-900 select-none shadow-sm max-w-[260px] my-1 text-left">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-[10px]  font-bold text-neutral-700 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-neutral-800" />
              朋友圈动态
            </span>
            <span className="text-[9px] font-mono text-neutral-400">来自朋友圈</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200/50 flex items-center justify-center text-xs shrink-0">
              {authorAvatar.startsWith("http") || authorAvatar.startsWith("data:") ? (
                <img src={authorAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{authorAvatar}</span>
              )}
            </div>
            <span className="font-bold text-xs text-neutral-900 truncate">{authorName}</span>
          </div>

          {textContent && (
            <p className="text-xs  text-neutral-800 line-clamp-3 leading-relaxed font-medium">
              {textContent}
            </p>
          )}

          {img && (
            <div className="rounded-xl overflow-hidden border border-neutral-100 max-h-36">
              <img src={img} alt="动态图片" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      );
    }
    if (content.startsWith("[REDPACKET]")) {
      const parts = content.replace("[REDPACKET]", "").split("|");
      const amount = parts[0] || "0.00";
      const blessing = parts[1] || "恭喜发财，大吉大利";
      return (
        <div className="bg-black text-white rounded-xl p-3.5 space-y-2 text-xs select-none shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🧧</span>
            <div className="min-w-0 flex-1">
              <span className="font-bold block text-xs truncate">{blessing}</span>
              <span className="text-[10px] text-neutral-400 font-mono">微信红包</span>
            </div>
            <span className="font-mono font-bold text-sm text-amber-300">¥{amount}</span>
          </div>
        </div>
      );
    }

    if (content.startsWith("[OFFLINE_INVITATION]")) {
      const parts = content.replace("[OFFLINE_INVITATION]", "").split("|");
      const note = parts[0] || "邀请你线下见面";
      const status = parts[1] || "pending";

      const isUserSender = msg?.role === "user";
      const titleText = isUserSender
        ? `你邀请 ${activeChar?.name || "对方"} 线下见面`
        : `${activeChar?.name || "对方"} 邀请你线下见面`;

      return (
        <div className="relative bg-white rounded-[16px] p-[18px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-purple-100/90 my-[12px] select-none transition-all duration-200 min-w-[240px] max-w-[280px]">
          {/* 左侧紫色装饰线 */}
          <div className="absolute left-[10px] top-[18px] bottom-[18px] w-[3px] bg-purple-600 rounded-[1.5px]" />

          <div className="pl-2 space-y-2.5">
            {/* 顶栏 */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-xs  font-bold text-purple-900 flex items-center gap-1.5 shrink-0">
                📖 线下见面邀请
              </span>
              <span className={`text-[10px]  font-medium px-2 py-0.5 rounded-full ${
                status === "pending"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : status === "accepted"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-neutral-100 text-neutral-500"
              }`}>
                {status === "pending" ? "待回复" : status === "accepted" ? "已接受" : "已拒绝"}
              </span>
            </div>

            {/* 核心描述 */}
            <div className="text-xs  font-semibold text-neutral-800">
              {titleText}
            </div>

            {/* 附言 */}
            {note && (
              <p className="text-[11px]  italic text-stone-600 leading-relaxed break-words bg-stone-50/80 p-2 rounded-lg border border-stone-100">
                “{note}”
              </p>
            )}

            {/* 操作区域 */}
            <div className="pt-1 flex items-center justify-end gap-2">
              {status === "pending" && !isUserSender && msg && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeclineOfflineInvitation(msg.id);
                    }}
                    className="text-xs  font-medium text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-all active:scale-95 cursor-pointer"
                  >
                    拒绝
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptOfflineInvitation(msg.id);
                    }}
                    className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white  text-xs font-medium rounded-lg px-4 py-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    接受
                  </button>
                </>
              )}

              {status === "pending" && isUserSender && (
                <span className="text-[11px] text-neutral-400  italic">
                  等待对方回答...
                </span>
              )}

              {status === "accepted" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOfflineMeet(true);
                  }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700  text-xs font-medium rounded-lg px-3.5 py-1.5 transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>进入线下见面</span>
                </button>
              )}

              {status === "declined" && (
                <span className="text-[11px] text-neutral-400  italic">
                  已拒绝
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Clean up any remaining action wrappers from speech text inside bubble
    const cleanSpeech = content
      .replace(/^[*（(【\[]+|[*）)】\]]+$/g, "")
      .replace(/(\*[^*]+\*|（[^）]+）|\([^)]+\)|【[^】]+】|\[(?!(?:CHARACTER_TRANSFER|TRANSFER|LOCATION|REDPACKET|OFFLINE_INVITATION|OFFLINE_MEET_SESSION|图片[：:]))[^\]]+\])/g, (match) => {
        if (match.startsWith("(") && match.endsWith(")")) {
          const inner = match.slice(1, -1);
          if (isKaomojiOrNotAction(inner)) return match;
        }
        return "";
      })
      .trim();

    const imageRegex = /(\[图片[：:][^\]]+\])/g;
    const textToRender = cleanSpeech || content;
    if (imageRegex.test(textToRender)) {
      const parts = textToRender.split(imageRegex);
      return (
        <span className="inline-flex flex-col gap-1.5 max-w-full">
          {parts.map((part, idx) => {
            if (!part) return null;
            if (/^\[图片[：:]/.test(part)) {
              const imgDesc = part.replace(/^\[图片[：:]/, "").replace(/\]$/, "").trim();
              return (
                <div key={idx} className="my-1 rounded-2xl overflow-hidden border border-[#E8E3D8] bg-[#FAF8F3] p-3 shadow-xs max-w-[260px] select-none text-left">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#ECE7DC]">
                    <span className="text-[11px] font-bold text-[#8C8171] flex items-center gap-1.5">
                      <span className="text-xs">📷</span> 照片 / 图片
                    </span>
                    <span className="text-[10px] text-[#A8A090] font-mono">Image</span>
                  </div>
                  <div className="rounded-xl bg-[#F3EDE3] p-3 border border-[#E3DDD0] text-[#3D372E] text-[12.5px]  leading-relaxed flex flex-col gap-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0 select-none">🖼️</span>
                      <span className="italic font-medium">{imgDesc}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </span>
      );
    }

    return <span>{cleanSpeech || content}</span>;
  };

  return (
    <div className="flex-1 flex flex-col bg-white text-neutral-900 select-none animate-slide-up h-full min-h-0 relative overflow-hidden">
      {settings?.chatWallpaper && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-30" 
          style={{ backgroundImage: `url(${settings.chatWallpaper})` }}
        />
      )}
      {/* -------------------- VIEW 1: MAIN TAB INTERFACE -------------------- */}
      {activeCharId === null && (
        <div className="flex-1 flex flex-col min-h-0 bg-neutral-50">
          
          {/* Tab Pages rendering */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Tab 1: 聊天 (Dialogue Sessions) */}
            {mainTab === "chat" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className=" font-bold text-base tracking-wide text-neutral-950">消息 (CHATS)</span>
                  <div className="relative">
                    <button
                      onClick={() => setShowGroupPlusMenu(!showGroupPlusMenu)}
                      className="p-1 text-black hover:bg-neutral-100 rounded-lg active:scale-95 transition-all flex items-center"
                      title="新建"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    {showGroupPlusMenu && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50 text-xs ">
                        <button
                          onClick={() => {
                            setShowGroupPlusMenu(false);
                            setGroupNameInput("");
                            setGroupAvatarInput("💬");
                            setSelectedMemberIds([]);
                            setGroupError("");
                            setShowCreateGroupModal(true);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 font-medium text-neutral-800"
                        >
                          <Users className="w-3.5 h-3.5" /> 创建群聊
                        </button>
                        <button
                          onClick={() => {
                            setShowGroupPlusMenu(false);
                            setIsCreatingChar(true);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-2 font-medium text-neutral-800 border-t border-neutral-100"
                        >
                          <User className="w-3.5 h-3.5" /> 创建单聊角色
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isCreatingChar ? (
                  /* Custom Creation Form */
                  <div className="flex-1 overflow-y-auto bg-white p-5 animate-fade-in">
                    <form onSubmit={handleCreateCharacter} className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                        <span className="text-xs font-mono font-bold tracking-wider text-neutral-400 uppercase">创建全新角色</span>
                        <button 
                          type="button" 
                          onClick={() => setIsCreatingChar(false)} 
                          className="text-neutral-400 hover:text-neutral-800"
                        >
                          <ChevronLeft className="w-4 h-4 inline" /> 返回
                        </button>
                      </div>

                      {charError && (
                        <div className="p-2.5 bg-red-50 border border-red-100 text-[11px] text-red-700 rounded-lg">
                          {charError}
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">头像 (Avatar)</label>
                          <div className="relative group w-full h-[46px]">
                            <div className="w-full h-full rounded-xl border border-neutral-200 bg-white flex items-center justify-center overflow-hidden">
                              {charAvatar.length > 5 ? (
                                <img src={charAvatar} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg">{charAvatar || "🤖"}</span>
                              )}
                            </div>
                            <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer rounded-xl transition-all">
                              <span className="text-[10px] font-medium">更换</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const img = new window.Image();
                                    img.onload = () => {
                                      const canvas = document.createElement("canvas");
                                      const size = Math.min(img.width, img.height);
                                      canvas.width = 120;
                                      canvas.height = 120;
                                      const ctx = canvas.getContext("2d");
                                      if (ctx) {
                                        const sx = (img.width - size) / 2;
                                        const sy = (img.height - size) / 2;
                                        ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
                                        const base64 = canvas.toDataURL("image/jpeg", 0.85);
                                        setCharAvatar(base64);
                                      }
                                    };
                                    img.src = event.target?.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div className="col-span-3 space-y-1">
                          <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">名字 (Name)</label>
                          <input
                            type="text"
                            placeholder="如: 深空流浪者"
                            value={charName}
                            onChange={(e) => setCharName(e.target.value)}
                            className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">一句话简介 (Profile Description)</label>
                        <input
                          type="text"
                          placeholder="如: 飘荡在柯伊伯带的星际矿工。"
                          value={charDesc}
                          onChange={(e) => setCharDesc(e.target.value)}
                          className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">绑定用户设定 (Bind User Persona)</label>
                        <select
                          value={charUserPersonaId}
                          onChange={(e) => setCharUserPersonaId(e.target.value)}
                          className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white focus:outline-none focus:border-neutral-950"
                        >
                          <option value="">（不绑定任何设定）</option>
                          {userPersonas.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">系统设定指令 (System Instructions)</label>
                        <textarea
                          rows={5}
                          placeholder="用第二人称或第三人称详细指定该角色的口吻、身世、说话习惯以及秘密。AI 将绝对遵循此项设定。"
                          value={charSys}
                          onChange={(e) => setCharSys(e.target.value)}
                          className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white resize-none  leading-relaxed"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full text-xs font-mono font-bold tracking-widest text-white bg-black hover:bg-neutral-800 py-3 rounded-xl transition-colors"
                      >
                        创建并保存 (CREATE AGENT)
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Dialogue list sorted by lastActive */
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(() => {
                      const charItems = characters.map(char => {
                        const session = sessions.find(s => s.characterId === char.id);
                        return {
                          type: 'char' as const,
                          id: char.id,
                          name: char.name,
                          avatar: char.avatar,
                          chatAvatar: char.chatAvatar,
                          description: char.description,
                          lastActive: session?.lastActive || char.createdAt || 0,
                          session,
                          char
                        };
                      });

                      const groupItems = sessions
                        .filter(s => s.isGroup)
                        .map(group => {
                          const lastMsg = group.messages?.[group.messages.length - 1]?.content;
                          return {
                            type: 'group' as const,
                            id: group.id,
                            name: group.groupName || '群聊',
                            avatar: group.groupAvatar || '💬',
                            chatAvatar: undefined,
                            description: `${group.memberIds?.length || 0}位成员`,
                            lastActive: group.lastActive || 0,
                            session: group,
                            group
                          };
                        });

                      const otherItems = [...charItems.filter(i => i.id !== 'char-preset-fafa'), ...groupItems]
                        .sort((a, b) => b.lastActive - a.lastActive);
                      const allItems = otherItems;

                      return allItems.map(item => {
                        if (item.type === 'char') {
                          const { char, session } = item;
                          const lastMsg = session?.messages?.[session.messages.length - 1]?.content;
                          const previewText = lastMsg ? (lastMsg.length > 10 ? lastMsg.substring(0, 10) + "..." : lastMsg) : char.description || "暂无消息";
                          const displayTime = formatTimestamp(session?.lastActive || char.createdAt || Date.now());

                          return (
                            <div
                              key={char.id}
                              onClick={() => handleSelectChar(char.id)}
                              className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex items-center justify-between gap-3 hover:border-neutral-400 cursor-pointer active:scale-[0.99] transition-all relative"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                  <CharacterAvatar character={char} mode="chat" size={48} className="rounded-xl shadow-inner shrink-0" />
                                  {unreads[char.id] && (
                                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border border-white" />
                                  )}
                                  {char.isSubAccount && (
                                    <span className={`absolute bottom-0 right-0 text-[8px] font-bold px-1 py-0.5 rounded border border-white leading-none shadow-sm ${
                                      char.isBusted ? "bg-red-500 text-white" : "bg-neutral-500 text-white"
                                    }`}>
                                      {char.isBusted ? "已揭穿" : "小"}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className=" font-bold text-sm text-neutral-950 truncate max-w-[150px]">{char.name}</span>
                                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">{displayTime}</span>
                                  </div>
                                  <p className="text-xs text-neutral-400 truncate max-w-[210px]  mt-0.5">{previewText}</p>
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          const { group, session } = item;
                          const lastMsg = session?.messages?.[session.messages.length - 1]?.content;
                          const previewText = lastMsg ? (lastMsg.length > 10 ? lastMsg.substring(0, 10) + "..." : lastMsg) : `${group.memberIds?.length || 0}人加入群聊`;
                          const displayTime = formatTimestamp(group.lastActive || Date.now());

                          return (
                            <div
                              key={group.id}
                              onClick={() => {
                                setActiveCharId(group.id);
                                setActiveTab("chat");
                                setApiError(null);
                              }}
                              className="p-4 bg-white border border-neutral-200/60 shadow-sm rounded-2xl flex items-center justify-between gap-3 hover:border-neutral-400 cursor-pointer active:scale-[0.99] transition-all relative"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-2xl select-none shadow-inner shrink-0 relative">
                                  {group.groupAvatar?.startsWith('http') || group.groupAvatar?.startsWith('data:') ? (
                                    <img src={group.groupAvatar} alt={group.groupName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    group.groupAvatar || '💬'
                                  )}
                                  <span className="absolute bottom-0 right-0 text-[8px] font-bold px-1 py-0.5 rounded border border-white bg-neutral-900 text-white leading-none shadow-sm">
                                    群
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className=" font-bold text-sm text-neutral-950 truncate max-w-[150px]">{group.groupName}</span>
                                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">{displayTime}</span>
                                  </div>
                                  <p className="text-xs text-neutral-400 truncate max-w-[210px]  mt-0.5">{previewText}</p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 联系人 (Contacts List) */}
            {mainTab === "contacts" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className=" font-bold text-base tracking-wide text-neutral-950">通讯录 (CONTACTS)</span>
                  <button
                    onClick={() => {
                      setMainTab("chat");
                      setIsCreatingChar(true);
                    }}
                    className="p-1 text-black hover:bg-neutral-100 rounded-lg active:scale-95 transition-all"
                    title="创建自定义角色"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="px-4 py-2.5 bg-white border-b border-neutral-100 shrink-0">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="搜索已保存角色或说明..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-neutral-50 border border-neutral-200/80 focus:border-neutral-900 focus:bg-white pl-9 pr-3 py-2 rounded-xl transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {(() => {
                    const filtered = characters.filter(c => c.id !== 'char-preset-fafa' && (c.name.includes(searchQuery) || (c.description || "").includes(searchQuery)));
                    const groups: Record<string, Character[]> = {};
                    
                    filtered.forEach(c => {
                      const group = c.group || "其它";
                      if (!groups[group]) groups[group] = [];
                      groups[group].push(c);
                    });

                    return Object.entries(groups).map(([groupName, groupChars]) => (
                      <div key={groupName} className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-neutral-400 tracking-wider uppercase px-2 block">
                          {groupName}
                        </span>
                        <div className="space-y-1.5">
                          {groupChars.map((char) => (
                            <div
                              key={char.id}
                              onClick={() => setActiveProfileId(char.id)}
                              className="p-3 bg-white border border-neutral-200/50 shadow-sm rounded-2xl flex items-center justify-between gap-3 hover:border-neutral-400 cursor-pointer active:scale-[0.995] transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-xl select-none shadow-inner shrink-0 relative">
                                  {char.chatAvatar ? (
                                    <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    char.avatar
                                  )}

                                  {char.isSubAccount && (
                                    <span className={`absolute bottom-0 right-0 text-[8px] font-bold px-1 py-0.5 rounded border border-white leading-none shadow-sm ${
                                      char.isBusted 
                                        ? "bg-red-500 text-white" 
                                        : "bg-neutral-500 text-white"
                                    }`}>
                                      {char.isBusted ? "已揭穿" : "小"}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className=" font-bold text-xs text-neutral-950 block">{char.name}</span>
                                  <p className="text-[11px] text-neutral-400 truncate max-w-[180px]  mt-0.5">
                                    {char.description || "无简介"}
                                  </p>
                                </div>
                              </div>
                              {!char.isPreset && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDialog({
                                      title: "删除角色",
                                      message: `确定要彻底删除角色 "${char.name}" 吗？这也会清空与其相关的聊天会话。`,
                                      onConfirm: () => {
                                        onDeleteCharacter(char.id);
                                        setConfirmDialog(null);
                                      }
                                    });
                                  }}
                                  className="p-2 text-neutral-300 hover:text-red-500 rounded-lg hover:bg-neutral-50 shrink-0 transition-all active:scale-95"
                                  title="删除角色"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {/* Empty State */}
                  {characters.filter(c => c.name.includes(searchQuery) || (c.description || "").includes(searchQuery)).length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-xs text-neutral-400 ">没有找到符合条件的联系人</p>
                    </div>
                  )}
                </div>
                
                {/* Character Profile View */}
                {activeProfileId !== null && (
                  <div className="absolute inset-0 bg-white z-50">
                    <ProfileView
                      character={characters.find(c => c.id === activeProfileId)!}
                      allCharacters={characters}
                      onBack={() => setActiveProfileId(null)}
                      onUpdateCharacter={onUpdateCharacter}
                      onStartChat={(id) => {
                          setActiveProfileId(null);
                          handleSelectChar(id);
                      }}
                      onCreateSubAccount={(parentId) => {
                        setActiveProfileId(null);
                        setSubAccountParentId(parentId);
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: 朋友圈 (Moments Feed) */}
            {mainTab === "moments" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in relative">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className=" font-bold text-base tracking-wide text-neutral-950">朋友圈</span>
                  <button
                    onClick={handleTriggerBatchMoments}
                    disabled={isGeneratingPosts}
                    className="flex items-center gap-1.5 text-[11px]  font-bold bg-neutral-900 hover:bg-black text-white px-3 py-1.5 rounded-full shadow-xs active:scale-95 transition-all disabled:opacity-50"
                    title="刷新并生成 3-6 条角色动态"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGeneratingPosts ? "animate-spin" : ""}`} />
                    <span>{isGeneratingPosts ? "生成中..." : "刷新动态"}</span>
                  </button>
                </div>

                {/* Moments Feed list */}
                <div className="flex-1 overflow-y-auto bg-white pb-20">
                  {moments.length === 0 ? (
                    <div className="py-28 text-center space-y-3 px-4">
                      <div className="w-16 h-16 rounded-full bg-neutral-100 border border-neutral-200/60 flex items-center justify-center text-neutral-400 mx-auto">
                        <Compass className="w-7 h-7 stroke-[1.5]" />
                      </div>
                      <p className="text-xs text-neutral-400 ">暂无朋友圈动态，点击下方 “+” 按钮发布第一条动态吧！</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {[...moments]
                        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                        .map((post) => {
                          const char = characters.find(c => c.id === post.characterId);
                          const avatar = post.authorAvatar || "👤";
                          const name = post.authorName || "用户";

                          return (
                            <div 
                              key={post.id} 
                              onTouchStart={() => handleStartTouchPost(post)}
                              onTouchEnd={handleEndTouchPost}
                              onTouchMove={handleEndTouchPost}
                              onMouseDown={() => handleStartTouchPost(post)}
                              onMouseUp={handleEndTouchPost}
                              onMouseLeave={handleEndTouchPost}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setDeleteMenuPost(post);
                              }}
                              className="p-4 flex gap-3 animate-fade-in border-b border-neutral-100/80 relative select-none hover:bg-neutral-50/50 transition-colors"
                            >
                              {/* Left Column: Avatar */}
                              <div className="shrink-0">
                                <CharacterAvatar character={char} avatar={avatar} name={name} mode="real" size={40} className="border border-neutral-200/50" />
                              </div>

                              {/* Right Column: Moment Body */}
                              <div className="flex-1 min-w-0 space-y-2">
                                {/* Name, Time, Visibility & Delete Action */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className=" font-bold text-xs text-neutral-900">{name}</span>
                                    {post.visibility === "visible_some" && (
                                      <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-medium">部分可见</span>
                                    )}
                                    {post.visibility === "invisible_some" && (
                                      <span className="text-[9px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200/60 font-medium">部分不可见</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-mono text-neutral-400">{formatRelativeTime(post.timestamp)}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteMenuPost(post);
                                      }}
                                      className="p-1 text-neutral-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                      title="长按或点击删除动态"
                                    >
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Post Text Content */}
                                {post.content && (
                                  <p className="text-xs text-neutral-800 leading-relaxed  font-medium break-all whitespace-pre-wrap">
                                    {post.content}
                                  </p>
                                )}

                                {/* Image Attachment */}
                                {post.image && (
                                  <div className="mt-2 max-w-[240px] rounded-xl overflow-hidden border border-neutral-200/80 shadow-xs">
                                    <img src={post.image} alt="动态图片" className="w-full max-h-64 object-cover" />
                                  </div>
                                )}

                                {/* Media Emojis (if legacy emoji scenery) */}
                                {post.mediaEmojis && !post.image && (
                                  <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-100 text-3xl select-none w-max shadow-sm">
                                    {post.mediaEmojis}
                                  </div>
                                )}

                                {/* Simplified Actions Row */}
                                <div className="flex items-center justify-end pt-1 gap-2">
                                  {/* 1. Merged Like Count Button */}
                                  <button
                                    onClick={() => handleLikeMoment(post.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold transition-all active:scale-95 ${
                                      post.likedByUser
                                        ? "bg-rose-50 border-rose-200 text-rose-600 shadow-xs"
                                        : "bg-white border-neutral-200/80 text-neutral-600 hover:border-neutral-400 hover:bg-neutral-50"
                                    }`}
                                    title={post.likedByUser ? "取消点赞" : "点赞"}
                                  >
                                    <Heart className={`w-3.5 h-3.5 ${post.likedByUser ? "fill-rose-500 text-rose-500" : "text-neutral-500"}`} />
                                    <span>{post.likes || 0}</span>
                                  </button>

                                  {/* 2. Comment Button: Line speech bubble icon without text */}
                                  <button
                                    onClick={() => {
                                      if (activeReplyPostId === post.id) {
                                        setActiveReplyPostId(null);
                                      } else {
                                        setActiveReplyPostId(post.id);
                                        setActiveReplyToName(null);
                                      }
                                    }}
                                    className={`p-1.5 rounded-full border transition-all active:scale-95 ${
                                      activeReplyPostId === post.id
                                        ? "bg-neutral-100 border-neutral-300 text-neutral-900"
                                        : "bg-white border-neutral-200/80 text-neutral-600 hover:bg-neutral-50"
                                    }`}
                                    title="评论"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-neutral-600" />
                                  </button>

                                  {/* 3. Share Button: Line share icon without text */}
                                  <button
                                    onClick={() => {
                                      setShareTargetPost(post);
                                      setIsShareModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-full border border-neutral-200/80 bg-white hover:bg-neutral-50 text-neutral-600 transition-all active:scale-95"
                                    title="分享"
                                  >
                                    <Share2 className="w-3.5 h-3.5 text-neutral-600" />
                                  </button>

                                  {/* 4. AI Generate Comments Button: Line sparkles icon without text */}
                                  <button
                                    onClick={() => handleGenerateCommentsForPost(post.id)}
                                    disabled={!!isGeneratingComments[post.id]}
                                    className="p-1.5 rounded-full border border-neutral-200/80 bg-white hover:bg-neutral-50 text-neutral-700 transition-all active:scale-95 disabled:opacity-50"
                                    title="生成互动评论"
                                  >
                                    <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isGeneratingComments[post.id] ? "animate-spin text-neutral-400" : ""}`} />
                                  </button>
                                </div>

                                {/* Comments Section */}
                                {post.comments && post.comments.length > 0 && (
                                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100/80 space-y-2 mt-2">
                                    {post.comments.map((cmt) => (
                                      <div key={cmt.id} className="text-xs text-neutral-800 space-y-0.5 leading-relaxed">
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-neutral-900">{cmt.authorName}</span>
                                            {cmt.replyToName && (
                                              <span className="text-neutral-400 text-[11px]">
                                                回复 <span className="font-bold text-neutral-700">@{cmt.replyToName}</span>
                                              </span>
                                            )}
                                            <span className="text-neutral-700">: {cmt.content}</span>
                                          </div>
                                          <button
                                            onClick={() => {
                                              setActiveReplyPostId(post.id);
                                              setActiveReplyToName(cmt.authorName);
                                            }}
                                            className="text-[10px] text-neutral-400 hover:text-black shrink-0 underline ml-1"
                                          >
                                            回复
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Inline Comment Reply Input */}
                                {activeReplyPostId === post.id && (
                                  <div className="mt-2 flex gap-2 items-center animate-fade-in">
                                    <input
                                      type="text"
                                      autoFocus
                                      value={commentInputText}
                                      onChange={(e) => setCommentInputText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleAddUserComment(post.id);
                                        }
                                      }}
                                      placeholder={activeReplyToName ? `回复 @${activeReplyToName}...` : "输入评论..."}
                                      className="flex-1 bg-neutral-100 px-3 py-1.5 rounded-lg text-xs outline-none focus:border-neutral-800 border border-neutral-200"
                                    />
                                    <button
                                      onClick={() => handleAddUserComment(post.id)}
                                      disabled={!commentInputText.trim()}
                                      className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 disabled:opacity-40 transition-all active:scale-95"
                                    >
                                      发送
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveReplyPostId(null);
                                        setActiveReplyToName(null);
                                        setCommentInputText("");
                                      }}
                                      className="text-neutral-400 hover:text-neutral-700 p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Moment Post Delete Menu Modal */}
                {deleteMenuPost && !showDeleteConfirm && (
                  <div 
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in p-4"
                    onClick={() => setDeleteMenuPost(null)}
                  >
                    <div 
                      className="bg-white w-full max-w-xs rounded-2xl p-4 shadow-xl border border-neutral-100 space-y-3 animate-slide-up select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <span className="font-bold text-xs text-neutral-900">朋友圈动态操作</span>
                        <button 
                          onClick={() => setDeleteMenuPost(null)}
                          className="text-neutral-400 hover:text-neutral-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                        <p className="font-bold text-neutral-800 line-clamp-1 mb-0.5">
                          {deleteMenuPost.authorName || "用户"} 的动态
                        </p>
                        <p className="text-[11px] text-neutral-500 line-clamp-2">
                          {deleteMenuPost.content || "(无文字描述/多媒体内容)"}
                        </p>
                      </div>

                      <div className="pt-1 space-y-2">
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>删除此条朋友圈动态</span>
                        </button>
                        <button
                          onClick={() => setDeleteMenuPost(null)}
                          className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-xs transition-all"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Delete Dialog */}
                {showDeleteConfirm && deleteMenuPost && (
                  <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    <div 
                      className="bg-white w-full max-w-xs rounded-2xl p-5 shadow-2xl border border-neutral-100 space-y-4 animate-scale-in text-center select-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="font-bold text-sm text-neutral-900">确认彻底删除朋友圈？</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          删除后，该条动态将从朋友圈列表彻底移除，同时<span className="font-bold text-rose-600">同步删除相关角色记忆库中的对应记录</span>。角色在后续聊天中将不再记得此动态。此操作不可恢复。
                        </p>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold text-xs transition-all"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleExecuteDeleteMomentPost(deleteMenuPost.id)}
                          className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                        >
                          确认彻底删除
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Middle Bottom "+" Button */}
                <button
                  onClick={() => setIsPublishMomentOpen(true)}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-neutral-900 hover:bg-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-20 border-2 border-white"
                  title="发布朋友圈"
                >
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            )}

            {/* Tab 4: 我的 (User Profile) */}
            {mainTab === "me" && (
              <div className="flex-1 flex flex-col min-h-0 bg-neutral-50 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
                  <button 
                    onClick={onClose}
                    className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg active:scale-95 transition-all"
                    title="返回主页"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className=" font-bold text-base tracking-wide text-neutral-950">我的 (PROFILE)</span>
                  <div className="w-7 h-7" /> {/* Spacer */}
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Elegant Settings Rows */}
                  <div className="bg-white rounded-[24px] border border-neutral-200/50 shadow-sm overflow-hidden divide-y divide-neutral-100 select-none">
                    <div 
                      onClick={() => setShowWallet(true)}
                      className="p-4 flex items-center justify-between text-xs cursor-pointer hover:bg-neutral-50 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Wallet className="w-4 h-4 text-neutral-800" />
                        <span className=" font-bold text-neutral-900">钱包</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900">¥{walletBalance.toFixed(2)}</span>
                        <ChevronLeft className="w-4 h-4 rotate-180 text-neutral-400" />
                      </div>
                    </div>
                    <div 
                      onClick={() => setShowUserPersonas(true)}
                      className="p-4 flex items-center justify-between text-xs cursor-pointer hover:bg-neutral-50 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-neutral-800" />
                        <span className=" font-bold text-neutral-900">用户设定</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-400">{userPersonas.length} 个设定</span>
                        <ChevronLeft className="w-4 h-4 rotate-180 text-neutral-400" />
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className=" font-bold text-neutral-600">版本信息</span>
                        <span className="font-mono text-neutral-400">v1.4.2 (Monochrome)</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className=" text-[10px] text-neutral-400">更新于：{
                          (() => {
                            try {
                              const date = new Date(typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : Date.now());
                              const Y = date.getFullYear();
                              const M = String(date.getMonth() + 1).padStart(2, '0');
                              const D = String(date.getDate()).padStart(2, '0');
                              const h = String(date.getHours()).padStart(2, '0');
                              const m = String(date.getMinutes()).padStart(2, '0');
                              return `${Y}-${M}-${D} ${h}:${m}`;
                            } catch (e) {
                              return "未知时间";
                            }
                          })()
                        }</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          

          {/* Fixed Bottom Tab Navigation Bar */}
          <div className="shrink-0 bg-white border-t border-neutral-100 px-6 py-2 flex items-center justify-between shadow-sm">
            {/* Tab 1 Indicator: Chat */}
            <button
              onClick={() => {
                setMainTab("chat");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 relative transition-all active:scale-95 ${
                mainTab === "chat" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <MessageSquarePlus className={`w-5 h-5 ${mainTab === "chat" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px]  ${mainTab === "chat" ? "font-bold" : "font-medium"}`}>对话</span>
              {/* Show unread dot on tab icon if any character has unread state */}
              {Object.values(unreads).some(val => val) && (
                <span className="absolute top-1 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
            </button>

            {/* Tab 2 Indicator: Contacts */}
            <button
              onClick={() => {
                setMainTab("contacts");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95 ${
                mainTab === "contacts" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Users className={`w-5 h-5 ${mainTab === "contacts" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px]  ${mainTab === "contacts" ? "font-bold" : "font-medium"}`}>联系人</span>
            </button>

            {/* Tab 3 Indicator: Moments */}
            <button
              onClick={() => {
                setMainTab("moments");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95 ${
                mainTab === "moments" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <Compass className={`w-5 h-5 ${mainTab === "moments" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px]  ${mainTab === "moments" ? "font-bold" : "font-medium"}`}>朋友圈</span>
            </button>

            {/* Tab 4 Indicator: Me */}
            <button
              onClick={() => {
                setMainTab("me");
                setIsCreatingChar(false);
              }}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-all active:scale-95 ${
                mainTab === "me" ? "text-black scale-105" : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <User className={`w-5 h-5 ${mainTab === "me" ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px]  ${mainTab === "me" ? "font-bold" : "font-medium"}`}>我的</span>
            </button>
          </div>

          </div>
        </div>
      )}

      {/* -------------------- VIEW 2B: GROUP CHAT ROOM -------------------- */}
      {activeCharId !== null && activeSession?.isGroup && (
        <div className="flex-1 flex flex-col h-full bg-white chat-container">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 shrink-0 bg-white z-20">
            <button
              onClick={() => {
                setActiveCharId(null);
                setActiveTab("library");
              }}
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-lg shrink-0">
                {activeSession.groupAvatar?.startsWith('http') || activeSession.groupAvatar?.startsWith('data:') ? (
                  <img src={activeSession.groupAvatar} alt={activeSession.groupName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  activeSession.groupAvatar || '💬'
                )}
              </div>
              <div className="text-left">
                <h3 className=" font-bold text-sm text-neutral-950 truncate max-w-[160px]">{activeSession.groupName}</h3>
                <span className="text-[10px] text-neutral-400 font-mono block">{activeSession.memberIds?.length || 0}位群成员</span>
              </div>
            </div>

            <button
              onClick={() => setShowGroupSettingsModal(true)}
              className="p-1 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-all"
              title="群聊设置"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="chat-messages p-4 space-y-4 bg-neutral-50/50 min-h-0">
            {activeSession.messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              
              if (msg.isRecalled) {
                return (
                  <div key={msg.id || idx} className="w-full flex justify-center my-1.5 animate-fade-in select-none">
                    <span className="text-[10px] text-neutral-400  bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200/30">
                      {isUser ? (
                        <>
                          你撤回了一条消息{" "}
                          <button
                            onClick={() => {
                              setInputText(msg.content);
                              setPendingResendRecallId(msg.id);
                            }}
                            className="text-blue-500 hover:text-blue-600 font-medium ml-1 cursor-pointer focus:outline-none underline"
                          >
                            [重新编辑]
                          </button>
                        </>
                      ) : (
                        `${msg.senderName || "成员"}撤回了一条消息`
                      )}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id || idx} className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  {!isUser && (
                    <div className="shrink-0">
                      <CharacterAvatar 
                        character={characters.find(c => c.id === (msg.senderId || activeSession.characterId))} 
                        avatar={msg.senderAvatar} 
                        name={msg.senderName || "成员"} 
                        mode="chat" 
                        size={36} 
                        className="rounded-xl shadow-sm mt-0.5" 
                      />
                    </div>
                  )}
                  <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
                    {!isUser && (
                      <span className="text-[11px] font-bold text-neutral-500 mb-1 ml-1 ">{msg.senderName || "群成员"}</span>
                    )}
                    <div
                      onMouseDown={() => handleMouseDown(msg)}
                      onMouseUp={handleMouseUp}
                      onTouchStart={() => handleTouchStart(msg)}
                      onTouchEnd={handleTouchEnd}
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                      onDoubleClick={() => handleDoubleClick(msg)}
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed  shadow-sm select-text cursor-pointer active:scale-[0.99] transition-all relative ${
                        isUser
                          ? "bg-black text-white rounded-tr-xs"
                          : "bg-white text-neutral-900 border border-neutral-200/60 rounded-tl-xs"
                      }`}
                      title="长按、右键或双击此消息可唤出操作菜单"
                    >
                      {/* Quoted item block (inside bubble) in group chat */}
                      {msg.quotedMsg && (
                        <div className="mb-1.5 p-2 bg-neutral-100/80 border-l-2 border-neutral-400 rounded text-[10px] text-neutral-600  truncate max-w-full text-left">
                          <span className="font-bold block text-[9px] uppercase tracking-wider text-neutral-400 mb-0.5">
                            引用:
                          </span>
                          {msg.quotedMsg.content}
                        </div>
                      )}

                      <div className="whitespace-pre-wrap break-words text-left">
                        {renderMessageContent(msg.content, msg)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Panel for plus menu */}
          {showGroupPlusMenu && (
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center gap-4 transition-all">
              <button
                onClick={handleSendGroupVoiceMessage}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-neutral-100 active:scale-95 transition-all text-neutral-600"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200/60 flex items-center justify-center text-xl shadow-sm">
                  🎙️
                </div>
                <span className="text-[10px] text-neutral-500 font-medium">语音消息</span>
              </button>
            </div>
          )}

          {/* Quoted Message thumbnail preview above input area */}
          {quotedMsgState && (
            <div className="mx-3 mb-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center text-[11px] text-neutral-500  animate-fade-in shrink-0">
              <div className="flex-1 truncate pr-3">
                <span className="font-bold text-[9px] uppercase tracking-wider text-neutral-400 block">引用消息 (QUOTING)</span>
                <span className="truncate block italic text-left">
                  {quotedMsgState.role === "user" ? "你" : quotedMsgState.senderName || "成员"}: {quotedMsgState.content}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuotedMsgState(null)}
                className="p-1 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-full shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendGroupMessage(); }} 
            className="chat-input-area border-t border-neutral-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
            style={inputAreaStyle}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGroupPlusMenu(!showGroupPlusMenu)}
                className="w-9 h-9 bg-neutral-800 hover:bg-black text-white rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0 font-bold text-lg shadow-sm"
                title="功能面板"
              >
                +
              </button>
              <input
                type="text"
                placeholder={editingMessageId ? "编辑消息..." : "发送群聊消息..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setTimeout(scrollToBottom, 200)}
                disabled={isGenerating}
                className="flex-1 text-xs border border-neutral-200 hover:border-neutral-300 focus:border-neutral-950 px-3.5 py-2.5 rounded-xl bg-neutral-50 focus:bg-white outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isGenerating}
                className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-300 text-neutral-800 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                title="发送用户消息 (仅发送，不生成AI回复)"
              >
                <Send className="w-4 h-4 stroke-[1.75]" />
              </button>
              <button
                type="button"
                onClick={() => handleTriggerGroupAiReply()}
                disabled={isGenerating}
                className="w-10 h-10 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                title="生成群聊回复 (点击生成一轮回复)"
              >
                <div className="w-5 h-5 rounded-full border-[2px] border-white bg-white flex items-center justify-center shadow-sm">
                  <Heart className="w-3 h-3 text-black stroke-[2] fill-none" />
                </div>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- VIEW 2: ACTIVE CHAT ROOM -------------------- */}
      {activeCharId !== null && activeSession && !activeSession.isGroup && (
        <div className="flex-1 flex flex-col h-full bg-white chat-container">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 shrink-0 bg-white z-20">
            <button
              onClick={() => {
                setActiveCharId(null);
                setActiveTab("library");
              }}
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Active Character Profile Header */}
            <div 
              onClick={() => {
                if (activeChar.id !== 'char-preset-fafa') {
                  setShowProfileModal(true);
                }
              }}
              className={`flex items-center gap-1.5 min-w-0 text-center flex-col transition-all ${activeChar.id === 'char-preset-fafa' ? '' : 'cursor-pointer hover:opacity-85 active:scale-[0.98]'}`}
              title={activeChar.id === 'char-preset-fafa' ? "" : "点击窥听角色此刻的内心心声"}
            >
              {(() => {
                const osParsed = parseOS(activeSession?.currentOS);
                return (
                  <>
                    <div className="flex items-center gap-1.5 justify-center">
                      {activeChar.chatAvatar ? (
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-200/50 shrink-0">
                          <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <span className="text-lg">{activeChar.avatar}</span>
                      )}
                      <span className=" font-bold text-sm text-neutral-950 truncate max-w-[200px]">
                        {activeChar.isSubAccount && activeChar.isBusted 
                          ? `已揭穿 · ${activeChar.parentCharacterName} 的小号` 
                          : activeChar.name}
                      </span>
                      {/* Character mood display */}
                      <span className="text-[12px] text-[#888]  inline-flex items-center gap-1 shrink-0 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200/20 shadow-sm">
                        {osParsed.icon ? (
                          <img src={osParsed.icon} alt={osParsed.emotion} className="w-4 h-4 object-contain shrink-0 bg-transparent" style={{ background: 'transparent', backgroundColor: 'transparent' }} referrerPolicy="no-referrer" />
                        ) : (
                          <span>{osParsed.emoji}</span>
                        )}
                        <span>{osParsed.emotion}</span>
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Settings Hamburger Menu */}
            {activeChar.id !== 'char-preset-fafa' ? (
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-neutral-500 hover:text-black rounded-lg hover:bg-neutral-50 active:scale-95 transition-all"
                title="聊天设置"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-8" />
            )}
          </div>

          {/* Sub-account Busted Banner */}
          {activeChar.isSubAccount && activeChar.isBusted && (
            <div className="bg-amber-50/90 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 shrink-0 select-none animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate font-medium">已揭穿此小号真实身份（大号: <b className="font-bold text-amber-900">{activeChar.parentCharacterName || "未知"}</b>）</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const parentId = activeChar.parentCharacterId;
                    if (parentId) {
                      handleSelectChar(parentId);
                    }
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold transition-all text-[10px]"
                >
                  切换回大号
                </button>
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div 
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 bg-neutral-50/50 transition-all duration-150 chat-messages"
            style={{ 
              scrollBehavior: "smooth"
            }}
          >
            {activeSession.messages.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white border border-neutral-200/60 shadow-sm flex items-center justify-center mx-auto overflow-hidden text-3xl shrink-0">
                  {activeChar.chatAvatar ? (
                    <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    activeChar.avatar
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm  font-bold text-neutral-800">
                    与 {activeChar.name} 的对话
                  </p>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto px-6 leading-relaxed">
                    发送一条消息，开始沉浸式的对话吧。如果触发了“世界书”里的设定词，AI 会自动加载特定背景设定哦！
                  </p>
                </div>
              </div>
            ) : (
              activeSession.messages.map((msg, idx) => {
                const isBot = msg.role === "assistant";
                
                // Render Recalled message differently
                if (msg.isRecalled) {
                  return (
                    <div key={msg.id} className="w-full flex justify-center my-1.5 animate-fade-in select-none">
                      <span className="text-[10px] text-neutral-400  bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200/30">
                        你撤回了一条消息{" "}
                        <button
                          onClick={() => {
                            setInputText(msg.content);
                            setPendingResendRecallId(msg.id);
                          }}
                          className="text-blue-500 hover:text-blue-600 font-medium ml-1 cursor-pointer focus:outline-none underline"
                        >
                          [重新编辑]
                        </button>
                      </span>
                    </div>
                  );
                }

                // Consecutive message grouping rule (< 3 seconds / 3000ms)
                let prevMsg: Message | null = null;
                for (let i = idx - 1; i >= 0; i--) {
                  if (!activeSession.messages[i].isRecalled) {
                    prevMsg = activeSession.messages[i];
                    break;
                  }
                }

                const isSameSender = prevMsg && prevMsg.role === msg.role;
                const timeDiff = prevMsg ? msg.timestamp - prevMsg.timestamp : Infinity;
                const showAvatar = !isSameSender || timeDiff >= 3000;

                let currentUserAvatar = userAvatar;
                let currentUserName = "我";
                if (activeChar && activeChar.userPersonaId) {
                  const persona = userPersonas.find(p => p.id === activeChar.userPersonaId);
                  if (persona) {
                    currentUserAvatar = persona.avatar;
                    currentUserName = persona.name;
                  }
                }

                const botAvatarNode = isBot ? (
                  <div className="w-[36px] h-[36px] rounded-full bg-[#E5E0D8] text-neutral-800 flex items-center justify-center text-sm overflow-hidden shrink-0 shadow-sm">
                    {activeChar?.chatAvatar ? (
                      <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      activeChar?.avatar || activeChar?.name?.charAt(0) || "🤖"
                    )}
                  </div>
                ) : null;

                const userAvatarNode = !isBot ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[36px] h-[36px] rounded-full bg-[#2C2C2E] text-white flex items-center justify-center text-sm overflow-hidden shrink-0 shadow-sm">
                      {currentUserAvatar && currentUserAvatar.length > 5 ? (
                        <img src={currentUserAvatar} alt={currentUserName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        currentUserAvatar || "👤"
                      )}
                    </div>
                    {/* Optionally display name if they explicitly requested it */}
                    <span className="text-[9px] text-neutral-400  truncate max-w-[48px]">{currentUserName}</span>
                  </div>
                ) : null;

                interface MessageSegment {
                  type: "action" | "speech";
                  text: string;
                }

                const parseMessageSegments = (content: string): MessageSegment[] => {
                  if (!content) return [];
                  if (msg.role === "user") {
                    return [{ type: "speech", text: content }];
                  }

                  const isSpecial =
                    content.startsWith("[CHARACTER_TRANSFER]") ||
                    content.startsWith("[TRANSFER]") ||
                    content.startsWith("[LOCATION]") ||
                    content.startsWith("[REDPACKET]") ||
                    content.startsWith("[OFFLINE_INVITATION]") ||
                    content.startsWith("[OFFLINE_MEET_SESSION]") ||
                    content.startsWith("[图片：") ||
                    content.startsWith("[图片:");

                  if (isSpecial) {
                    return [{ type: "speech", text: content }];
                  }

                  // Action delimiters regex: *...*, （...）, (...), [...], [...] (excluding special commands)
                  const actionRegex = /(\*[^*]+\*|（[^）]+）|\([^)]+\)|【[^】]+】|\[(?!(?:CHARACTER_TRANSFER|TRANSFER|LOCATION|REDPACKET|OFFLINE_INVITATION|OFFLINE_MEET_SESSION|图片[：:]))[^\]]+\])/g;

                  // In ONLINE chat mode, action descriptions are forbidden. Strip action brackets and render as pure speech bubble.
                  if (chatMode === "online") {
                    const cleanText = content.replace(actionRegex, (match) => {
                      if (match.startsWith("(") && match.endsWith(")")) {
                        const inner = match.slice(1, -1);
                        if (isKaomojiOrNotAction(inner)) return match;
                      }
                      return "";
                    }).trim();
                    return [{ type: "speech", text: cleanText || content }];
                  }

                  // In OFFLINE meet mode, parse narration/action blocks separately from speech
                  const rawParts = content.split(actionRegex);
                  const initialSegments: MessageSegment[] = [];

                  rawParts.forEach((p) => {
                    if (!p) return;
                    const trimmedP = p.trim();
                    if (!trimmedP) return;

                    let isAction =
                      (trimmedP.startsWith("*") && trimmedP.endsWith("*")) ||
                      (trimmedP.startsWith("（") && trimmedP.endsWith("）")) ||
                      (trimmedP.startsWith("(") && trimmedP.endsWith(")")) ||
                      (trimmedP.startsWith("【") && trimmedP.endsWith("】")) ||
                      (trimmedP.startsWith("[") && trimmedP.endsWith("]"));

                    if (isAction && trimmedP.startsWith("(") && trimmedP.endsWith(")")) {
                      const inner = trimmedP.slice(1, -1);
                      if (isKaomojiOrNotAction(inner)) {
                        isAction = false;
                      }
                    }

                    if (isAction) {
                      const raw = trimmedP.slice(1, -1).trim();
                      if (raw) {
                        initialSegments.push({ type: "action", text: raw });
                      }
                    } else {
                      let raw = trimmedP;
                      // Strip outer quotes if wrapping speech
                      if ((raw.startsWith("“") && raw.endsWith("”")) || (raw.startsWith('"') && raw.endsWith('"'))) {
                        raw = raw.slice(1, -1).trim();
                      }
                      // Clean residual action brackets if any
                      raw = raw.replace(/^[*（(【\[]+|[*）)】\]]+$/g, "").trim();

                      if (raw) {
                        initialSegments.push({ type: "speech", text: raw });
                      }
                    }
                  });

                  // Merge adjacent action segments
                  const segments: MessageSegment[] = [];
                  initialSegments.forEach((seg) => {
                    if (seg.type === "action" && segments.length > 0 && segments[segments.length - 1].type === "action") {
                      segments[segments.length - 1].text += "，" + seg.text;
                    } else {
                      segments.push({ ...seg });
                    }
                  });

                  return segments;
                };

                const segments = parseMessageSegments(msg.content);

                return (
                  <div key={msg.id} className="flex flex-col w-full gap-2 my-1">
                    {segments.map((seg, segIdx) => {
                      if (seg.type === "action") {
                        return (
                          <div key={segIdx} className="w-full flex flex-col py-1.5 my-1 animate-fade-in select-none">
                            <div className="w-full h-[1px] bg-[#EFECE8]" />
                            <div className="py-[8px] italic text-[#A8A39A] text-[13px] text-center w-full break-words  leading-relaxed">
                              {seg.text}
                            </div>
                            <div className="w-full h-[1px] bg-[#EFECE8]" />
                          </div>
                        );
                      }

                      return (
                        <div key={segIdx} className={`flex items-center gap-2 ${isBot ? "justify-start" : "justify-end"} animate-fade-in w-full`}>
                          {/* Multi-select Checkbox */}
                          {isMultiSelectMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMsgIds(prev => 
                                  prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]
                                );
                              }}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                selectedMsgIds.includes(msg.id) 
                                  ? "bg-black border-black text-white" 
                                  : "border-neutral-300 bg-white"
                              }`}
                            >
                              {selectedMsgIds.includes(msg.id) && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </button>
                          )}

                          <div className={`flex items-start gap-[10px] ${isBot ? "justify-start" : "justify-end"} flex-1`}>
                            {/* Avatar on Left for Bot */}
                            {isBot && botAvatarNode}

                            {/* Message Container */}
                            <div className={`flex flex-col gap-1 max-w-[82%] ${isBot ? "items-start" : "items-end"}`}>
                              {/* Message Bubble with longpress, mouse, doubleclick and context menu listeners */}
                              <div
                                onMouseDown={() => {
                                  if (isMultiSelectMode) {
                                    setSelectedMsgIds(prev => prev.includes(msg.id) ? prev.filter(id => id !== msg.id) : [...prev, msg.id]);
                                  } else {
                                    handleMouseDown(msg);
                                  }
                                }}
                                onMouseUp={handleMouseUp}
                                onTouchStart={() => {
                                  if (!isMultiSelectMode) handleTouchStart(msg);
                                }}
                                onTouchEnd={handleTouchEnd}
                                onContextMenu={(e) => {
                                  if (isMultiSelectMode) {
                                    e.preventDefault();
                                  } else {
                                    handleContextMenu(e, msg);
                                  }
                                }}
                                onDoubleClick={() => {
                                  if (!isMultiSelectMode) handleDoubleClick(msg);
                                }}
                                className={`px-4 py-3 rounded-2xl text-xs leading-relaxed  shadow-sm select-text cursor-pointer active:scale-[0.99] transition-all relative ${
                                  isBot
                                    ? "bg-white text-neutral-900 border border-neutral-200 rounded-tl-none hover:border-neutral-300"
                                    : "bg-black text-white rounded-tr-none hover:bg-neutral-900"
                                }`}
                                title="长按、右键或双击此消息可唤出操作菜单"
                              >
                                {/* Quoted item block (inside bubble) */}
                                {msg.quotedMsg && segIdx === 0 && (
                                  <div className="mb-1.5 p-2 bg-neutral-100/80 border-l-2 border-neutral-400 rounded text-[10px] text-neutral-600  truncate max-w-full">
                                    <span className="font-bold block text-[9px] uppercase tracking-wider text-neutral-400 mb-0.5">
                                      引用:
                                    </span>
                                    {msg.quotedMsg.content}
                                  </div>
                                )}

                                {renderMessageContent(seg.text, msg)}
                              </div>

                              {/* Meta info / matched lore tags */}
                              <div className="flex items-center gap-1.5 px-1">
                                {isBot && activeChar?.isBlocked && activeChar.blockedAt && msg.timestamp >= activeChar.blockedAt && <span className="text-[10px] text-black font-bold">!</span>}
                                <span className="text-[8px] font-mono text-neutral-400">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Avatar on Right for User */}
                            {!isBot && userAvatarNode}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Blinking Typing indicator */}
            {isGenerating && (
              <div className="flex items-start gap-[10px] justify-start animate-fade-in">
                <div className="w-[36px] h-[36px] rounded-full bg-[#E5E0D8] text-neutral-800 flex items-center justify-center text-xs overflow-hidden shrink-0 shadow-sm">
                  {activeChar?.chatAvatar ? (
                    <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    activeChar?.avatar || activeChar?.name?.charAt(0) || "🤖"
                  )}
                </div>
                <div className="flex flex-col gap-1 items-start">
                  <div className="bg-white border border-neutral-200 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1 shrink-0">
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error banner */}
            {apiError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-700 font-mono break-words leading-normal flex items-start gap-1.5">
                <span className="font-bold shrink-0">API ERROR:</span>
                <span className="flex-1">{apiError}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
          

          {/* Quoted Message thumbnail preview above input area */}
          {quotedMsgState && (
            <div className="mx-3 mb-2 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex justify-between items-center text-[11px] text-neutral-500  animate-fade-in shrink-0">
              <div className="flex-1 truncate pr-3">
                <span className="font-bold text-[9px] uppercase tracking-wider text-neutral-400 block">引用消息 (QUOTING)</span>
                <span className="truncate block italic">
                  {quotedMsgState.role === "user" ? "你" : activeChar.name}: {quotedMsgState.content}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuotedMsgState(null)}
                className="p-1 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-full shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Message input bar or Blocked display */}
          <div className="shrink-0 bg-white z-20">
            {isBlocked ? (
              <div className="p-4 bg-neutral-50 flex flex-col items-center justify-center space-y-2 shrink-0 select-none animate-fade-in">
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    placeholder="你已拉黑该角色"
                    disabled
                    className="flex-1 text-xs border border-neutral-200 px-3.5 py-2.5 rounded-xl bg-neutral-100 text-neutral-400 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleTriggerAiReply()}
                    disabled={isGenerating}
                    className="w-10 h-10 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                    title="生成AI回复"
                  >
                    <div className="w-5 h-5 rounded-full border-[2px] border-white bg-white flex items-center justify-center shadow-sm">
                      <Heart className="w-3 h-3 text-black stroke-[2] fill-none" />
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBlocked(false);
                    saveSettings({ isBlocked: false });
                    if (activeCharacter) {
                      onUpdateCharacter({ ...activeCharacter, isBlocked: false, blockedAt: undefined });
                    }
                  }}
                  className="text-[10px]  font-bold text-neutral-400 underline"
                >
                  解除拉黑
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Action Panel (Slide up from bottom ~40%) */}
                {showActionPanel && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-t-[20px] shadow-2xl border border-neutral-100 z-30 p-5 animate-slide-up flex flex-col max-h-[45vh]">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
                      <span className=" font-bold text-sm text-neutral-900">功能</span>
                      <button
                        type="button"
                        onClick={() => setShowActionPanel(false)}
                        className="p-1 text-neutral-400 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4 overflow-y-auto py-2">
                      {/* 1. 语音 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveCall("voice");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Phone className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">语音</span>
                      </button>

                      {/* 2. 视频 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveCall("video");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Video className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">视频</span>
                      </button>

                      {/* 3. 线下见面 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          if (!activeSession || activeSession.isGroup) return;
                          // Check if there is already an active meet session
                          const hasActiveMeet = activeSession.messages.some(
                            (m) => m.role === "system" && m.content.startsWith("[OFFLINE_MEET_SESSION]") && m.content.includes("status=active")
                          );
                          if (hasActiveMeet) {
                            alert("当前已有正在进行的线下见面。");
                            return;
                          }
                          const msgId = `msg-${Date.now()}-system`;
                          const sysMsg: Message = {
                            id: msgId,
                            role: "system",
                            content: `[OFFLINE_MEET_SESSION]id=${msgId}|status=active`,
                            timestamp: Date.now(),
                          };
                          onUpdateSessionMessages(activeCharId!, [...activeSession.messages, sysMsg]);
                          setTimeout(scrollToBottom, 100);
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-purple-100 group-hover:bg-purple-900 group-hover:text-white text-purple-800 flex items-center justify-center transition-all shadow-sm">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  font-medium text-neutral-700">线下见面</span>
                      </button>

                      {/* 4. 转账 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("transfer");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">转账</span>
                      </button>

                      {/* 4. 位置 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("location");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">位置</span>
                      </button>

                      {/* 5. 红包 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          setActiveModal("redpacket");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-neutral-100 group-hover:bg-neutral-900 group-hover:text-white text-neutral-800 flex items-center justify-center transition-all shadow-sm">
                          <Gift className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">红包</span>
                      </button>

                      {/* 6. 发照片 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          handleTriggerAiAction("photo");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-all shadow-sm">
                          <Image className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">发照片</span>
                      </button>

                      {/* 7. 发邀请 */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionPanel(false);
                          handleTriggerAiAction("invitation");
                        }}
                        className="flex flex-col items-center gap-1.5 active:scale-95 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-full bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center transition-all shadow-sm">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-[11px]  text-neutral-600">发邀请</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Multi-select Bottom Bar */}
                {isMultiSelectMode ? (
                  <div className="bg-white border-t border-neutral-200 p-4 shadow-2xl z-40 flex items-center justify-between animate-slide-up shrink-0">
                    <span className="text-xs font-bold text-neutral-800">
                      已选择 <span className="text-black font-extrabold">{selectedMsgIds.length}</span> 条消息
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMultiSelectMode(false);
                          setSelectedMsgIds([]);
                        }}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-all"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMsgIds.length === 0) {
                            alert("请先勾选要删除的消息");
                            return;
                          }
                          setConfirmDialog({
                            title: "删除消息",
                            message: `确定要删除选中的 ${selectedMsgIds.length} 条消息吗？`,
                            onConfirm: () => {
                              if (activeSession) {
                                const updated = activeSession.messages.filter(m => !selectedMsgIds.includes(m.id));
                                if (activeSession.isGroup) {
                                  onUpdateSessionMessages(activeSession.id, updated, undefined, {
                                    groupName: activeSession.groupName,
                                    groupAvatar: activeSession.groupAvatar,
                                    memberIds: activeSession.memberIds,
                                    syncMemory: activeSession.syncMemory,
                                    worldSetting: activeSession.worldSetting,
                                    isGroup: true,
                                  });
                                } else {
                                  onUpdateSessionMessages(activeCharId!, updated);
                                }
                              }
                              setIsMultiSelectMode(false);
                              setSelectedMsgIds([]);
                              setConfirmDialog(null);
                            }
                          });
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                      >
                        删除 ({selectedMsgIds.length})
                      </button>
                    </div>
                  </div>
                ) : (
                  <form 
                    onSubmit={handleSendMessage} 
                    className="chat-input-area border-t border-neutral-100 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
                    style={inputAreaStyle}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowActionPanel(!showActionPanel)}
                        className="w-9 h-9 bg-neutral-800 hover:bg-black text-white rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0 font-bold text-lg shadow-sm"
                        title="功能面板"
                      >
                        +
                      </button>
                      <input
                        type="text"
                        placeholder={isGenerating ? "生成中..." : "输入消息..."}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onFocus={() => setTimeout(scrollToBottom, 200)}
                        disabled={isGenerating}
                        className="flex-1 text-xs border border-neutral-200 hover:border-neutral-300 focus:border-neutral-950 px-3.5 py-2.5 rounded-xl bg-neutral-50 focus:bg-white outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!inputText.trim() || isGenerating}
                        className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-300 text-neutral-800 rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                        title="发送用户消息 (仅发送，不生成AI回复)"
                      >
                        <Send className="w-4 h-4 stroke-[1.75]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTriggerAiReply()}
                        disabled={isGenerating}
                        className="w-10 h-10 bg-black hover:bg-neutral-800 disabled:bg-neutral-100 disabled:text-neutral-300 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0 animate-fade-in"
                        title="生成AI回复 (点击生成一轮回复)"
                      >
                        <div className="w-5 h-5 rounded-full border-[2px] border-white bg-white flex items-center justify-center shadow-sm">
                          <Heart className="w-3 h-3 text-black stroke-[2] fill-none" />
                        </div>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Voice / Video Call Overlay */}
      {activeCall && activeChar && (
        <div className="fixed inset-0 bg-neutral-950 text-white z-50 flex flex-col items-center justify-between p-8 animate-fade-in select-none">
          <div className="flex flex-col items-center pt-16 space-y-4">
            <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-4xl overflow-hidden shadow-2xl animate-pulse">
              {activeChar.chatAvatar ? (
                <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                activeChar.avatar || "🤖"
              )}
            </div>
            <div className="text-center space-y-1">
              <h3 className=" font-bold text-lg text-white">{activeChar.name}</h3>
              <p className="text-xs text-neutral-400 font-mono">
                {activeCall === "voice" ? "正在呼叫..." : "正在连接视频..."}
              </p>
            </div>
          </div>
          <div className="pb-12">
            <button
              onClick={() => setActiveCall(null)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full py-3 px-12 text-sm font-bold shadow-2xl active:scale-95 transition-all flex items-center gap-2"
            >
              <span>挂断</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals for Transfer, Location, Red Packet, Games */}
      {activeModal === "transfer" && activeChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className=" font-bold text-sm text-neutral-900">向 {activeChar.name} 转账</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">转账金额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full text-base font-mono border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">转账备注 (选填)</label>
                <input
                  type="text"
                  placeholder="给你的零花钱"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  确认转账
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "location" && activeChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className=" font-bold text-sm text-neutral-900">发送位置</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">地点名称</label>
                <input
                  type="text"
                  placeholder="例如：重庆市南岸区南滨路"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "redpacket" && activeChar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-xs p-5 space-y-4 shadow-2xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className=" font-bold text-sm text-neutral-900">发红包给 {activeChar.name}</span>
              <button onClick={() => setActiveModal(null)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">红包金额 (元)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={redpacketAmount}
                  onChange={(e) => setRedpacketAmount(e.target.value)}
                  className="w-full text-base font-mono border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-mono font-bold text-neutral-500 uppercase block mb-1">祝福语</label>
                <input
                  type="text"
                  placeholder="恭喜发财，大吉大利"
                  value={redpacketBlessing}
                  onChange={(e) => setRedpacketBlessing(e.target.value)}
                  className="w-full text-xs border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-neutral-50 outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedPacket}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  塞钱进红包
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 1: FULLSCREEN RIGHT-TO-LEFT SETTINGS DRAWER -------------------- */}
      {showSettings && activeChar && (
        <div className="fixed inset-0 bg-white z-40 flex flex-col animate-slide-left select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 shrink-0">
            <button 
              onClick={() => setShowSettings(false)}
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-mono font-bold text-sm tracking-widest text-neutral-950 uppercase">聊天设置 (SETTINGS)</span>
            <div className="w-7 h-7" /> {/* spacer */}
          </div>

          {/* Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
            
            {/* 1.5 User Persona Binding */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 bg-white space-y-2">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block ">更改用户设定</span>
                <span className="text-[10px] text-neutral-400 font-mono block">SWITCH USER PERSONA</span>
              </div>
              <select
                value={activeChar.userPersonaId || ""}
                onChange={(e) => {
                  const newPersonaId = e.target.value || undefined;
                  onUpdateCharacter({ ...activeChar, userPersonaId: newPersonaId });
                  saveSettings({ userPersonaId: newPersonaId });
                }}
                className="w-full text-xs border border-neutral-200 px-3 py-2.5 rounded-xl bg-neutral-50 outline-none"
              >
                <option value="">默认 (Default)</option>
                {userPersonas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* 1.6 Chat Wallpaper Customization */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-base font-bold text-neutral-900 block">聊天壁纸</span>
                  <span className="text-[10px] text-neutral-400 font-mono block">CHAT WALLPAPER</span>
                </div>
                {currentChatWallpaper && (
                  <button
                    onClick={() => {
                      setCurrentChatWallpaper(null);
                      localStorage.removeItem(`chat_current_wallpaper_${activeCharId}`);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50"
                  >
                    取消壁纸
                  </button>
                )}
              </div>

              {/* Wallpaper Grid */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {chatWallpapers.map((wp, idx) => (
                  <div 
                    key={idx} 
                    className={`relative w-[60px] h-[60px] rounded-xl overflow-hidden border-2 cursor-pointer group transition-all ${
                      currentChatWallpaper === wp ? "border-black shadow-md scale-105" : "border-neutral-200 hover:border-neutral-400"
                    }`}
                    onClick={() => {
                      setCurrentChatWallpaper(wp);
                      localStorage.setItem(`chat_current_wallpaper_${activeCharId}`, wp);
                    }}
                  >
                    <img src={wp} alt={`wallpaper-${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const updated = chatWallpapers.filter((_, i) => i !== idx);
                        setChatWallpapers(updated);
                        localStorage.setItem(`chat_wallpapers_${activeCharId}`, JSON.stringify(updated));
                        if (currentChatWallpaper === wp) {
                          setCurrentChatWallpaper(null);
                          localStorage.removeItem(`chat_current_wallpaper_${activeCharId}`);
                        }
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除壁纸"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="w-[60px] h-[60px] rounded-xl border-2 border-dashed border-neutral-300 hover:border-neutral-400 bg-neutral-50 flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-neutral-600 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const dataUrl = await compressImage(file, 300);
                        const updated = [...chatWallpapers, dataUrl];
                        setChatWallpapers(updated);
                        localStorage.setItem(`chat_wallpapers_${activeCharId}`, JSON.stringify(updated));
                        if (!currentChatWallpaper) {
                          setCurrentChatWallpaper(dataUrl);
                          localStorage.setItem(`chat_current_wallpaper_${activeCharId}`, dataUrl);
                        }
                        e.target.value = "";
                      }
                    }}
                  />
                  <span className="text-xl">+</span>
                  <span className="text-[10px] font-mono">上传</span>
                </label>
              </div>
            </div>

            {/* 2. Reply Count (回复条数) */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block ">回复条数范围</span>
                <span className="text-[10px] text-neutral-400 font-mono block">REPLY COUNT RANGE</span>
              </div>
              <div className="flex items-center gap-2 ">
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={minRepliesInput}
                  onChange={(e) => {
                    const text = e.target.value;
                    setMinRepliesInput(text);
                    if (text === "") return;
                    const val = parseInt(text);
                    if (!isNaN(val)) {
                      const clamped = Math.max(1, Math.min(24, val));
                      let newMax = maxReplies;
                      if (clamped >= newMax) {
                        newMax = Math.min(25, clamped + 1);
                        setMaxReplies(newMax);
                        setMaxRepliesInput(newMax.toString());
                      }
                      setMinReplies(clamped);
                      saveSettings({ minReplies: clamped, maxReplies: newMax });
                    }
                  }}
                  onBlur={() => {
                    if (minRepliesInput === "" || isNaN(parseInt(minRepliesInput))) {
                      setMinRepliesInput(minReplies.toString());
                    } else {
                      const val = parseInt(minRepliesInput);
                      const clamped = Math.max(1, Math.min(24, val));
                      let newMax = maxReplies;
                      if (clamped >= newMax) {
                        newMax = Math.min(25, clamped + 1);
                        setMaxReplies(newMax);
                        setMaxRepliesInput(newMax.toString());
                      }
                      setMinReplies(clamped);
                      setMinRepliesInput(clamped.toString());
                      saveSettings({ minReplies: clamped, maxReplies: newMax });
                    }
                  }}
                  className="w-12 text-center text-xs border border-neutral-200 px-2 py-1.5 rounded-lg bg-neutral-50 focus:bg-white outline-none"
                />
                <span className="text-xs text-neutral-400">至</span>
                <input
                  type="number"
                  min="2"
                  max="25"
                  value={maxRepliesInput}
                  onChange={(e) => {
                    const text = e.target.value;
                    setMaxRepliesInput(text);
                    if (text === "") return;
                    const val = parseInt(text);
                    if (!isNaN(val)) {
                      const clamped = Math.max(2, Math.min(25, val));
                      let newMin = minReplies;
                      if (clamped <= newMin) {
                        newMin = Math.max(1, clamped - 1);
                        setMinReplies(newMin);
                        setMinRepliesInput(newMin.toString());
                      }
                      setMaxReplies(clamped);
                      saveSettings({ minReplies: newMin, maxReplies: clamped });
                    }
                  }}
                  onBlur={() => {
                    if (maxRepliesInput === "" || isNaN(parseInt(maxRepliesInput))) {
                      setMaxRepliesInput(maxReplies.toString());
                    } else {
                      const val = parseInt(maxRepliesInput);
                      const clamped = Math.max(2, Math.min(25, val));
                      let newMin = minReplies;
                      if (clamped <= newMin) {
                        newMin = Math.max(1, clamped - 1);
                        setMinReplies(newMin);
                        setMinRepliesInput(newMin.toString());
                      }
                      setMaxReplies(clamped);
                      setMaxRepliesInput(clamped.toString());
                      saveSettings({ minReplies: newMin, maxReplies: clamped });
                    }
                  }}
                  className="w-12 text-center text-xs border border-neutral-200 px-2 py-1.5 rounded-lg bg-neutral-50 focus:bg-white outline-none"
                />
              </div>
            </div>

            {/* 3. Allow Character Active Messaging */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 space-y-4 bg-white">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-base font-bold text-neutral-900 block ">允许角色主动发消息</span>
                  <span className="text-[10px] text-neutral-400 font-mono block">ACTIVE MESSAGING</span>
                </div>
                {/* Slide Switch Capsule */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = !activeMessaging;
                    setActiveMessaging(updated);
                    saveSettings({ activeMessaging: updated });
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none ${
                    activeMessaging ? "bg-black" : "bg-neutral-300"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${
                    activeMessaging ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {activeMessaging && (
                <div className="pt-3 border-t border-neutral-100 space-y-3 animate-fade-in ">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-medium">离线触发延迟：</span>
                    <select
                      value={activeMessagingDelay}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setActiveMessagingDelay(val);
                        saveSettings({ activeMessagingDelay: val });
                      }}
                      className="border border-neutral-200 bg-neutral-50 hover:border-neutral-300 rounded-lg px-2 py-1.5 outline-none text-xs font-semibold text-neutral-800 transition-colors cursor-pointer"
                    >
                      <option value="0.003">10 秒 (系统测试用)</option>
                      <option value="1">1 小时 (1 Hour)</option>
                      <option value="3">3 小时 (3 Hours)</option>
                      <option value="8">8 小时 (8 Hours)</option>
                      <option value="12">12 小时 (12 Hours)</option>
                      <option value="24">24 小时 (24 Hours)</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    * 开启后，当你离开该 App 达到设定时长时，角色会根据其人设、当时的心情主动给你发来关怀想念、吐槽生活或分享日常趣事等破冰消息。
                  </p>
                  
                  {/* Test Simulation Button */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeSession || !activeCharId) return;
                      setShowSettings(false);
                      await handleTriggerActiveMessage(activeMessagingDelay);
                    }}
                    className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-neutral-200/50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                    <span>立即模拟离开并触发主动消息</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Time Perception */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5 pr-2">
                <span className="text-base font-bold text-neutral-900 block ">时间感知</span>
                <span className="text-[10px] text-neutral-400 font-mono block">TIME PERCEPTION</span>
                <p className="text-[11px] text-neutral-400  mt-0.5 leading-relaxed">
                  开启后，角色能够清楚知道当前时间，并感知用户离开聊天的时间长度，在回复中自然体现。
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const updated = !timePerception;
                  setTimePerception(updated);
                  saveSettings({ timePerception: updated });
                }}
                className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                  timePerception ? "bg-black" : "bg-neutral-300"
                }`}
              >
                <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${
                  timePerception ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>

            {/* 5. Delete All Chat History (Renamed from Reset Conversation) */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block ">删除所有聊天记录</span>
                <span className="text-[10px] text-neutral-400 font-mono block">DELETE ALL CHAT HISTORY</span>
              </div>
              <button
                onClick={handleResetConversation}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200/40 text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors"
              >
                删除记录
              </button>
            </div>

            {/* 6. Block Character (Moved to the very bottom) */}
            <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
              <div className="space-y-0.5">
                <span className="text-base font-bold text-neutral-900 block ">拉黑该角色</span>
                <span className="text-[10px] text-neutral-400 font-mono block">BLOCK CHARACTER</span>
              </div>
              <button
                onClick={() => {
                  if (activeCharacter) {
                    onUpdateCharacter({ ...activeCharacter, isBlocked: !activeCharacter.isBlocked });
                    setIsBlocked(!isBlocked);
                    saveSettings({ isBlocked: !isBlocked });
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200/80 hover:bg-neutral-50 transition-colors text-neutral-600"
              >
                {isBlocked ? "解除拉黑" : "拉黑该角色"}
              </button>
            </div>

            {/* 7. Export Conversation */}
            <div className="flex justify-center pt-8 pb-4">
              <button
                onClick={handleExportChat}
                className="text-xs text-neutral-400 hover:text-neutral-600 underline "
              >
                导出聊天记录 (.txt)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 2: FROSTED GLASS BOTTOM DRAWER FOR MESSAGE OPTIONS -------------------- */}
      {showBottomSheet && activeMessage && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-all flex items-end justify-center select-none"
          onClick={() => setShowBottomSheet(false)}
        >
          <div 
            className="w-full max-w-md bg-white/85 backdrop-blur-xl border-t border-neutral-200/50 rounded-t-3xl p-6 pb-8 space-y-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pull Handle bar */}
            <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto animate-pulse" />
            
            {/* Title */}
            <div className="text-center space-y-1 px-4">
              <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest font-bold">消息操作 (MESSAGE OPTIONS)</p>
              <p className="text-xs text-neutral-500  truncate">"{activeMessage.content}"</p>
            </div>

            {/* Grid container with actions */}
            <div className={`grid gap-2 pt-2 ${activeMessage.role === "user" ? "grid-cols-6" : "grid-cols-5"}`}>
              
              {/* Action: Multi-select */}
              <button
                onClick={() => {
                  setIsMultiSelectMode(true);
                  setSelectedMsgIds(activeMessage ? [activeMessage.id] : []);
                  setShowBottomSheet(false);
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <CheckSquare className="w-4.5 h-4.5 stroke-[1.5]" />
                </div>
                <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">多选</span>
              </button>
              
              {/* Action 1: Delete */}
              <button
                onClick={() => {
                  if (activeSession) {
                    const updated = activeSession.messages.filter((m) => m.id !== activeMessage.id);
                    if (activeSession.isGroup) {
                      onUpdateSessionMessages(activeSession.id, updated, undefined, {
                        groupName: activeSession.groupName,
                        groupAvatar: activeSession.groupAvatar,
                        memberIds: activeSession.memberIds,
                        syncMemory: activeSession.syncMemory,
                        worldSetting: activeSession.worldSetting,
                        isGroup: true,
                      });
                    } else {
                      onUpdateSessionMessages(activeCharId!, updated);
                    }
                    setShowBottomSheet(false);
                  }
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <Trash2 className="w-4.5 h-4.5 stroke-[1.5]" />
                </div>
                <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">删除</span>
              </button>

              {/* Action 2: Recall (User only) */}
              {activeMessage.role === "user" && (
                <button
                  onClick={() => {
                    if (activeSession) {
                      const updated = activeSession.messages.map((m) => {
                        if (m.id === activeMessage.id) {
                          return { ...m, isRecalled: true };
                        }
                        return m;
                      });
                      if (activeSession.isGroup) {
                        onUpdateSessionMessages(activeSession.id, updated, undefined, {
                          groupName: activeSession.groupName,
                          groupAvatar: activeSession.groupAvatar,
                          memberIds: activeSession.memberIds,
                          syncMemory: activeSession.syncMemory,
                          worldSetting: activeSession.worldSetting,
                          isGroup: true,
                        });
                      } else {
                        onUpdateSessionMessages(activeCharId!, updated);
                      }
                      setShowBottomSheet(false);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                    <CornerUpLeft className="w-4.5 h-4.5 stroke-[1.5]" />
                  </div>
                  <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">撤回</span>
                </button>
              )}

              {/* Action 3: Quote */}
              <button
                onClick={() => {
                  setQuotedMsgState(activeMessage);
                  setShowBottomSheet(false);
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <Quote className="w-4.5 h-4.5 stroke-[1.5]" />
                </div>
                <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">引用</span>
              </button>

              {/* Action 4: Edit (for user) / Reroll (for assistant) */}
              {activeMessage.role === "user" ? (
                <button
                  onClick={() => {
                    setInputText(activeMessage.content);
                    setEditingMessageId(activeMessage.id);
                    setShowBottomSheet(false);
                  }}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                    <Edit className="w-4.5 h-4.5 stroke-[1.5]" />
                  </div>
                  <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">编辑</span>
                </button>
              ) : (
                <button
                  onClick={handleReroll}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none animate-fade-in"
                >
                  <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                    <Dices className="w-4.5 h-4.5 stroke-[1.5]" />
                  </div>
                  <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">重说</span>
                </button>
              )}

              {/* Action 5: Copy */}
              <button
                onClick={() => {
                  handleCopyContent(activeMessage.content);
                }}
                className="flex flex-col items-center gap-1.5 group focus:outline-none"
              >
                <div className="w-11 h-11 rounded-full border border-neutral-200/80 bg-white/50 flex items-center justify-center text-neutral-600 group-hover:bg-black group-hover:text-white group-hover:border-black active:scale-90 transition-all shadow-sm">
                  <Copy className="w-4.5 h-4.5 stroke-[1.5]" />
                </div>
                <span className="text-[11px]  font-medium text-neutral-500 group-hover:text-neutral-900">复制</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 2: CHARACTER PROFILE & INNER THOUGHT MODAL -------------------- */}
      {showProfileModal && activeChar && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white w-full max-w-[280px] sm:max-w-[300px] rounded-[24px] overflow-hidden shadow-2xl border border-stone-200/80 flex flex-col animate-scale-up">
            
            {/* 1. Top Section: 1:1 Square Portrait/Standee */}
            <div className="relative w-full aspect-square bg-stone-100 shrink-0 overflow-hidden flex items-center justify-center border-b border-stone-100">
              {activeChar.realImage ? (
                <img 
                  src={activeChar.realImage} 
                  alt={activeChar.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-stone-200/50 flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center text-3xl mb-1.5">
                    {activeChar.avatar}
                  </div>
                  <span className="text-[11px]  text-stone-400">真实面貌立绘</span>
                </div>
              )}

              {/* Close Button on Top Right */}
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black text-white flex items-center justify-center text-xs transition-all active:scale-90"
              >
                ✕
              </button>

              {/* 2. Chat Avatar: 28px Circular in bottom-right corner inside image area */}
              <div className="absolute bottom-2.5 right-2.5 w-[28px] h-[28px] rounded-full border-2 border-white shadow-md overflow-hidden bg-stone-100 flex items-center justify-center text-xs shrink-0">
                {activeChar.chatAvatar ? (
                  <img src={activeChar.chatAvatar} alt={activeChar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  activeChar.avatar
                )}
              </div>
            </div>

            {/* Profile Information & Inner Thought Body */}
            <div className="p-4 space-y-3">
              
              {/* Character Name: 14px, Deep Gray, Playfair Display */}
              <div>
                <h2 
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="font-bold text-[14px] text-stone-800 tracking-tight"
                >
                  {activeChar.name}
                </h2>
              </div>

              {/* 3. Character's Current Inner Thought */}
              <div className="bg-stone-50 border border-stone-200/60 p-3 rounded-[12px] space-y-1 shadow-xs">
                <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider block">
                  💭 当前内心心声
                </span>
                <p 
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="text-stone-800 text-xs leading-relaxed whitespace-pre-wrap italic"
                >
                  {parseOS(activeSession?.currentOS).text}
                </p>
              </div>

              {/* 4. Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* View All Inner Thoughts */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setShowAllOsModal(true);
                  }}
                  className="w-full bg-stone-900 hover:bg-black text-white  font-medium text-xs py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>查看所有心声</span>
                  <span className="text-xs">→</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="w-full bg-transparent hover:bg-stone-100 text-stone-500  text-xs py-1.5 rounded-xl transition-all text-center block"
                >
                  关闭
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY TOAST NOTIFICATION -------------------- */}
      {copyToast && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-stone-900/90 text-white text-xs  px-4 py-2 rounded-full shadow-lg z-[100] animate-fade-in flex items-center gap-1.5 backdrop-blur-md border border-stone-800">
          <Check className="w-3.5 h-3.5 text-stone-200 stroke-[2.5]" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* -------------------- OVERLAY 3: CUSTOM IN-APP MONOCHROME CONFIRM DIALOG -------------------- */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in select-none">
          <div className="bg-white w-full max-w-[290px] rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] border border-neutral-100 flex flex-col space-y-4 animate-scale-up">
            <div className="text-center space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900  tracking-wide">
                {confirmDialog.title}
              </h3>
              <p className="text-[11px] text-neutral-500 leading-relaxed ">
                {confirmDialog.message}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setConfirmDialog(null)}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700  font-medium text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="w-full bg-black hover:bg-neutral-900 text-white  font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Persona Management View */}
      {showUserPersonas && (
        <div className="absolute inset-0 bg-neutral-50 z-50 flex flex-col animate-fade-in select-none">
          {/* Header */}
          <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-4 shrink-0 bg-white">
            <button
              onClick={() => {
                setShowUserPersonas(false);
                setIsCreatingPersona(false);
                setEditingPersona(null);
              }}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className=" font-bold text-sm text-neutral-950">
              {isCreatingPersona ? "新建用户设定" : editingPersona ? "编辑用户设定" : "用户设定管理"}
            </span>
            {!isCreatingPersona && !editingPersona ? (
              <button
                onClick={() => {
                  setPersonaName("");
                  setPersonaAvatar("👤");
                  setPersonaDesc("");
                  setPersonaError("");
                  setIsCreatingPersona(true);
                }}
                className="p-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg active:scale-95 transition-all  font-medium text-xs flex items-center gap-1"
                title="创建设定"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8" />
            )}
          </div>

          {/* Form / List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isCreatingPersona || editingPersona ? (
              /* Persona Creation / Edit Form */
              <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-sm space-y-4 animate-fade-in">
                {personaError && (
                  <div className="p-2.5 bg-red-50 border border-red-100 text-[11px] text-red-700 rounded-lg">
                    {personaError}
                  </div>
                )}

                {/* Avatar Selection Zone */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-[72px] h-[72px] rounded-full border border-neutral-200 shadow-md bg-neutral-100 flex items-center justify-center overflow-hidden text-2xl select-none">
                    {personaAvatar && (personaAvatar.startsWith("data:image/") || personaAvatar.startsWith("http")) ? (
                      <img src={personaAvatar} alt="Persona Avatar" className="w-full h-full object-cover" />
                    ) : (
                      personaAvatar || "👤"
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Emoji Input */}
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="👤"
                      value={personaAvatar && personaAvatar.length <= 2 ? personaAvatar : ""}
                      onChange={(e) => setPersonaAvatar(e.target.value.trim() || "👤")}
                      className="w-12 text-center text-sm border border-neutral-200 py-1 rounded-lg bg-white"
                      title="输入Emoji头像"
                    />

                    {/* Image Upload Button */}
                    <label className="px-3 py-1.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800  text-xs rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all">
                      上传图片
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new window.Image();
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              const size = Math.min(img.width, img.height);
                              canvas.width = 120;
                              canvas.height = 120;
                              const ctx = canvas.getContext("2d");
                              if (ctx) {
                                const sx = (img.width - size) / 2;
                                const sy = (img.height - size) / 2;
                                ctx.drawImage(img, sx, sy, size, size, 0, 0, 120, 120);
                                const base64 = canvas.toDataURL("image/jpeg", 0.85);
                                setPersonaAvatar(base64);
                              }
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <span className="text-[10px] text-neutral-400">可输入单个Emoji或上传自定义图片头像</span>
                </div>

                {/* Name Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">设定名称 (Name)</label>
                  <input
                    type="text"
                    placeholder="如: 心理学研究生、我的宿敌"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white"
                  />
                </div>

                {/* Description Textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">
                    人设简介/背景说明 (Introduction)
                  </label>
                  <textarea
                    rows={8}
                    placeholder="请输入对该用户设定的详细描述。你可以写下你的性格、背景故事、与该角色的关系、说话习惯或秘密身世。内容会读取并直接影响 AI 角色的回复风格和回应语气。"
                    value={personaDesc}
                    onChange={(e) => setPersonaDesc(e.target.value)}
                    className="w-full text-xs border border-neutral-200 focus:border-neutral-950 px-3 py-2.5 rounded-xl bg-white resize-none  leading-relaxed"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setIsCreatingPersona(false);
                      setEditingPersona(null);
                    }}
                    className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-700  text-xs rounded-xl transition-all active:scale-95"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSavePersona}
                    className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white  font-bold text-xs rounded-xl transition-all active:scale-95"
                  >
                    保存设定
                  </button>
                </div>
              </div>
            ) : (
              /* User Personas list */
              <div className="space-y-3 animate-fade-in">
                {userPersonas.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-neutral-200/50 shadow-sm text-center space-y-3 py-16">
                    <span className="text-4xl block">👤</span>
                    <h3 className="text-sm  font-bold text-neutral-800">暂无用户设定</h3>
                    <p className="text-xs text-neutral-400 max-w-[200px] mx-auto leading-relaxed">
                      用户设定可用于定义你的人格背景和立场，并在绑定后影响AI角色的对话风格。
                    </p>
                    <button
                      onClick={() => {
                        setPersonaName("");
                        setPersonaAvatar("👤");
                        setPersonaDesc("");
                        setPersonaError("");
                        setIsCreatingPersona(true);
                      }}
                      className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs  font-bold active:scale-95 transition-all inline-block"
                    >
                      立即创建首个设定
                    </button>
                  </div>
                ) : (
                  userPersonas.map((persona) => {
                    const boundChars = characters.filter((c) => c.userPersonaId === persona.id);
                    return (
                      <div
                        key={persona.id}
                        className="bg-white p-4 rounded-2xl border border-neutral-200/50 shadow-sm flex items-start gap-3.5"
                      >
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full border border-neutral-100 bg-neutral-50 flex items-center justify-center overflow-hidden text-xl select-none shrink-0 shadow-xs">
                          {persona.avatar && (persona.avatar.startsWith("data:image/") || persona.avatar.startsWith("http")) ? (
                            <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
                          ) : (
                            persona.avatar || "👤"
                          )}
                        </div>

                        {/* Text info and actions */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className=" font-bold text-xs text-neutral-900 leading-none">
                                {persona.name}
                              </h4>
                              {boundChars.length > 0 && (
                                <span className="text-[9px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full inline-block mt-1 ">
                                  已绑定：{boundChars.map((c) => c.name).join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setEditingPersona(persona);
                                  setPersonaName(persona.name);
                                  setPersonaAvatar(persona.avatar);
                                  setPersonaDesc(persona.description);
                                  setPersonaError("");
                                }}
                                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 transition-colors"
                                title="编辑"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => {
                                  if (confirm("确定要删除此用户设定吗？已绑定此设定的角色将恢复为默认状态。")) {
                                    handleDeletePersona(persona.id);
                                  }
                                }}
                                className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-600 transition-colors"
                                title="删除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-neutral-400  line-clamp-3 leading-relaxed whitespace-pre-wrap">
                            {persona.description}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Detail View */}
      {showWallet && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col animate-fade-in select-none">
          {/* Header */}
          <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-4 shrink-0 bg-white">
            <button
              onClick={() => setShowWallet(false)}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className=" font-bold text-sm text-neutral-950">钱包</span>
            <div className="w-8" />
          </div>

          {/* Balance Section */}
          <div className="py-8 px-6 bg-white border-b border-neutral-100 flex flex-col items-center justify-center shrink-0 space-y-4">
            <div className="flex flex-col items-center justify-center">
              <span className="font-mono font-bold text-[32px] text-neutral-950 tracking-tight">¥{walletBalance.toFixed(2)}</span>
              <span className="text-xs text-neutral-400  mt-2">可用余额</span>
            </div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="w-full py-2.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900  font-medium rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span>💳</span> 充值
            </button>
          </div>

          {/* Transaction List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-neutral-50">
            {walletTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
                <span className="text-3xl">📭</span>
                <span className="text-xs ">暂无交易记录</span>
              </div>
            ) : (
              ["今天", "昨天", "更早"].map((groupName) => {
                const groupTxs = walletTransactions.filter((tx) => {
                  const date = new Date(tx.timestamp);
                  const now = new Date();
                  const isToday = date.toDateString() === now.toDateString();
                  const yesterday = new Date(now);
                  yesterday.setDate(now.getDate() - 1);
                  const isYesterday = date.toDateString() === yesterday.toDateString();

                  if (groupName === "今天") return isToday;
                  if (groupName === "昨天") return isYesterday;
                  return !isToday && !isYesterday;
                });

                if (groupTxs.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-2">
                    <span className="text-[11px] font-mono font-bold text-neutral-400 block px-1">{groupName}</span>
                    <div className="bg-white rounded-2xl border border-neutral-200/60 shadow-sm overflow-hidden divide-y divide-neutral-100">
                      {groupTxs.map((tx) => {
                        const date = new Date(tx.timestamp);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const isIncome = tx.type === "income";
                        return (
                          <div key={tx.id} className="p-4 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center font-bold text-neutral-800 text-sm">
                                {isIncome ? "收" : "付"}
                              </div>
                              <div>
                                <span className=" font-bold text-neutral-900 block">{isIncome ? (tx.name === "充值" ? "充值" : `来自 ${tx.name}`) : `向 ${tx.name} 转账`}</span>
                                <span className="text-[10px] text-neutral-400 ">{tx.note || (isIncome ? "收入" : "转账支出")} · {timeStr}</span>
                              </div>
                            </div>
                            <span className={`font-mono font-bold text-sm ${isIncome ? "text-emerald-600" : "text-neutral-900"}`}>
                              {isIncome ? `+¥${tx.amount.toFixed(2)}` : `-¥${tx.amount.toFixed(2)}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Top-Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[16px] w-full max-w-xs p-5 space-y-4 shadow-xl border border-neutral-100">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <span className=" font-bold text-sm text-neutral-900">充值</span>
              <button onClick={() => setShowTopUpModal(false)} className="text-neutral-400 hover:text-neutral-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-neutral-500 ">
                当前余额：<span className="font-mono font-bold text-neutral-900">¥{walletBalance.toFixed(2)}</span>
              </div>
              <div>
                <label className="text-[11px]  font-medium text-neutral-600 block mb-1">充值金额</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="请输入充值金额"
                  value={topUpAmountInput}
                  onChange={(e) => setTopUpAmountInput(e.target.value)}
                  className="w-full text-sm font-mono border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-white outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px]  font-medium text-neutral-600 block mb-1">备注 (选填)</label>
                <input
                  type="text"
                  placeholder="如：工资到账"
                  value={topUpNoteInput}
                  onChange={(e) => setTopUpNoteInput(e.target.value)}
                  className="w-full text-sm  border border-neutral-200 focus:border-black p-2.5 rounded-xl bg-white outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="flex-1 py-2.5 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleTopUp}
                  className="flex-1 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-medium shadow-sm"
                >
                  确认充值
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY 4: CREATE SUB-ACCOUNT MODAL -------------------- */}
      {subAccountParentId && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl border border-neutral-200/50 flex flex-col max-h-[85vh] animate-scale-up">
            <div className="p-6 space-y-4 flex flex-col min-h-0">
              <div className="flex justify-between items-center shrink-0">
                <h3 className=" font-bold text-base text-neutral-950">创建角色小号</h3>
                <button 
                  onClick={() => setSubAccountParentId(null)}
                  className="text-neutral-400 hover:text-neutral-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {subAccountError && (
                  <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg font-medium">{subAccountError}</p>
                )}

                {/* Nickname input */}
                <div className="space-y-1.5">
                  <label className="text-[10px]  font-bold text-neutral-400 uppercase tracking-wide block">小号昵称 (必填)</label>
                  <input
                    type="text"
                    value={subAccountName}
                    onChange={(e) => setSubAccountName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-xl text-xs  font-medium outline-none transition-all"
                    placeholder="请输入小号昵称"
                  />
                </div>

                {/* Avatar input */}
                <div className="space-y-1.5">
                  <label className="text-[10px]  font-bold text-neutral-400 uppercase tracking-wide block">小号头像 (Emoji 或图片 URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subAccountAvatar}
                      onChange={(e) => setSubAccountAvatar(e.target.value)}
                      className="flex-1 p-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-xl text-xs  font-medium outline-none transition-all"
                      placeholder="Emoji(如🤖) 或 http:// 开头的头像链接"
                    />
                    <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200 shrink-0 text-2xl select-none">
                      {subAccountAvatar.startsWith("http") ? (
                        <img src={subAccountAvatar} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        subAccountAvatar || "🤖"
                      )}
                    </div>
                  </div>
                  {/* Preset Quick Emoji Picker */}
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {["👥", "🤫", "🕵️", "🎭", "🦊", "🐯", "🤖", "👽", "🦄", "🌸"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSubAccountAvatar(emoji)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center text-sm transition-all ${
                          subAccountAvatar === emoji 
                            ? "bg-black text-white border-black" 
                            : "bg-white border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purpose input */}
                <div className="space-y-1.5">
                  <label className="text-[10px]  font-bold text-neutral-400 uppercase tracking-wide block">用途设定 (用途描述作为核心指令)</label>
                  <textarea
                    value={subAccountPurpose}
                    onChange={(e) => setSubAccountPurpose(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 focus:border-neutral-400 focus:bg-white rounded-xl text-xs  font-medium outline-none transition-all resize-none"
                    placeholder="例如：试探用户对我有没有好感、扮演一个陌生人接近ta、假装是ta的旧同学"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubAccountParentId(null)}
                  className="flex-1 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-700  font-bold text-xs rounded-xl tracking-wider transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!subAccountName.trim()) {
                      setSubAccountError("请填写小号昵称");
                      return;
                    }
                    const parent = characters.find(c => c.id === subAccountParentId);
                    if (!parent) return;

                    // Create sub-account character object!
                    onAddCharacter({
                      name: subAccountName.trim(),
                      avatar: subAccountAvatar.trim().startsWith("http") ? "🤖" : subAccountAvatar.trim(),
                      chatAvatar: subAccountAvatar.trim().startsWith("http") ? subAccountAvatar.trim() : undefined,
                      description: `[${parent.name}] 的小号 · 用途: ${subAccountPurpose.trim() || "未设定"}`,
                      systemInstruction: parent.systemInstruction || `你正在扮演 "${subAccountName.trim()}"，是 "${parent.name}" 的小号。`,
                      model: parent.model || settings?.model || "gemini-3.6-flash",
                      group: parent.group || "其它",
                      isSubAccount: true,
                      parentCharacterId: parent.id,
                      parentCharacterName: parent.name,
                      purpose: subAccountPurpose.trim() || "扮演一个神秘的陌生人，根据目的行事",
                      isBusted: false,
                      bustQuestionsCount: 0,
                    });
                    setSubAccountParentId(null);
                  }}
                  className="flex-1 py-3 bg-black hover:bg-neutral-900 text-white  font-bold text-xs rounded-xl tracking-wider transition-all"
                >
                  确认创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Standalone Offline Meet Screen */}
      {showOfflineMeet && activeChar && (
        <OfflineMeetView
          character={activeChar}
          settings={settings}
          onlineMessages={activeSession?.messages || []}
          onClose={() => setShowOfflineMeet(false)}
          forcedMode="shared"
        />
      )}

      {/* -------------------- OVERLAY: SINGLE MESSAGE OS MODAL -------------------- */}
      {msgOsModalTarget && activeChar && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl border border-stone-200 flex flex-col p-5 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💭</span>
                <h3
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  className="font-bold text-base text-stone-900"
                >
                  消息内心心声
                </h3>
              </div>
              <button
                onClick={() => setMsgOsModalTarget(null)}
                className="p-1.5 text-stone-400 hover:text-black rounded-full hover:bg-stone-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message content preview */}
            <div className="bg-[#F8F6F2] p-3 rounded-[12px] border border-stone-200/60 text-xs text-stone-600 ">
              <span className="text-[10px] font-bold text-[#8C827A] block mb-1">
                {msgOsModalTarget.role === "assistant" ? `${activeChar.name} 的消息:` : "你的消息:"}
              </span>
              <p className="line-clamp-3 italic text-stone-700">"{msgOsModalTarget.content}"</p>
            </div>

            {/* Inner thought content */}
            <div className="bg-amber-50/70 p-4 rounded-[16px] border border-amber-100 text-xs text-stone-800  leading-relaxed italic space-y-1.5 shadow-inner">
              {(() => {
                const targetOs = msgOsModalTarget.os || activeSession?.currentOS;
                const parsed = parseOS(targetOs);
                return (
                  <>
                    <div className="flex items-center justify-between text-[10px] not-italic text-amber-900 font-bold">
                      <span className="flex items-center gap-1">
                        {parsed.icon ? (
                          <img src={parsed.icon} alt={parsed.emotion} className="w-4 h-4 object-contain shrink-0 bg-transparent" style={{ background: 'transparent', backgroundColor: 'transparent' }} referrerPolicy="no-referrer" />
                        ) : (
                          <span>{parsed.emoji}</span>
                        )}
                        <span>{activeChar.name} 的真实想法</span>
                      </span>
                      <span className="bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded text-[9px]">
                        {parsed.emotion}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[#2C2825] not-italic">{parsed.text}</p>
                  </>
                );
              })()}
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMsgOsModalTarget(null);
                  setShowAllOsModal(true);
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white  font-bold text-xs py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>💭</span>
                <span>查看所有历史心声</span>
              </button>
              <button
                type="button"
                onClick={() => setMsgOsModalTarget(null)}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700  font-medium text-xs py-2 rounded-xl transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- OVERLAY: ALL HISTORICAL OS MODAL -------------------- */}
      {showAllOsModal && activeChar && activeSession && (
        <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-sm z-[80] flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
          <div className="bg-white w-full max-w-lg h-[85vh] sm:h-[80vh] rounded-[24px] overflow-hidden shadow-2xl border border-stone-200 flex flex-col animate-scale-up">
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💭</span>
                <div>
                  <h3
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    className="font-bold text-lg text-stone-900 tracking-tight flex items-center gap-2"
                  >
                    历史心声
                    <span className="text-xs font-normal text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded-full ">
                      {activeChar.name}
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-400 ">
                    按时间顺序记录的角色内心真实想法（从旧到新）
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllOsModal(false)}
                className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List content (Chronological, old to new) with 12px spacing between cards */}
            <div className="flex-1 overflow-y-auto p-4 space-y-[12px] bg-stone-50/50">
              {(() => {
                const osHistory = getSessionOsHistory();
                if (osHistory.length === 0) {
                  return (
                    <div className="py-16 text-center space-y-3">
                      <span className="text-4xl block">💭</span>
                      <p className="text-xs text-stone-500 ">暂无生成的心声历史</p>
                      <p className="text-[11px] text-stone-400 ">在对话中角色表达内心想法后即可在此汇总查看</p>
                    </div>
                  );
                }

                return osHistory.map((item, idx) => {
                  const parsed = parseOS(item.os);
                  const formattedTime = new Date(item.timestamp).toLocaleString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-[12px] shadow-xs border border-stone-200 p-[12px_16px] flex flex-col justify-between transition-all hover:border-stone-400"
                    >
                      {/* Top-left: Corresponding message preview */}
                      <div className="text-[11px] text-stone-400  truncate mb-2 flex items-center gap-1.5">
                        <span className="font-medium shrink-0">
                          {item.msg.role === "assistant" ? `${activeChar.name}:` : "用户:"}
                        </span>
                        <span className="truncate italic">"{item.msg.content}"</span>
                      </div>

                      {/* Middle: Inner thought content (Playfair Display) */}
                      <div className="my-1 text-xs md:text-sm text-stone-800  leading-relaxed whitespace-pre-wrap bg-stone-50 p-3 rounded-[10px] border border-stone-200/80">
                        <div className="flex items-center justify-between text-[10px] text-stone-500 font-bold mb-1">
                          <span className="flex items-center gap-1">
                            {parsed.icon ? (
                              <img src={parsed.icon} alt={parsed.emotion} className="w-4 h-4 object-contain shrink-0 bg-transparent" style={{ background: 'transparent', backgroundColor: 'transparent' }} referrerPolicy="no-referrer" />
                            ) : (
                              <span>{parsed.emoji}</span>
                            )}
                            <span>内心想法</span>
                          </span>
                          <span className="bg-stone-200/60 text-stone-700 px-1.5 py-0.2 rounded text-[9px]">
                            {parsed.emotion}
                          </span>
                        </div>
                        <p 
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          className="text-stone-800 font-normal leading-relaxed"
                        >
                          {parsed.text}
                        </p>
                      </div>

                      {/* Bottom: Generation timestamp & Copy Button */}
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono pt-2 border-t border-stone-100 mt-1">
                        <div className="flex items-center gap-2">
                          <span>#{idx + 1}</span>
                          <span>{formattedTime}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyContent(parsed.text)}
                          className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-900  transition-colors active:scale-95 px-2 py-0.5 rounded hover:bg-stone-100"
                        >
                          <Copy className="w-3 h-3" />
                          <span>复制心声</span>
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer close button */}
            <div className="p-3.5 border-t border-stone-200 bg-white">
              <button
                onClick={() => setShowAllOsModal(false)}
                className="w-full bg-stone-900 hover:bg-black text-white  font-medium text-xs py-2.5 rounded-xl transition-all active:scale-95"
              >
                关闭并返回聊天
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: CREATE GROUP CHAT -------------------- */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
              <h3 className=" font-bold text-base text-neutral-950">创建群聊 (CREATE GROUP)</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-neutral-400 hover:text-neutral-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {groupError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">
                {groupError}
              </div>
            )}

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">群聊名称 (Group Name) *</label>
                <input
                  type="text"
                  placeholder="如: 星际茶话会、周末小分队"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full text-xs border border-neutral-200 px-3.5 py-2.5 rounded-xl bg-white focus:border-neutral-950 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">群聊头像 (Avatar Emoji)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="💬"
                    value={groupAvatarInput}
                    onChange={(e) => setGroupAvatarInput(e.target.value)}
                    className="w-16 text-center text-xl border border-neutral-200 py-2 rounded-xl bg-white focus:border-neutral-950 outline-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {['💬', '🌟', '☕', '🚀', '🎮', '🌸', '🐱', '🔥'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setGroupAvatarInput(emoji)}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg ${
                          groupAvatarInput === emoji ? 'border-black bg-neutral-100' : 'border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">选择群成员 (至少选择2个角色)</label>
                  <span className="text-xs font-mono font-bold text-neutral-500">已选: {selectedMemberIds.length}</span>
                </div>
                <div className="max-h-52 overflow-y-auto border border-neutral-200 rounded-2xl p-2 space-y-1.5 bg-neutral-50">
                  {characters.filter(c => c.id !== 'char-preset-fafa').map((char) => {
                    const isSelected = selectedMemberIds.includes(char.id);
                    return (
                      <div
                        key={char.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMemberIds(selectedMemberIds.filter(id => id !== char.id));
                          } else {
                            setSelectedMemberIds([...selectedMemberIds, char.id]);
                          }
                        }}
                        className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                          isSelected ? 'bg-black text-white shadow-sm' : 'bg-white hover:bg-neutral-100 border border-neutral-200/60 text-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center text-lg overflow-hidden shrink-0">
                            {char.chatAvatar ? (
                              <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              char.avatar
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs truncate block">{char.name}</span>
                            <span className={`text-[10px] truncate block ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                              {char.description || "无简介"}
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                          isSelected ? 'bg-white text-black border-white font-bold' : 'border-neutral-300 bg-white'
                        }`}>
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!groupNameInput.trim()) {
                    setGroupError("请输入群聊名称");
                    return;
                  }
                  if (selectedMemberIds.length < 2) {
                    setGroupError("请至少选择2个角色加入群聊");
                    return;
                  }
                  const newGroupId = `group-${Date.now()}`;
                  const firstChar = characters.find(c => c.id === selectedMemberIds[0]);
                  const newGroupSession: ChatSession = {
                    id: newGroupId,
                    isGroup: true,
                    groupName: groupNameInput.trim(),
                    groupAvatar: groupAvatarInput || "💬",
                    memberIds: selectedMemberIds,
                    syncMemory: true,
                    messages: [
                      {
                        id: `msg-${Date.now()}`,
                        role: "assistant",
                        content: `欢迎来到「${groupNameInput.trim()}」群聊！大家快来打个招呼吧~`,
                        timestamp: Date.now(),
                        senderId: firstChar?.id,
                        senderName: firstChar?.name || "群成员",
                        senderAvatar: firstChar?.chatAvatar || firstChar?.avatar || "🤖"
                      }
                    ],
                    lastActive: Date.now()
                  };
                  onUpdateSessionMessages(newGroupId, newGroupSession.messages, undefined, {
                    isGroup: true,
                    groupName: newGroupSession.groupName,
                    groupAvatar: newGroupSession.groupAvatar,
                    memberIds: newGroupSession.memberIds,
                    syncMemory: true,
                  });
                  setActiveCharId(newGroupId);
                  setActiveTab("chat");
                  setApiError(null);
                  setShowCreateGroupModal(false);
                }}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-black hover:bg-neutral-800 rounded-xl transition-colors"
              >
                立即创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: GROUP SETTINGS -------------------- */}
      {showGroupSettingsModal && activeSession?.isGroup && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
              <h3 className=" font-bold text-base text-neutral-950">群聊设置 (GROUP SETTINGS)</h3>
              <button onClick={() => setShowGroupSettingsModal(false)} className="text-neutral-400 hover:text-neutral-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">群聊名称</label>
                <input
                  type="text"
                  value={activeSession.groupName || ""}
                  onChange={(e) => {
                    const newName = e.target.value;
                    onUpdateSessionMessages(activeSession.id, activeSession.messages, activeSession.currentOS, {
                      ...activeSession,
                      groupName: newName,
                      isGroup: true,
                    });
                  }}
                  className="w-full text-xs border border-neutral-200 px-3.5 py-2.5 rounded-xl bg-white focus:border-neutral-950 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">群聊头像</label>
                <input
                  type="text"
                  value={activeSession.groupAvatar || "💬"}
                  onChange={(e) => {
                    const newAvatar = e.target.value;
                    onUpdateSessionMessages(activeSession.id, activeSession.messages, activeSession.currentOS, {
                      ...activeSession,
                      groupAvatar: newAvatar,
                      isGroup: true,
                    });
                  }}
                  className="w-full text-xs border border-neutral-200 px-3.5 py-2.5 rounded-xl bg-white focus:border-neutral-950 outline-none"
                />
              </div>

              {/* World Setting (世界设定) */}
              <div className="space-y-1.5 border-t border-neutral-100 pt-3">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">世界设定 (WORLD SETTING)</label>
                <textarea
                  rows={4}
                  placeholder="如：“这是一个梦境空间，角色们知道自己在做梦，但无法主动醒来。”（留空则角色按各自原有人设回复）"
                  value={activeSession.worldSetting || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateSessionMessages(activeSession.id, activeSession.messages, activeSession.currentOS, {
                      ...activeSession,
                      worldSetting: val,
                      isGroup: true,
                    });
                  }}
                  className="w-full text-xs border border-neutral-200 px-3.5 py-2.5 rounded-xl bg-white focus:border-neutral-950 outline-none resize-none "
                />
                
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase block">常用设定推荐 (点击快速填入)：</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "所有角色都知道自己来自不同的世界，但在这个群聊中他们默认不谈论此事。",
                      "这是一个梦境空间，角色们知道自己在做梦，但无法主动醒来。",
                      "这是侦探聚会，所有人都知道正在调查一起案件。"
                    ].map((presetText) => (
                      <button
                        key={presetText}
                        type="button"
                        onClick={() => {
                          onUpdateSessionMessages(activeSession.id, activeSession.messages, activeSession.currentOS, {
                            ...activeSession,
                            worldSetting: presetText,
                            isGroup: true,
                          });
                        }}
                        className="text-left text-[11px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 px-2.5 py-1.5 border border-neutral-200/50 rounded-xl transition-all  active:scale-[0.98]"
                      >
                        · {presetText}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Memory Sync Toggle */}
              <div className="border border-neutral-200/50 rounded-2xl p-4 flex justify-between items-center bg-white">
                <div className="space-y-0.5 pr-2">
                  <span className="text-sm font-bold text-neutral-900 block ">单聊记忆互通</span>
                  <span className="text-[10px] text-neutral-400 font-mono block">SINGLE-CHAT MEMORY SYNC</span>
                  <p className="text-[11px] text-neutral-400  mt-0.5 leading-relaxed">
                    开启后，群聊消息会自动同步到各成员的单聊记忆中，角色在单聊时也能知道群聊发生过的事。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentSync = activeSession.syncMemory !== false;
                    const nextSync = !currentSync;
                    onUpdateSessionMessages(activeSession.id, activeSession.messages, activeSession.currentOS, {
                      ...activeSession,
                      syncMemory: nextSync,
                      isGroup: true,
                    });
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                    activeSession.syncMemory !== false ? "bg-black" : "bg-neutral-300"
                  }`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-200 ease-in-out ${
                    activeSession.syncMemory !== false ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">群成员列表 ({activeSession.memberIds?.length || 0})</label>
                <div className="border border-neutral-200 rounded-2xl p-2 space-y-1.5 bg-neutral-50 max-h-40 overflow-y-auto">
                  {characters
                    .filter(c => activeSession.memberIds?.includes(c.id))
                    .map(char => (
                      <div key={char.id} className="p-2 bg-white rounded-xl flex items-center gap-3 border border-neutral-200/40">
                        <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-base overflow-hidden shrink-0">
                          {char.chatAvatar ? (
                            <img src={char.chatAvatar} alt={char.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            char.avatar
                          )}
                        </div>
                        <span className="text-xs font-bold text-neutral-900 truncate">{char.name}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const updatedSessions = sessions.filter(s => s.id !== activeSession.id);
                    localStorage.setItem("mobile_ai_chat_sessions", JSON.stringify(updatedSessions));
                    setActiveCharId(null);
                    setShowGroupSettingsModal(false);
                  }}
                  className="w-full py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200/50"
                >
                  解散 / 退出群聊
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Publish Moment Modal */}
      {isPublishMomentOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <span className="font-bold text-base text-neutral-900">发布朋友圈</span>
              <button 
                onClick={() => {
                  setIsPublishMomentOpen(false);
                  setNewMomentContent("");
                  setNewMomentImage(null);
                }} 
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Text Area */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">动态文字内容</label>
              <textarea
                rows={4}
                value={newMomentContent}
                onChange={(e) => setNewMomentContent(e.target.value)}
                placeholder="分享你的新鲜事..."
                className="w-full bg-neutral-100 p-3 rounded-xl text-xs outline-none border border-neutral-200/50 leading-relaxed resize-none text-neutral-900 focus:border-neutral-800"
              />
            </div>

            {/* Image Upload Area */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">图片上传</label>
              {newMomentImage ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 group">
                  <img src={newMomentImage} alt="上传图片" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNewMomentImage(null)}
                    className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => momentFileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-400 flex flex-col items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors bg-neutral-50"
                >
                  <Camera className="w-6 h-6 mb-1 stroke-[1.5]" />
                  <span className="text-[10px] font-medium">相册图片</span>
                </button>
              )}
              <input
                ref={momentFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMomentImageUpload}
                className="hidden"
              />
            </div>

            {/* Visibility Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-neutral-500 uppercase block">可见范围</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewMomentVisibility("all");
                    setSelectedCharIdsForVisibility([]);
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    newMomentVisibility === "all"
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  全部可见
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMomentVisibility("visible_some");
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    newMomentVisibility === "visible_some"
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  部分可见
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMomentVisibility("invisible_some");
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                    newMomentVisibility === "invisible_some"
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  部分不可见
                </button>
              </div>

              {/* Character selection list when 部分可见 or 部分不可见 */}
              {(newMomentVisibility === "visible_some" || newMomentVisibility === "invisible_some") && (
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 animate-fade-in max-h-40 overflow-y-auto">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                    <span>{newMomentVisibility === "visible_some" ? "勾选可见角色：" : "勾选屏蔽角色："}</span>
                    <span className="text-neutral-400 font-mono">已选 {selectedCharIdsForVisibility.length} 人</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {characters.filter(c => c.id !== 'char-preset-fafa').map(char => {
                      const isChecked = selectedCharIdsForVisibility.includes(char.id);
                      return (
                        <label key={char.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-neutral-100 hover:border-neutral-300 cursor-pointer text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{char.avatar || "🤖"}</span>
                            <span className="font-bold text-neutral-800">{char.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCharIdsForVisibility(prev => [...prev, char.id]);
                              } else {
                                setSelectedCharIdsForVisibility(prev => prev.filter(id => id !== char.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-black border-neutral-300 focus:ring-black"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setIsPublishMomentOpen(false);
                  setNewMomentContent("");
                  setNewMomentImage(null);
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-3 rounded-xl text-xs font-bold transition-colors"
              >
                取消
              </button>
              <button
                onClick={handlePublishMoment}
                disabled={!newMomentContent.trim() && !newMomentImage}
                className="flex-1 bg-black text-white py-3 rounded-xl text-xs font-bold disabled:opacity-40 transition-all active:scale-95"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SHARE MOMENT MODAL -------------------- */}
      {isShareModalOpen && shareTargetPost && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-neutral-800" />
                <span className="font-bold text-base text-neutral-900">分享动态给角色</span>
              </div>
              <button 
                onClick={() => {
                  setIsShareModalOpen(false);
                  setShareTargetPost(null);
                }} 
                className="text-neutral-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Post Preview Card */}
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 space-y-1.5 text-xs text-neutral-800">
              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span className="font-bold text-neutral-700">{shareTargetPost.authorName}</span>
                <span>{formatRelativeTime(shareTargetPost.timestamp)}</span>
              </div>
              {shareTargetPost.content && (
                <p className="line-clamp-2 text-neutral-700 font-medium">{shareTargetPost.content}</p>
              )}
            </div>

            <p className="text-xs text-neutral-500 font-medium">请选择要分享到的聊天角色：</p>

            {/* Characters List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {characters.filter(c => c.id !== 'char-preset-fafa').length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-4">暂无角色，请先创建或添加角色</p>
              ) : (
                characters.filter(c => c.id !== 'char-preset-fafa').map((char) => {
                  const avatar = char.chatAvatar || char.avatar || "🤖";
                  return (
                    <div
                      key={char.id}
                      onClick={() => handleConfirmShareToCharacter(char, shareTargetPost)}
                      className="p-3 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200/50 flex items-center justify-center overflow-hidden text-lg shrink-0">
                          {avatar.startsWith("data:") || avatar.startsWith("http") || avatar.startsWith("/") ? (
                            <img src={avatar} alt={char.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{avatar}</span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-neutral-900 block group-hover:text-black">{char.name}</span>
                          <span className="text-[10px] text-neutral-400 line-clamp-1">{char.description || "轻触发送给此角色讨论"}</span>
                        </div>
                      </div>
                      <Send className="w-4 h-4 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => {
                setIsShareModalOpen(false);
                setShareTargetPost(null);
              }}
              className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

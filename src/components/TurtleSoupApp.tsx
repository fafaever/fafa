import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  Pause,
  Play,
  History,
  Trash2,
  Clock,
  Sparkles,
  HelpCircle,
  X,
  Send,
  RotateCw,
  Trophy,
  CheckCircle2,
  XCircle,
  FolderOpen,
  UserCheck,
  MessageSquare,
  Key,
  Eye,
  AlertCircle
} from "lucide-react";
import { apiChat, apiGenerateTurtlesoupBatch } from "../lib/api";

import { Character, AppSettings } from "../types";
import { TURTLE_SOUP_PRESETS, TurtleSoupPuzzle } from "../data/turtleSoupPuzzles";

export interface TurtleSoupQnA {
  id: string;
  askerId: string; // 'user' or character.id
  askerName: string;
  askerAvatar: string;
  question: string;
  answer: "是" | "否" | "无关" | "是与否无关" | "关键/接近" | string;
  hostComment?: string;
  timestamp: number;
  isGuessSolution?: boolean;
  isCorrectSolution?: boolean;
}

export interface TurtleSoupSaveRecord {
  id: string;
  title: string;
  startTime: number;
  updatedTime: number;
  durationSeconds: number;
  questionCount: number;
  currentRound: number;
  status: "playing" | "paused" | "completed";
  isWon: boolean;
  puzzle: TurtleSoupPuzzle;
  host: { id: string; name: string; avatar: string };
  players: { id: string; name: string; avatar: string; isAi?: boolean }[];
  qnaHistory: TurtleSoupQnA[];
}

interface TurtleSoupAppProps {
  characters: Character[];
  settings: AppSettings;
  onClose: () => void;
}

function sanitizeAvatar(avatar: any): string {
  if (avatar === undefined || avatar === null) return "👤";
  let str = String(avatar).trim();
  
  // Remove wrapping quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Handle unicode escape sequences like \u1F431
  try {
    if (str.includes("\\u")) {
      str = JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
    }
  } catch (e) {
    // Keep original if JSON parsing fails
  }

  // Handle URL encoding if any
  try {
    if (str.includes("%")) {
      str = decodeURIComponent(str);
    }
  } catch (e) {}

  // Handle HTML entities
  if (str.includes("&#")) {
    str = str.replace(/&#(x?)([0-9a-fA-F]+);/g, (_, hex, code) => {
      return String.fromCodePoint(parseInt(code, hex ? 16 : 10));
    });
  }

  return str || "👤";
}

function PlayerAvatar({ avatar, className = "w-6 h-6" }: { avatar: string; className?: string }) {
  const sanitized = sanitizeAvatar(avatar);
  console.log(`[TurtleSoup PlayerAvatar Render] Input: "${avatar}" -> Sanitized: "${sanitized}"`);

  if (!sanitized) {
    return (
      <div className={`${className} rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs shrink-0 overflow-hidden select-none`}>
        👤
      </div>
    );
  }
  const isUrl = sanitized.startsWith("data:") || sanitized.startsWith("http:") || sanitized.startsWith("https:") || sanitized.startsWith("/");
  if (isUrl) {
    return (
      <img
        src={sanitized}
        alt="avatar"
        className={`${className} object-cover rounded-full overflow-hidden shrink-0`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className={`${className} rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs shrink-0 overflow-hidden select-none`}>
      {sanitized}
    </div>
  );
}

export default function TurtleSoupApp({ characters, settings, onClose }: TurtleSoupAppProps) {
  // Game states: 'setup' | 'playing' | 'game_over'
  const [gameState, setGameState] = useState<"setup" | "playing" | "game_over">("setup");
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Setup state
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>(TURTLE_SOUP_PRESETS[0].id);
  const [customSurface, setCustomSurface] = useState<string>("");
  const [customBase, setCustomBase] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const [customPuzzles, setCustomPuzzles] = useState<TurtleSoupPuzzle[]>(() => {
    try {
      const raw = localStorage.getItem("turtlesoup_custom_puzzles");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [completedPuzzleIds, setCompletedPuzzleIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("turtlesoup_completed_ids");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [puzzleFilter, setPuzzleFilter] = useState<"all" | "presets" | "custom" | "completed">("all");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedBatch, setGeneratedBatch] = useState<TurtleSoupPuzzle[] | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Host and Players
  const [hostId, setHostId] = useState<string>(() => {
    const fafa = characters.find(c => c.name.toLowerCase().includes("fafa") || c.id === "fafa");
    return fafa ? fafa.id : (characters[0]?.id || "fafa");
  });
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(() => {
    return characters.slice(0, 3).map(c => c.id);
  });

  // Active Game State
  const [currentPuzzle, setCurrentPuzzle] = useState<TurtleSoupPuzzle>(TURTLE_SOUP_PRESETS[0]);
  const [currentHost, setCurrentHost] = useState<{ id: string; name: string; avatar: string }>({
    id: "fafa",
    name: "fafa",
    avatar: "🐈",
  });
  const [activePlayers, setActivePlayers] = useState<{ id: string; name: string; avatar: string; isAi?: boolean }[]>([]);
  
  const [qnaHistory, setQnaHistory] = useState<TurtleSoupQnA[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [gameElapsedSeconds, setGameElapsedSeconds] = useState<number>(0);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [isWon, setIsWon] = useState<boolean>(false);
  const [currentGameSaveId, setCurrentGameSaveId] = useState<string | null>(null);

  // User input controls
  const [inputMode, setInputMode] = useState<"ask" | "guess">("ask");
  const [inputText, setInputText] = useState<string>("");
  const [isHostThinking, setIsHostThinking] = useState<boolean>(false);
  const [isAiPlayerTurn, setIsAiPlayerTurn] = useState<boolean>(false);

  // Modals & Save list
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [savedGames, setSavedGames] = useState<TurtleSoupSaveRecord[]>([]);
  const [ruleModalOpen, setRuleModalOpen] = useState<boolean>(false);
  const [revealSolutionModal, setRevealSolutionModal] = useState<boolean>(false);

  // Scroll ref
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Refs for tracking up-to-date state inside timers and async callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const qnaHistoryRef = useRef(qnaHistory);
  qnaHistoryRef.current = qnaHistory;

  const gameElapsedSecondsRef = useRef(gameElapsedSeconds);
  gameElapsedSecondsRef.current = gameElapsedSeconds;

  const questionCountRef = useRef(questionCount);
  questionCountRef.current = questionCount;

  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;

  const currentGameSaveIdRef = useRef(currentGameSaveId);
  currentGameSaveIdRef.current = currentGameSaveId;

  const currentPuzzleRef = useRef(currentPuzzle);
  currentPuzzleRef.current = currentPuzzle;

  const currentHostRef = useRef(currentHost);
  currentHostRef.current = currentHost;

  const activePlayersRef = useRef(activePlayers);
  activePlayersRef.current = activePlayers;

  const gameStartTimeRef = useRef(gameStartTime);
  gameStartTimeRef.current = gameStartTime;

  const isWonRef = useRef(isWon);
  isWonRef.current = isWon;

  // Load saved games from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("turtlesoup_saved_games");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedGames(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load turtlesoup_saved_games", e);
    }
  }, []);

  // Timer effect to increment elapsed time during gameplay
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (gameState === "playing" && !isPaused) {
      timer = setInterval(() => {
        setGameElapsedSeconds((prev) => {
          const next = prev + 1;
          gameElapsedSecondsRef.current = next;
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, isPaused]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (gameState === "playing") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [qnaHistory, isHostThinking]);

  // Format seconds to MM:SS
  const formatSeconds = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const filteredPuzzles = [...TURTLE_SOUP_PRESETS, ...customPuzzles].filter((p) => {
    const isCompleted = completedPuzzleIds.includes(p.id);
    const isPreset = TURTLE_SOUP_PRESETS.some((preset) => preset.id === p.id);
    
    if (puzzleFilter === "presets") return isPreset;
    if (puzzleFilter === "custom") return !isPreset;
    if (puzzleFilter === "completed") return isCompleted;
    return true; // "all"
  });

  // Save current game state to localStorage
  const saveCurrentGame = (status: "playing" | "paused" | "completed", overrideWon?: boolean) => {
    try {
      if (!currentPuzzleRef.current) return;

      let saveId = currentGameSaveIdRef.current;
      if (!saveId) {
        saveId = `turtlesoup_save_${Date.now()}`;
        setCurrentGameSaveId(saveId);
        currentGameSaveIdRef.current = saveId;
      }

      const wonState = overrideWon !== undefined ? overrideWon : isWonRef.current;

      const record: TurtleSoupSaveRecord = {
        id: saveId,
        title: currentPuzzleRef.current.title || "海龟汤对局",
        startTime: gameStartTimeRef.current || Date.now(),
        updatedTime: Date.now(),
        durationSeconds: gameElapsedSecondsRef.current,
        questionCount: questionCountRef.current,
        currentRound: currentRoundRef.current,
        status,
        isWon: wonState,
        puzzle: currentPuzzleRef.current,
        host: currentHostRef.current,
        players: activePlayersRef.current,
        qnaHistory: qnaHistoryRef.current,
      };

      setSavedGames((prev) => {
        const filtered = prev.filter((item) => item.id !== saveId);
        const updated = [record, ...filtered];
        try {
          localStorage.setItem("turtlesoup_saved_games", JSON.stringify(updated));
        } catch (e) {
          console.warn("localStorage write failed", e);
        }
        return updated;
      });
    } catch (err) {
      console.error("Save turtle soup game error:", err);
    }
  };

  // Pause & Resume Game Handlers
  const handlePauseGame = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    saveCurrentGame("paused");
  };

  const handleResumeGame = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    saveCurrentGame("playing");
  };

  // Load a save record from history
  const loadSaveRecord = (record: TurtleSoupSaveRecord) => {
    setCurrentGameSaveId(record.id);
    currentGameSaveIdRef.current = record.id;

    setCurrentPuzzle(record.puzzle);
    currentPuzzleRef.current = record.puzzle;

    setCurrentHost(record.host);
    currentHostRef.current = record.host;

    setActivePlayers(record.players);
    activePlayersRef.current = record.players;

    setQnaHistory(record.qnaHistory);
    qnaHistoryRef.current = record.qnaHistory;

    setQuestionCount(record.questionCount);
    questionCountRef.current = record.questionCount;

    setCurrentRound(record.currentRound);
    currentRoundRef.current = record.currentRound;

    setGameElapsedSeconds(record.durationSeconds);
    gameElapsedSecondsRef.current = record.durationSeconds;

    setGameStartTime(record.startTime);
    gameStartTimeRef.current = record.startTime;

    setIsWon(record.isWon);
    isWonRef.current = record.isWon;

    setHistoryModalOpen(false);

    if (record.status === "completed") {
      setGameState("game_over");
      setIsPaused(false);
    } else {
      setGameState("playing");
      setIsPaused(record.status === "paused");
    }
  };

  // Delete a save record
  const deleteSaveRecord = (recordId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedGames((prev) => {
      const updated = prev.filter((r) => r.id !== recordId);
      try {
        localStorage.setItem("turtlesoup_saved_games", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to delete from localStorage", err);
      }
      return updated;
    });
    if (currentGameSaveId === recordId) {
      setCurrentGameSaveId(null);
      currentGameSaveIdRef.current = null;
    }
  };

  // Start new game setup
  const handleStartGame = () => {
    // Determine puzzle
    let puzzle: TurtleSoupPuzzle;
    if (isCustomMode && customSurface.trim() && customBase.trim()) {
      puzzle = {
        id: `custom_${Date.now()}`,
        title: "自定海龟汤",
        category: "自定义",
        difficulty: 3,
        surface: customSurface.trim(),
        base: customBase.trim(),
        keyClues: ["自定义核心解法"],
      };
    } else {
      const allPuzzles = [...TURTLE_SOUP_PRESETS, ...customPuzzles];
      puzzle = allPuzzles.find((p) => p.id === selectedPuzzleId) || allPuzzles[0] || TURTLE_SOUP_PRESETS[0];
    }

    // Determine host
    const hostChar = characters.find((c) => c.id === hostId);
    const hostData = {
      id: hostChar ? hostChar.id : "fafa",
      name: hostChar ? hostChar.name : "fafa",
      avatar: hostChar ? (hostChar.chatAvatar || hostChar.avatar) : "🐈",
    };

    // Determine players: User + selected AI characters
    const playersList: { id: string; name: string; avatar: string; isAi?: boolean }[] = [
      { id: "user", name: "我", avatar: "👤", isAi: false },
    ];

    selectedPlayerIds.forEach((id) => {
      if (id !== hostData.id) {
        const char = characters.find((c) => c.id === id);
        if (char) {
          playersList.push({
            id: char.id,
            name: char.name,
            avatar: char.chatAvatar || char.avatar,
            isAi: true,
          });
        }
      }
    });

    // Console logs to diagnose and verify player avatars
    console.log("=== Turtle Soup Game Setup / Start ===");
    console.log("Characters list in database:", characters);
    console.log("Host Chosen data:", hostData);
    console.log("Players Selected list:", playersList);
    playersList.forEach((p, idx) => {
      console.log(`Player #${idx + 1} (${p.name}) Avatar representation:`, p.avatar);
    });

    setCurrentPuzzle(puzzle);
    currentPuzzleRef.current = puzzle;

    setCurrentHost(hostData);
    currentHostRef.current = hostData;

    setActivePlayers(playersList);
    activePlayersRef.current = playersList;

    setQnaHistory([]);
    qnaHistoryRef.current = [];

    setQuestionCount(0);
    questionCountRef.current = 0;

    setCurrentRound(1);
    currentRoundRef.current = 1;

    setGameElapsedSeconds(0);
    gameElapsedSecondsRef.current = 0;

    const now = Date.now();
    setGameStartTime(now);
    gameStartTimeRef.current = now;

    setIsWon(false);
    isWonRef.current = false;

    const saveId = `turtlesoup_save_${now}`;
    setCurrentGameSaveId(saveId);
    currentGameSaveIdRef.current = saveId;

    setIsPaused(false);
    isPausedRef.current = false;

    setGameState("playing");
    setInputText("");
    setInputMode("ask");

    // Save initial session
    setTimeout(() => {
      saveCurrentGame("playing");
    }, 100);
  };

  // Generate a batch of 5 new puzzles using AI
  const handleGenerateBatch = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const data = await apiGenerateTurtlesoupBatch({ settings });
      // response error checked internally

      // data already parsed
      if (data && Array.isArray(data.puzzles)) {
        // Ensure proper IDs and formatted titles
        const puzzlesWithIds: TurtleSoupPuzzle[] = data.puzzles.map((p: any, index: number) => {
          let title = p.title || `新海龟汤 #${index + 1}`;
          if (!title.startsWith("汤 #")) {
            title = `汤 #${index + 1}: ${title}`;
          }
          return {
            id: `ai_generated_${Date.now()}_${index}`,
            title: title,
            category: p.category || "AI生成",
            difficulty: p.difficulty || 3,
            surface: p.surface || "",
            base: p.base || "",
            keyClues: Array.isArray(p.keyClues) ? p.keyClues : ["核心解法"],
          };
        });

        setGeneratedBatch(puzzlesWithIds);
        setShowPreviewModal(true);
      } else {
        throw new Error("接口返回的题目格式不正确");
      }
    } catch (err: any) {
      console.error("Failed to generate batch:", err);
      alert(err.message || "AI 生成题目失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  // Select 1 puzzle from the generated batch, saving the other 4 unselected ones
  const handleSelectPuzzleFromBatch = (selectedPuzzle: TurtleSoupPuzzle) => {
    if (!generatedBatch) return;

    // Unselected ones
    const unselectedPuzzles = generatedBatch.filter((p) => p.id !== selectedPuzzle.id);

    // Save unselected puzzles
    setCustomPuzzles((prev) => {
      const updated = [...prev, ...unselectedPuzzles];
      try {
        localStorage.setItem("turtlesoup_custom_puzzles", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to write turtlesoup_custom_puzzles", err);
      }
      return updated;
    });

    // Save selected puzzle so that it also becomes a member of custom database (accessible under Custom and Completed later)
    setCustomPuzzles((prev) => {
      if (prev.some((p) => p.id === selectedPuzzle.id)) return prev;
      const updated = [...prev, selectedPuzzle];
      try {
        localStorage.setItem("turtlesoup_custom_puzzles", JSON.stringify(updated));
      } catch (err) {
        console.warn("Failed to write turtlesoup_custom_puzzles with selected", err);
      }
      return updated;
    });

    // Set selected puzzle as chosen
    setSelectedPuzzleId(selectedPuzzle.id);

    // Close preview modal
    setShowPreviewModal(false);
    setGeneratedBatch(null);
  };

  // Evaluate Question by Host Engine
  const evaluateQuestionByHost = async (
    questionText: string,
    isGuess: boolean
  ): Promise<{ answer: "是" | "否" | "无关" | "是与否无关" | "关键/接近" | string; hostComment?: string; isCorrectSolution?: boolean }> => {
    const puzzle = currentPuzzleRef.current;
    if (!puzzle) {
      return { answer: "无关", hostComment: "题面异常" };
    }

    // Check if matching sample questions first
    if (puzzle.sampleQuestions) {
      const matchedSample = puzzle.sampleQuestions.find(
        (sq) => questionText.includes(sq.question) || sq.question.includes(questionText)
      );
      if (matchedSample) {
        return {
          answer: matchedSample.answer,
          hostComment: matchedSample.explanation || (matchedSample.answer === "关键/接近" ? "抓住了关键线索！" : undefined),
        };
      }
    }

    // Try AI Server Route if API configured or fallback to smart keyword heuristic
    if (settings.apiKey || settings.apiUrl) {
      try {
        const systemPrompt = `你是一名专业严谨的海龟汤主持（Host）。
汤面：${puzzle.surface}
汤底真相：${puzzle.base}
关键线索词：${puzzle.keyClues.join(", ")}

请对玩家的${isGuess ? "猜汤底" : "提问"}做出精准判断。
若为普通提问，回答必须且仅包含以下5种之一：
["是", "否", "无关", "是与否无关", "关键/接近"]，可附带一句简短的主持人点评。

若为猜汤底：
请判断玩家是否猜中了完整的真相或核心动机。若基本符合真相，请回复：{"answer": "恭喜猜中汤底！", "isCorrect": true}；若偏离，回复：{"answer": "推测不完整或不准确，再想想看！", "isCorrect": false}`;

        const data = await apiChat({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `玩家的提问/推测：${questionText}\n请根据以上推测，判断是/否/无关/猜中汤底。` }
            ],
            settings,
          });
        if (data) {
          // data already parsed
          const text = data.text || "";
          
          if (isGuess) {
            const isCorrect = text.includes("恭喜") || text.includes("猜中") || text.includes("正确") || text.includes("正确！");
            return {
              answer: isCorrect ? "恭喜猜中汤底！" : "推测不符合真相或尚欠完备！",
              hostComment: text.replace(/.*?(恭喜|推测).*/, "$1"),
              isCorrectSolution: isCorrect,
            };
          }

          if (text.includes("关键") || text.includes("接近")) return { answer: "关键/接近", hostComment: "抓到了核心线索！" };
          if (text.includes("是与否无关")) return { answer: "是与否无关" };
          if (text.startsWith("是") || text.includes("回答：是")) return { answer: "是" };
          if (text.startsWith("否") || text.includes("回答：否")) return { answer: "否" };
          if (text.includes("无关")) return { answer: "无关" };
        }
      } catch (err) {
        console.warn("AI Host API evaluation failed, falling back to heuristic engine", err);
      }
    }

    // Heuristic Fallback Engine
    const lowerQ = questionText.toLowerCase();
    const lowerBase = puzzle.base.toLowerCase();

    if (isGuess) {
      let hitCount = 0;
      puzzle.keyClues.forEach((clue) => {
        if (lowerQ.includes(clue.toLowerCase())) hitCount++;
      });
      const isCorrect = hitCount >= Math.min(2, puzzle.keyClues.length);
      return {
        answer: isCorrect ? "恭喜！成功还原了汤底真相！" : "推测与真相还有距离，请继续推理！",
        hostComment: isCorrect ? "逻辑非常清晰，完全破案！" : `缺少部分关键细节（如：${puzzle.keyClues[0] || "核心动机"}）`,
        isCorrectSolution: isCorrect,
      };
    }

    // Standard Question Heuristics
    let matchedClue = false;
    for (const clue of puzzle.keyClues) {
      if (lowerQ.includes(clue.toLowerCase())) {
        matchedClue = true;
        break;
      }
    }

    if (matchedClue) {
      return { answer: "关键/接近", hostComment: "问到了十分关键的核心细节！" };
    }

    // Check key negation or affirmative words in base
    const affirmativeKeywords = ["有", "是", "死", "杀", "同伴", "救", "盲", "误会", "变", "绝望", "真相"];
    const isAffirmative = affirmativeKeywords.some((kw) => lowerQ.includes(kw) && lowerBase.includes(kw));

    if (isAffirmative) {
      return { answer: "是" };
    }

    if (lowerQ.includes("名字") || lowerQ.includes("天气") || lowerQ.includes("颜色") || lowerQ.includes("星期")) {
      return { answer: "无关" };
    }

    return { answer: "否" };
  };

  // Submit User Question or Solution Guess
  const handleUserSubmit = async () => {
    if (!inputText.trim() || isHostThinking || isPaused || gameState !== "playing") return;

    const text = inputText.trim();
    setInputText("");
    setIsHostThinking(true);

    const isGuess = inputMode === "guess";

    // Create player QnA entry
    const newQnA: TurtleSoupQnA = {
      id: `qna_${Date.now()}`,
      askerId: "user",
      askerName: "我",
      askerAvatar: "👤",
      question: text,
      answer: "思考中...",
      timestamp: Date.now(),
      isGuessSolution: isGuess,
    };

    const updatedHistory = [...qnaHistoryRef.current, newQnA];
    setQnaHistory(updatedHistory);
    qnaHistoryRef.current = updatedHistory;

    setQuestionCount((prev) => {
      const next = prev + 1;
      questionCountRef.current = next;
      return next;
    });

    // Evaluate response
    const result = await evaluateQuestionByHost(text, isGuess);

    setIsHostThinking(false);

    // Update history entry with answer
    const answeredHistory = updatedHistory.map((item) => {
      if (item.id === newQnA.id) {
        return {
          ...item,
          answer: result.answer,
          hostComment: result.hostComment,
          isCorrectSolution: result.isCorrectSolution,
        };
      }
      return item;
    });

    setQnaHistory(answeredHistory);
    qnaHistoryRef.current = answeredHistory;

    // Check if victory
    if (isGuess && result.isCorrectSolution) {
      setIsWon(true);
      isWonRef.current = true;
      setGameState("game_over");
      setIsPaused(false);

      // Save to completed puzzle list
      const puzzleId = currentPuzzleRef.current?.id;
      if (puzzleId) {
        setCompletedPuzzleIds((prev) => {
          if (!prev.includes(puzzleId)) {
            const updated = [...prev, puzzleId];
            try {
              localStorage.setItem("turtlesoup_completed_ids", JSON.stringify(updated));
            } catch (err) {
              console.warn("Failed to write completed puzzle list:", err);
            }
            return updated;
          }
          return prev;
        });
      }

      setTimeout(() => {
        saveCurrentGame("completed", true);
      }, 100);
      return;
    }

    // Increment round after every 2-3 questions
    const nextRound = Math.floor(questionCountRef.current / 2) + 1;
    setCurrentRound(nextRound);
    currentRoundRef.current = nextRound;

    // Auto save
    setTimeout(() => {
      if (gameStateRef.current === "playing") {
        saveCurrentGame("playing");
      }
    }, 200);

    // Trigger AI Player turn chance
    triggerAiPlayerIntervention();
  };

  // AI Players asking questions automatically
  const triggerAiPlayerIntervention = () => {
    const aiPlayers = activePlayersRef.current.filter((p) => p.isAi);
    if (aiPlayers.length === 0 || gameStateRef.current !== "playing") return;

    // 40% chance an AI player asks a question next
    if (Math.random() < 0.6) {
      setTimeout(async () => {
        if (gameStateRef.current !== "playing" || isPausedRef.current) return;

        const randomAi = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
        const puzzle = currentPuzzleRef.current;

        // Generate thematic question for AI
        let aiQuestion = "这件事与他的身份有关吗？";
        if (puzzle.sampleQuestions && puzzle.sampleQuestions.length > 0) {
          const unusedSamples = puzzle.sampleQuestions.filter(
            (sq) => !qnaHistoryRef.current.some((h) => h.question.includes(sq.question))
          );
          if (unusedSamples.length > 0) {
            aiQuestion = unusedSamples[Math.floor(Math.random() * unusedSamples.length)].question;
          }
        }

        setIsAiPlayerTurn(true);

        const aiQnA: TurtleSoupQnA = {
          id: `ai_qna_${Date.now()}`,
          askerId: randomAi.id,
          askerName: randomAi.name,
          askerAvatar: randomAi.avatar,
          question: aiQuestion,
          answer: "思考中...",
          timestamp: Date.now(),
        };

        const currentHist = [...qnaHistoryRef.current, aiQnA];
        setQnaHistory(currentHist);
        qnaHistoryRef.current = currentHist;

        const result = await evaluateQuestionByHost(aiQuestion, false);

        setIsAiPlayerTurn(false);

        const updated = currentHist.map((item) => {
          if (item.id === aiQnA.id) {
            return {
              ...item,
              answer: result.answer,
              hostComment: result.hostComment,
            };
          }
          return item;
        });

        setQnaHistory(updated);
        qnaHistoryRef.current = updated;

        saveCurrentGame("playing");
      }, 1500);
    }
  };

  // Give up / Reveal Solution
  const handleRevealSolution = () => {
    setRevealSolutionModal(false);
    setIsWon(false);
    isWonRef.current = false;
    setGameState("game_over");
    setIsPaused(false);
    setTimeout(() => {
      saveCurrentGame("completed", false);
    }, 100);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-neutral-900 select-none relative overflow-hidden animate-fade-in font-sans">
      {/* HEADER BAR */}
      <div className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-3 shrink-0 z-10">
        <button
          onClick={() => {
            if (gameState !== "setup") {
              if (gameState === "playing" && !isPaused) {
                saveCurrentGame("paused");
              }
              setGameState("setup");
              setIsPaused(false);
            } else {
              onClose();
            }
          }}
          className="p-2 hover:bg-neutral-100 rounded-[8px] transition text-neutral-900 active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="font-serif font-bold text-sm tracking-wide text-neutral-900 flex items-center gap-2">
          🐢 海龟汤 {gameState === "playing" && <span className="font-sans text-xs font-normal text-neutral-500">· 第 {currentRound} 轮 ({formatSeconds(gameElapsedSeconds)})</span>}
        </span>

        <div className="flex items-center gap-1.5">
          {/* History Archives button */}
          <button
            onClick={() => setHistoryModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-sans font-medium text-neutral-900 hover:bg-neutral-100 rounded-[8px] transition flex items-center gap-1 cursor-pointer border border-neutral-200"
            title="历史对局/存档"
          >
            <History className="w-3.5 h-3.5 text-neutral-900" />
            <span>历史</span>
            {savedGames.length > 0 && (
              <span className="bg-neutral-900 text-white text-[9px] px-1 rounded-full font-mono">
                {savedGames.length}
              </span>
            )}
          </button>

          {/* Pause / Resume button */}
          {gameState === "playing" && (
            <button
              onClick={isPaused ? handleResumeGame : handlePauseGame}
              className={`px-2.5 py-1.5 text-xs font-sans font-medium rounded-[8px] transition flex items-center gap-1 cursor-pointer border ${
                isPaused
                  ? "bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800"
                  : "bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-white" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? "继续" : "暂停"}</span>
            </button>
          )}

          <button
            onClick={() => setRuleModalOpen(true)}
            className="p-2 text-neutral-900 hover:bg-neutral-100 rounded-[8px] transition active:scale-95 cursor-pointer"
            title="查看玩法"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SETUP SCREEN */}
      {gameState === "setup" ? (
        <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto max-w-md mx-auto w-full animate-fade-in">
          <div className="space-y-6">
            <div className="text-center pt-2 space-y-1">
              <h1 className="font-serif text-2xl font-bold text-neutral-900 tracking-tight">
                海龟汤 · 情境推理
              </h1>
              <p className="text-xs text-neutral-500 font-sans">
                根据极简的“汤面”事件，通过提问问出真相“汤底”
              </p>
            </div>

            {/* Mode selection: Presets vs Custom */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                <span className="text-xs font-serif font-bold text-neutral-900">1. 选择海龟汤题目</span>
                <button
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className="text-xs text-neutral-600 hover:text-neutral-900 font-sans cursor-pointer underline"
                >
                  {isCustomMode ? "切换经典预设" : "自定义出题"}
                </button>
              </div>

              {!isCustomMode ? (
                <div className="space-y-3.5">
                  {/* Category filters & AI Generator button */}
                  <div className="space-y-2">
                    <div className="flex gap-1 bg-neutral-100 p-1 rounded-[10px]">
                      {([
                        { id: "all", label: "全部" },
                        { id: "presets", label: "经典预设" },
                        { id: "custom", label: "AI生成" },
                        { id: "completed", label: "已通关" }
                      ] as const).map((tab) => {
                        const isSelected = puzzleFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setPuzzleFilter(tab.id)}
                            className={`flex-1 py-1 text-[11px] font-bold rounded-[6px] transition cursor-pointer ${
                              isSelected
                                ? "bg-white text-neutral-900 shadow-2xs"
                                : "text-neutral-500 hover:text-neutral-900"
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateBatch}
                      disabled={isGenerating}
                      className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-300 text-white text-xs font-bold rounded-[8px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                      <span>{isGenerating ? "生成中..." : "✨ 生成一批 (5道)"}</span>
                    </button>
                  </div>

                  {/* Puzzle list */}
                  <div className="grid grid-cols-1 gap-2.5 max-h-[240px] overflow-y-auto pr-1">
                    {filteredPuzzles.length === 0 ? (
                      <div className="py-10 text-center text-xs text-neutral-400 font-sans">
                        暂无符合条件的海龟汤题目
                      </div>
                    ) : (
                      filteredPuzzles.map((p) => {
                        const isSelected = selectedPuzzleId === p.id;
                        const isCompleted = completedPuzzleIds.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPuzzleId(p.id)}
                            className={`p-3.5 rounded-[12px] border text-left transition cursor-pointer relative ${
                              isSelected
                                ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                                : "bg-white border-neutral-200 text-neutral-900 hover:border-neutral-400"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 pr-12">
                              <span className="font-serif font-bold text-xs truncate max-w-[160px]">{p.title}</span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono shrink-0 ${
                                  isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                                }`}
                              >
                                {p.category} · 难度 {"★".repeat(p.difficulty)}
                              </span>
                            </div>

                            {/* Completed Status Badge */}
                            {isCompleted && (
                              <span className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-600 text-white px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold tracking-wide uppercase shadow-2xs">
                                <CheckCircle2 className="w-2.5 h-2.5" /> 已通关
                              </span>
                            )}

                            <p className={`text-[11px] line-clamp-2 leading-relaxed mt-1.5 ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                              {p.surface}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-neutral-50 p-3.5 rounded-[12px] border border-neutral-200">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">汤面（公开给玩家）</label>
                    <textarea
                      value={customSurface}
                      onChange={(e) => setCustomSurface(e.target.value)}
                      placeholder="例：男子走进餐馆点了一碗海龟汤，尝了一口后自杀了。为什么？"
                      className="w-full text-xs p-2.5 bg-white border border-neutral-200 rounded-[8px] focus:outline-none focus:border-neutral-900 h-16 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-700 block mb-1">汤底（隐藏真相）</label>
                    <textarea
                      value={customBase}
                      onChange={(e) => setCustomBase(e.target.value)}
                      placeholder="例：当年男子遭遇海难与同伴困在荒岛..."
                      className="w-full text-xs p-2.5 bg-white border border-neutral-200 rounded-[8px] focus:outline-none focus:border-neutral-900 h-20 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Host Selection */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-neutral-900 block border-b border-neutral-100 pb-2">
                2. 指定主持人 (Host)
              </span>
              <select
                value={hostId}
                onChange={(e) => setHostId(e.target.value)}
                className="w-full p-3 bg-white border border-neutral-200 rounded-[10px] text-xs font-bold text-neutral-900 focus:outline-none focus:border-neutral-900 cursor-pointer"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.avatar} {c.name} {c.name.toLowerCase().includes("fafa") ? "（推荐默认）" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Players Selection */}
            <div className="space-y-2">
              <span className="text-xs font-serif font-bold text-neutral-900 block border-b border-neutral-100 pb-2">
                3. 选择参与对局的 AI 角色 (已选 {selectedPlayerIds.length + 1} 人)
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {characters
                  .filter((c) => c.id !== hostId)
                  .map((c) => {
                    const isSelected = selectedPlayerIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPlayerIds(selectedPlayerIds.filter((id) => id !== c.id));
                          } else {
                            if (selectedPlayerIds.length >= 5) return; // Limit total 6
                            setSelectedPlayerIds([...selectedPlayerIds, c.id]);
                          }
                        }}
                        className={`p-2.5 rounded-[10px] border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : "bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <PlayerAvatar avatar={c.chatAvatar || c.avatar} className="w-5 h-5" />
                          <span className="text-xs font-bold truncate">{c.name}</span>
                        </div>
                        {isSelected && <UserCheck className="w-3.5 h-3.5 text-white shrink-0" />}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={handleStartGame}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-sans font-bold text-xs rounded-[8px] active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-white" />
              开启海龟汤对局
            </button>
            <button
              onClick={() => setHistoryModalOpen(true)}
              className="w-full py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-900 font-sans font-bold text-xs rounded-[8px] active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-neutral-900" />
              查看历史对局 ({savedGames.length})
            </button>
          </div>
        </div>
      ) : (
        /* PLAYING GAME BOARD SCREEN */
        <div className="flex-1 flex flex-col justify-between relative bg-white overflow-hidden">
          {/* Top Section: Soup Surface & Players Row */}
          <div className="p-3 bg-white border-b border-neutral-200 shrink-0 space-y-3">
            {/* Host & Surface Card */}
            <div className="bg-white border border-neutral-200 p-3.5 rounded-[16px] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayerAvatar avatar={currentHost.avatar} className="w-6 h-6" />
                  <span className="text-xs font-serif font-bold text-neutral-900">
                    {currentHost.name}
                  </span>
                  <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-[9px] font-bold rounded-[4px] border border-neutral-200">
                    主持人
                  </span>
                </div>
                <button
                  onClick={() => setRevealSolutionModal(true)}
                  className="text-[10px] text-neutral-500 hover:text-neutral-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" /> 公布汤底
                </button>
              </div>

              <div className="pt-1">
                <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase mb-1">
                  【汤 面】SOUP SURFACE
                </div>
                <p className="text-xs font-sans text-neutral-900 font-medium leading-relaxed bg-neutral-50 p-2.5 rounded-[10px] border border-neutral-100">
                  {currentPuzzle.surface}
                </p>
              </div>
            </div>

            {/* Horizontal Players Row */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 px-1 scrollbar-none">
              <div className="text-[10px] font-bold text-neutral-400 shrink-0 mr-1">玩家:</div>
              {activePlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded-full shrink-0"
                >
                  <PlayerAvatar avatar={p.avatar} className="w-5 h-5" />
                  <span className="text-[11px] font-bold text-neutral-800">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Q&A Stream Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {qnaHistory.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30 stroke-1" />
                <p className="text-xs font-sans">对局已就绪，请在下方输入框向主持人提问或猜汤底</p>
                <p className="text-[10px] text-neutral-400">主持人仅回答：“是 / 否 / 无关 / 是与否无关 / 关键/接近”</p>
              </div>
            ) : (
              qnaHistory.map((qna) => (
                <div key={qna.id} className="space-y-2 animate-fade-in">
                  {/* Player Question / Guess Bubble */}
                  <div className="flex items-start gap-2.5 justify-end">
                    <div className="max-w-[80%] space-y-1">
                      <div className="flex items-center justify-end gap-1.5 text-[10px] text-neutral-400">
                        <span>{qna.askerName}</span>
                        {qna.isGuessSolution && (
                          <span className="bg-neutral-900 text-white px-1.5 py-0.2 rounded-full font-bold">
                            猜汤底
                          </span>
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-[14px] text-xs font-sans leading-relaxed text-right ${
                          qna.isGuessSolution
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-900 border border-neutral-200"
                        }`}
                      >
                        {qna.question}
                      </div>
                    </div>
                    <PlayerAvatar avatar={qna.askerAvatar} className="w-7 h-7 mt-4" />
                  </div>

                  {/* Host Answer Response */}
                  <div className="flex items-start gap-2.5 justify-start">
                    <PlayerAvatar avatar={currentHost.avatar} className="w-7 h-7 mt-1" />
                    <div className="max-w-[80%] space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                        <span className="font-bold text-neutral-900">{currentHost.name}</span>
                        <span className="bg-neutral-100 text-neutral-600 px-1 py-0.2 rounded-[4px] border border-neutral-200">
                          主持人
                        </span>
                      </div>
                      <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-[14px] text-xs font-sans space-y-1 shadow-2xs">
                        <div className="font-serif font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                          {qna.answer === "关键/接近" ? (
                            <span className="text-amber-600 flex items-center gap-1">
                              <Key className="w-4 h-4" /> 关键 / 接近！
                            </span>
                          ) : (
                            <span>{qna.answer}</span>
                          )}
                        </div>
                        {qna.hostComment && (
                          <p className="text-[11px] text-neutral-500 font-sans border-t border-neutral-200/60 pt-1 mt-1 leading-normal">
                            {qna.hostComment}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {isHostThinking && (
              <div className="flex items-center gap-2 text-xs text-neutral-400 italic py-2">
                <PlayerAvatar avatar={currentHost.avatar} className="w-5 h-5" />
                <span>主持人正在斟酌推断...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Controls / Input Area */}
          <div className="p-3 bg-white border-t border-neutral-200 space-y-2 shrink-0">
            {/* Input Mode Switch Tabs */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-[10px]">
              <button
                onClick={() => setInputMode("ask")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition cursor-pointer ${
                  inputMode === "ask"
                    ? "bg-white text-neutral-900 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                ❓ 向主持人提问
              </button>
              <button
                onClick={() => setInputMode("guess")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-[8px] transition cursor-pointer ${
                  inputMode === "guess"
                    ? "bg-neutral-900 text-white shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                💡 猜汤底（解开真相）
              </button>
            </div>

            {/* Input Field & Submit Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUserSubmit();
                }}
                disabled={isPaused || isHostThinking}
                placeholder={
                  inputMode === "ask"
                    ? "输入只回答'是/否/无关'的问题，如：男子以前喝过汤吗？"
                    : "输入完整的真相推论，提交给主持人判定..."
                }
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-[8px] px-3 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 disabled:opacity-50"
              />
              <button
                onClick={handleUserSubmit}
                disabled={!inputText.trim() || isPaused || isHostThinking}
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white font-bold text-xs rounded-[8px] transition cursor-pointer shrink-0 flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{inputMode === "ask" ? "提问" : "提交"}</span>
              </button>
            </div>
          </div>

          {/* PAUSED GAME OVERLAY */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fade-in">
              <div className="bg-white border border-neutral-200 p-6 rounded-[20px] w-full max-w-[300px] text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 bg-neutral-100 text-neutral-900 rounded-full flex items-center justify-center mx-auto border border-neutral-200">
                  <Pause className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-bold text-neutral-900">
                    游戏已暂停
                  </h3>
                  <p className="text-xs text-neutral-500 font-sans leading-relaxed">
                    所有操作已暂停，包含提问历史及局面已自动归档至本地。
                  </p>
                </div>

                <div className="p-3 bg-neutral-50 rounded-[12px] border border-neutral-200 text-left text-xs space-y-1.5 font-sans">
                  <div className="flex justify-between text-neutral-900">
                    <span className="text-neutral-500">题目:</span>
                    <span className="font-bold truncate max-w-[150px]">{currentPuzzle.title}</span>
                  </div>
                  <div className="flex justify-between text-neutral-900">
                    <span className="text-neutral-500">提问次数:</span>
                    <span className="font-mono font-bold">{questionCount} 次</span>
                  </div>
                  <div className="flex justify-between text-neutral-900">
                    <span className="text-neutral-500">耗费时间:</span>
                    <span className="font-mono font-bold">{formatSeconds(gameElapsedSeconds)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleResumeGame}
                    className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white font-sans text-xs font-bold rounded-[8px] transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    继续对局
                  </button>
                  <button
                    onClick={() => setHistoryModalOpen(true)}
                    className="w-full py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 active:scale-95 text-neutral-900 font-sans text-xs font-bold rounded-[8px] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-neutral-900" />
                    历史存档列表
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME OVER SETTLEMENT SCREEN */}
      {gameState === "game_over" && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in">
          <div className="space-y-5 text-center mt-4 max-w-sm mx-auto w-full">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-900 text-white font-serif font-bold text-2xl rounded-[16px] shadow-xs mb-1">
              {isWon ? "🎉" : "🔍"}
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-neutral-900">
                {isWon ? "破解成功！真相大白" : "本局海龟汤对局公布"}
              </h2>
              <p className="text-xs text-neutral-500 font-sans">
                {isWon ? "逻辑极其严密，成功拆解了全部线索" : "完整真相故事揭晓"}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-white rounded-[14px] border border-neutral-200 text-center">
                <span className="text-[10px] text-neutral-500 font-sans block">提问次数</span>
                <span className="text-sm font-serif font-bold text-neutral-900">{questionCount} 次</span>
              </div>
              <div className="p-3 bg-white rounded-[14px] border border-neutral-200 text-center">
                <span className="text-[10px] text-neutral-500 font-sans block">总用时长</span>
                <span className="text-sm font-mono font-bold text-neutral-900">{formatSeconds(gameElapsedSeconds)}</span>
              </div>
            </div>

            {/* Complete Soup Base Reveal Card */}
            <div className="p-4 bg-neutral-50 rounded-[16px] border border-neutral-200 text-left space-y-2">
              <div className="text-[10px] font-bold text-neutral-400 tracking-wider uppercase">
                【完整汤底揭秘】SOUP BASE REVEALED
              </div>
              <p className="text-xs font-sans text-neutral-900 leading-relaxed font-normal">
                {currentPuzzle.base}
              </p>
            </div>

            {/* Players involved */}
            <div className="text-left space-y-1.5">
              <div className="text-[10px] font-bold text-neutral-400 uppercase">参与玩家</div>
              <div className="flex flex-wrap gap-2">
                {activePlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-white border border-neutral-200 px-2.5 py-1 rounded-full text-xs">
                    <PlayerAvatar avatar={p.avatar} className="w-5 h-5" />
                    <span className="font-bold text-neutral-900">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-6 max-w-sm mx-auto w-full pt-4 border-t border-neutral-100">
            <button
              onClick={() => {
                setGameState("setup");
              }}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-sans font-bold text-xs rounded-[8px] active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-4 h-4" />
              再来一局
            </button>
            <button
              onClick={() => {
                setGameState("setup");
              }}
              className="w-full py-3 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-900 font-sans font-bold text-xs rounded-[8px] active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-4 h-4 text-neutral-900" />
              返回游戏大厅
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-neutral-400 hover:text-neutral-900 font-sans text-xs transition cursor-pointer"
            >
              退出应用
            </button>
          </div>
        </div>
      )}

      {/* HISTORY ARCHIVES MODAL */}
      {historyModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 p-5 rounded-[20px] w-full max-w-[340px] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3 shrink-0">
              <span className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-neutral-900" />
                历史对局存档 ({savedGames.length})
              </span>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-900 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savedGames.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto opacity-40 stroke-1" />
                <p className="text-xs">暂无历史对局存档</p>
                <p className="text-[10px] text-neutral-400">暂停或对局结束时将自动存档保存</p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                {savedGames.map((save) => {
                  const dateStr = new Date(save.startTime).toLocaleString("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={save.id}
                      onClick={() => loadSaveRecord(save)}
                      className="p-3.5 rounded-[14px] border border-neutral-200 hover:border-neutral-900 bg-white text-left transition cursor-pointer active:scale-[0.98] relative group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-xs text-neutral-900">{save.title}</span>
                            {save.status === "completed" ? (
                              <span className="px-1.5 py-0.5 text-[9px] bg-neutral-100 text-neutral-900 font-bold rounded-[4px]">
                                {save.isWon ? "已破解" : "已完结"}
                              </span>
                            ) : save.status === "paused" ? (
                              <span className="px-1.5 py-0.5 text-[9px] bg-amber-100 text-amber-800 font-bold rounded-[4px]">
                                已暂停
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 font-bold rounded-[4px]">
                                进行中
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {dateStr}
                          </span>
                        </div>

                        <button
                          onClick={(e) => deleteSaveRecord(save.id, e)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition cursor-pointer"
                          title="删除存档"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-900">
                        <span className="text-neutral-500">
                          {save.players.length}人局 · 轮次: 第{save.currentRound}轮
                        </span>
                        <span className="font-mono font-medium">
                          {save.questionCount}次提问 / {formatSeconds(save.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVEAL SOLUTION CONFIRM MODAL */}
      {revealSolutionModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 p-5 rounded-[20px] w-full max-w-[300px] text-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <Eye className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-serif font-bold text-neutral-900">确认公布汤底真相？</h3>
              <p className="text-xs text-neutral-500 font-sans">
                公布后本局游戏将直接结束并展现完整汤底。
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRevealSolutionModal(false)}
                className="flex-1 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-900 font-bold text-xs rounded-[8px]"
              >
                继续思考
              </button>
              <button
                onClick={handleRevealSolution}
                className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-[8px]"
              >
                确认公布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RULE MODAL */}
      {ruleModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 p-5 rounded-[20px] w-full max-w-[320px] space-y-3 shadow-2xl font-sans text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="font-serif font-bold text-sm text-neutral-900">🐢 海龟汤规则</span>
              <button onClick={() => setRuleModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
            <div className="space-y-2 text-neutral-700 leading-relaxed">
              <p>1. **汤面**：主持人公布一段表面匪夷所思的事件描述。</p>
              <p>2. **提问**：玩家向主持人提问，主持人仅回答：“是 / 否 / 无关 / 是与否无关 / 关键/接近”。</p>
              <p>3. **猜汤底**：觉得推离真相不远时，切换到“猜汤底”模式提交完整事件推理。</p>
              <p>4. **存档**：随时点击右上角暂停自动存盘，可在“历史对局”中无缝恢复。</p>
            </div>
            <button
              onClick={() => setRuleModalOpen(false)}
              className="w-full py-2 bg-neutral-900 text-white font-bold text-xs rounded-[8px]"
            >
              了解规则
            </button>
          </div>
        </div>
      )}

      {/* BATCH GENERATION PREVIEW MODAL */}
      {showPreviewModal && generatedBatch && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 p-5 rounded-[20px] w-full max-w-[420px] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3 shrink-0">
              <span className="text-sm font-serif font-bold text-neutral-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                AI 批量出题结果预览 (5道)
              </span>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setGeneratedBatch(null);
                }}
                className="p-1 hover:bg-neutral-100 rounded-full text-neutral-900 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-500 mb-3 leading-relaxed">
              请从中选择 <strong>1 道</strong> 启动当前对局，其余 4 道未选择的题目将<strong>自动存入本地题库</strong>，供后续游玩。
            </p>

            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 pb-4">
              {generatedBatch.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-[14px] border border-neutral-200 bg-neutral-50 text-left space-y-2.5 hover:border-neutral-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-xs text-neutral-900">
                      {p.title}
                    </span>
                    <span className="text-[9px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                      {p.category} · ★{p.difficulty}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase">
                      【汤面】
                    </div>
                    <p className="text-[11px] text-neutral-700 leading-relaxed bg-white p-2 border border-neutral-100 rounded-[8px]">
                      {p.surface}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase">
                      【汤底】
                    </div>
                    <p className="text-[11px] text-neutral-600 leading-relaxed bg-white p-2 border border-neutral-100 rounded-[8px]">
                      {p.base}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelectPuzzleFromBatch(p)}
                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-sans text-xs font-bold rounded-[8px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                  >
                    选择此题作为本局游戏
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

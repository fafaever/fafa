import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, Volume2, VolumeX, RotateCw, RotateCcw, AlertCircle, Sparkles, Check, HelpCircle, Pause, Play, History, Save, Trash2, Clock, Trophy, Award, FolderOpen, X } from "lucide-react";
import { Character, AppSettings } from "../types";

// Card Definitions
export interface UnoCard {
  id: string;
  color: "red" | "yellow" | "green" | "blue" | "wild";
  type: "number" | "skip" | "reverse" | "draw_two" | "wild_color" | "wild_draw_four";
  value?: number; // 0-9
}

// Player Definitions
export interface UnoPlayer {
  id: string; // "user" for user, custom character IDs for AI
  name: string;
  avatar: string;
  isAi: boolean;
  cards: UnoCard[];
  recentDialogue?: string;
  dialogueTimeout?: NodeJS.Timeout;
  character?: Character;
  isUnoCalled: boolean;
  rank?: number; // Winner rank: 1st, 2nd, etc.
}

export interface UnoSaveRecord {
  id: string;
  title: string;
  startTime: number;
  updatedTime: number;
  durationSeconds: number;
  moveCount: number;
  currentTurn: number;
  playDirection: number;
  currentColor: "red" | "yellow" | "green" | "blue" | "";
  status: "playing" | "paused" | "completed";
  playerCount: number;
  winnerName?: string;
  userRank?: number;
  players: UnoPlayer[];
  deck: UnoCard[];
  discardPile: UnoCard[];
  winners: string[];
}

interface UnoGameAppProps {
  characters: Character[];
  settings: AppSettings;
  onClose: () => void;
}

// Sound synthesizer using Web Audio API
const playSynthSound = (type: "click" | "draw" | "win" | "skip" | "penalty" | "uno" | "reverse", muted: boolean) => {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    if (type === "click") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "draw") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "win") {
      // Ascending chord chime
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        gain.gain.setValueAtTime(0.06, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.005, now + index * 0.08 + 0.25);
        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.25);
      });
    } else if (type === "skip") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "reverse") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(540, now + 0.1);
      osc.frequency.linearRampToValueAtTime(440, now + 0.2);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === "penalty") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "uno") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.08);
      osc.frequency.setValueAtTime(800, now + 0.16);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    // Audio Context not started or supported
  }
};

// Generate standard 108 UNO Cards deck
const createUnoDeck = (): UnoCard[] => {
  const deck: UnoCard[] = [];
  const colors: Array<"red" | "yellow" | "green" | "blue"> = ["red", "yellow", "green", "blue"];
  let idCounter = 1;

  colors.forEach((color) => {
    // One 0 card
    deck.push({ id: `card-${idCounter++}`, color, type: "number", value: 0 });
    
    // Two of each 1-9
    for (let val = 1; val <= 9; val++) {
      deck.push({ id: `card-${idCounter++}`, color, type: "number", value: val });
      deck.push({ id: `card-${idCounter++}`, color, type: "number", value: val });
    }

    // Two of each action card: Skip, Reverse, Draw Two
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `card-${idCounter++}`, color, type: "skip" });
      deck.push({ id: `card-${idCounter++}`, color, type: "reverse" });
      deck.push({ id: `card-${idCounter++}`, color, type: "draw_two" });
    }
  });

  // Four Wild and Four Wild Draw Four
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${idCounter++}`, color: "wild", type: "wild_color" });
    deck.push({ id: `card-${idCounter++}`, color: "wild", type: "wild_draw_four" });
  }

  return deck;
};

// Shuffle function
const shuffleDeck = (deck: UnoCard[]): UnoCard[] => {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function UnoGameApp({ characters, settings, onClose }: UnoGameAppProps) {
  // App screen modes: 'setup' | 'playing' | 'game_over'
  const [gameState, setGameState] = useState<"setup" | "playing" | "game_over">("setup");
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [ruleDialog, setRuleDialog] = useState<boolean>(false);

  // Character selection states for opponents
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  
  // Game Play States
  const [players, setPlayers] = useState<UnoPlayer[]>([]);
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [currentColor, setCurrentColor] = useState<"red" | "yellow" | "green" | "blue" | "">("");
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [playDirection, setPlayDirection] = useState<number>(1); // 1 = clockwise, -1 = counter-clockwise
  const [winners, setWinners] = useState<string[]>([]); // Array of player IDs in winning order

  // Interactive popup states
  const [colorChooseOpen, setColorChooseOpen] = useState<boolean>(false);
  const [activeWildCard, setActiveWildCard] = useState<UnoCard | null>(null);
  
  // Visual banner state for action notifications (e.g. "+4 Color", "Skip!")
  const [gameBanner, setGameBanner] = useState<{ title: string; subtitle: string; colorClass: string } | null>(null);

  // Challenge / Forgot UNO state
  const [pendingUnoCheck, setPendingUnoCheck] = useState<{ playerId: string; timerId: NodeJS.Timeout } | null>(null);

  // Local state to block inputs during AI turns or animations
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  // Pause & Save Game States
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  const [gameElapsedSeconds, setGameElapsedSeconds] = useState<number>(0);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [currentGameSaveId, setCurrentGameSaveId] = useState<string | null>(null);

  // History modal state
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [savedGames, setSavedGames] = useState<UnoSaveRecord[]>([]);

  // Refs for tracking state inside callbacks and async handlers
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const gameStartTimeRef = useRef(gameStartTime);
  gameStartTimeRef.current = gameStartTime;

  const gameElapsedSecondsRef = useRef(gameElapsedSeconds);
  gameElapsedSecondsRef.current = gameElapsedSeconds;

  const moveCountRef = useRef(moveCount);
  moveCountRef.current = moveCount;

  const currentGameSaveIdRef = useRef(currentGameSaveId);
  currentGameSaveIdRef.current = currentGameSaveId;

  const winnersRef = useRef(winners);
  winnersRef.current = winners;

  // Refs for tracking up-to-date state inside asynchronous turn loops
  const currentTurnRef = useRef(currentTurn);
  currentTurnRef.current = currentTurn;

  const playersRef = useRef(players);
  playersRef.current = players;

  const deckRef = useRef(deck);
  deckRef.current = deck;

  const discardPileRef = useRef(discardPile);
  discardPileRef.current = discardPile;

  const currentColorRef = useRef(currentColor);
  currentColorRef.current = currentColor;

  const playDirectionRef = useRef(playDirection);
  playDirectionRef.current = playDirection;

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const processedTurnRef = useRef<number | null>(null);

  // Load saved games from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("uno_saved_games");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedGames(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to load saved games from localStorage", e);
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

  // Format seconds to MM:SS
  const formatSeconds = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Save current game state to localStorage
  const saveCurrentGame = (status: "playing" | "paused" | "completed") => {
    try {
      const currentPlayersList = playersRef.current;
      if (currentPlayersList.length === 0) return;

      let saveId = currentGameSaveIdRef.current;
      if (!saveId) {
        saveId = `uno_save_${Date.now()}`;
        setCurrentGameSaveId(saveId);
        currentGameSaveIdRef.current = saveId;
      }

      const userWinIdx = winnersRef.current.indexOf("user");
      const winnerName = winnersRef.current.length > 0
        ? (currentPlayersList.find(p => p.id === winnersRef.current[0])?.name || "")
        : undefined;

      const record: UnoSaveRecord = {
        id: saveId,
        title: `对局 #${saveId.slice(-6)}`,
        startTime: gameStartTimeRef.current || Date.now(),
        updatedTime: Date.now(),
        durationSeconds: gameElapsedSecondsRef.current,
        moveCount: moveCountRef.current,
        currentTurn: currentTurnRef.current,
        playDirection: playDirectionRef.current,
        currentColor: currentColorRef.current,
        status,
        playerCount: currentPlayersList.length,
        winnerName,
        userRank: userWinIdx !== -1 ? userWinIdx + 1 : (status === "completed" ? currentPlayersList.length : undefined),
        players: currentPlayersList,
        deck: deckRef.current,
        discardPile: discardPileRef.current,
        winners: winnersRef.current,
      };

      setSavedGames((prev) => {
        const filtered = prev.filter((item) => item.id !== saveId);
        const updated = [record, ...filtered];
        try {
          localStorage.setItem("uno_saved_games", JSON.stringify(updated));
        } catch (e) {
          console.warn("localStorage write failed", e);
        }
        return updated;
      });
    } catch (err) {
      console.error("Save game error:", err);
    }
  };

  // Pause & Resume Game Handlers
  const handlePauseGame = () => {
    playSynthSound("click", soundMuted);
    setIsPaused(true);
    isPausedRef.current = true;
    saveCurrentGame("paused");
  };

  const handleResumeGame = () => {
    playSynthSound("click", soundMuted);
    setIsPaused(false);
    isPausedRef.current = false;
    saveCurrentGame("playing");
  };

  // Load a save record from history
  const loadSaveRecord = (record: UnoSaveRecord) => {
    playSynthSound("click", soundMuted);
    setCurrentGameSaveId(record.id);
    currentGameSaveIdRef.current = record.id;

    setPlayers(record.players);
    playersRef.current = record.players;

    setDeck(record.deck);
    deckRef.current = record.deck;

    setDiscardPile(record.discardPile);
    discardPileRef.current = record.discardPile;

    setCurrentColor(record.currentColor);
    currentColorRef.current = record.currentColor;

    setCurrentTurn(record.currentTurn);
    currentTurnRef.current = record.currentTurn;

    setPlayDirection(record.playDirection);
    playDirectionRef.current = record.playDirection;

    setWinners(record.winners || []);
    winnersRef.current = record.winners || [];

    setMoveCount(record.moveCount || 0);
    moveCountRef.current = record.moveCount || 0;

    setGameElapsedSeconds(record.durationSeconds || 0);
    gameElapsedSecondsRef.current = record.durationSeconds || 0;

    setGameStartTime(record.startTime || Date.now());
    gameStartTimeRef.current = record.startTime || Date.now();

    setHistoryModalOpen(false);

    if (record.status === "completed") {
      setGameState("game_over");
      setIsPaused(false);
    } else {
      setGameState("playing");
      setIsPaused(record.status === "paused");
      triggerBanner("已恢复对局", `载入存档: ${record.title}`, "bg-emerald-600");
    }
  };

  // Delete a save record
  const deleteSaveRecord = (recordId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playSynthSound("click", soundMuted);
    setSavedGames((prev) => {
      const updated = prev.filter((r) => r.id !== recordId);
      try {
        localStorage.setItem("uno_saved_games", JSON.stringify(updated));
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

  // Initialize selected characters on mount or when characters list updates
  useEffect(() => {
    // Grab the first N-1 characters as default selected opponents
    const available = characters.length > 0 ? characters : [];
    const defaults = available.slice(0, playerCount - 1).map(c => c.id);
    setSelectedCharIds(defaults);
  }, [playerCount, characters]);

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (pendingUnoCheck?.timerId) {
        clearTimeout(pendingUnoCheck.timerId);
      }
    };
  }, [pendingUnoCheck]);

  // Trigger AI turn if it is an AI player's turn
  useEffect(() => {
    if (gameState !== "playing" || isPaused) {
      processedTurnRef.current = null;
      return;
    }

    const activePlayer = players[currentTurn];
    if (!activePlayer) return;

    if (activePlayer.isAi) {
      if (processedTurnRef.current === currentTurn) {
        return;
      }
      processedTurnRef.current = currentTurn;
      setIsAiProcessing(true);

      const timer = setTimeout(() => {
        handleAiTurn(currentTurn);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    } else {
      processedTurnRef.current = null;
      setIsAiProcessing(false);
    }
  }, [currentTurn, gameState]);

  // Helper to trigger real-time AI dialogues
  const triggerPlayerDialogue = async (playerIndex: number, event: string, cardDetails?: string, forcedContext?: string) => {
    const player = players[playerIndex];
    if (!player || !player.isAi || !player.character) return;

    // Build context
    const relativeCardsStr = players.map(p => `${p.name}剩余${p.cards.length}张`).join("，");
    const gameContext = forcedContext || `当前局势：自己手牌还剩 ${player.cards.length} 张牌。其他玩家：${relativeCardsStr}。当前出牌区顶部是：${getCardReadableName(discardPile[discardPile.length - 1])}。`;

    // Fast local fallback first to ensure instant UI response
    let offlineDialogue = "";
    if (event === "START") {
      offlineDialogue = `加油哦！今天的UNO赢家一定是我！✨`;
    } else if (event === "PLAY_CARD") {
      offlineDialogue = `看我的，出一张${cardDetails || "牌"}！(•̀ᴗ•́)و`;
    } else if (event === "DRAW_CARD") {
      offlineDialogue = `唉……没有能出的卡，只能摸牌了。`;
    } else if (event === "SKIPPED") {
      offlineDialogue = `啊，怎么把我跳过了呀！讨厌~💢`;
    } else if (event === "TARGETED_DRAW") {
      offlineDialogue = `好狠心呀！居然扔给我这张牌，手牌越来越多了……`;
    } else if (event === "UNO") {
      offlineDialogue = `喊出来：UNO！我只剩最后一张卡牌咯，千万别眨眼！😎`;
    } else if (event === "WIN") {
      offlineDialogue = `太棒啦！我赢了这局UNO！🎉`;
    } else if (event === "LOSE") {
      offlineDialogue = `好遗憾，手气不太好，下次我一定会赢回来的！`;
    } else {
      offlineDialogue = `该到我出牌了，让我想想……`;
    }

    // Set fallback immediately
    updatePlayerDialogueState(playerIndex, offlineDialogue);

    // Call server endpoint for customized, highly-personalized AI dialogue
    try {
      const res = await fetch("/api/uno-dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: player.character,
          event,
          cardDetails,
          context: gameContext,
          settings,
        }),
      });
      const data = await res.json();
      if (res.ok && data.dialogue) {
        updatePlayerDialogueState(playerIndex, data.dialogue);
      }
    } catch (err) {
      console.warn("Could not fetch custom AI dialogue, staying with fallback:", err);
    }
  };

  const updatePlayerDialogueState = (playerIndex: number, dialogueText: string) => {
    setPlayers(prev => {
      return prev.map((p, idx) => {
        if (idx === playerIndex) {
          // Clear old timeout if any
          if (p.dialogueTimeout) {
            clearTimeout(p.dialogueTimeout);
          }
          // Set new auto-dismiss timeout
          const tId = setTimeout(() => {
            setPlayers(current => current.map((currP, cIdx) => {
              if (cIdx === playerIndex) {
                return { ...currP, recentDialogue: undefined, dialogueTimeout: undefined };
              }
              return currP;
            }));
          }, 5000); // 5 seconds display

          return { ...p, recentDialogue: dialogueText, dialogueTimeout: tId };
        }
        return p;
      });
    });
  };

  // Helper translations for cards
  const getCardReadableName = (card: UnoCard | undefined): string => {
    if (!card) return "无";
    const colorNames = { red: "红色", yellow: "黄色", green: "绿色", blue: "蓝色", wild: "黑色" };
    const typeNames = {
      number: `${card.value}`,
      skip: "🚫跳过",
      reverse: "⇄反转",
      draw_two: "🃏+2牌",
      wild_color: "🌈变色",
      wild_draw_four: "🔥+4大魔王"
    };
    return `${colorNames[card.color]} ${typeNames[card.type]}`;
  };

  // Check card compatibility
  const isCardPlayable = (card: UnoCard): boolean => {
    if (discardPile.length === 0) return true;
    const topCard = discardPile[discardPile.length - 1];
    
    // Wild cards are always playable
    if (card.color === "wild") return true;

    // Check if matching color
    if (card.color === currentColor) return true;

    // Check if matching symbol or number
    if (card.type === topCard.type) {
      if (card.type === "number") {
        return card.value === topCard.value;
      }
      return true;
    }

    return false;
  };

  // Show center event banner
  const triggerBanner = (title: string, subtitle: string, colorClass: string) => {
    setGameBanner({ title, subtitle, colorClass });
    const timer = setTimeout(() => {
      setGameBanner(null);
    }, 1500);
  };

  // Setup / Start a new game
  const handleStartGame = () => {
    playSynthSound("click", soundMuted);
    
    // Generate deck and shuffle
    const fullDeck = shuffleDeck(createUnoDeck());
    
    // Initialize Players list
    const activeOpponents: UnoPlayer[] = [];
    
    // Choose selected characters as opponents
    for (let i = 0; i < playerCount - 1; i++) {
      const charId = selectedCharIds[i];
      const char = characters.find(c => c.id === charId);
      if (char) {
        activeOpponents.push({
          id: char.id,
          name: char.name,
          avatar: char.avatar || "🤖",
          isAi: true,
          cards: [],
          isUnoCalled: false,
          character: char,
        });
      } else {
        // Fallback default AI characters if none selected or found
        const fallbackNames = ["小糖", "阿遥", "猫咪助理", "极客小哥"];
        const fallbackEmojis = ["🍬", "🦊", "🐱", "💻"];
        activeOpponents.push({
          id: `fallback-ai-${i}`,
          name: fallbackNames[i % fallbackNames.length],
          avatar: fallbackEmojis[i % fallbackEmojis.length],
          isAi: true,
          cards: [],
          isUnoCalled: false,
        });
      }
    }

    const allPlayers: UnoPlayer[] = [
      {
        id: "user",
        name: "你",
        avatar: "👤",
        isAi: false,
        cards: [],
        isUnoCalled: false,
      },
      ...activeOpponents
    ];

    // Deal 7 cards to each player
    const dealtDeck = [...fullDeck];
    allPlayers.forEach(p => {
      p.cards = dealtDeck.splice(0, 7);
    });

    // Flip the first non-wild card to discard pile
    let startingCardIndex = dealtDeck.findIndex(c => c.color !== "wild");
    if (startingCardIndex === -1) startingCardIndex = 0;
    const [startingCard] = dealtDeck.splice(startingCardIndex, 1);

    setDeck(dealtDeck);
    deckRef.current = dealtDeck;

    setDiscardPile([startingCard]);
    discardPileRef.current = [startingCard];

    setCurrentColor(startingCard.color as any);
    currentColorRef.current = startingCard.color as any;

    setPlayers(allPlayers);
    playersRef.current = allPlayers;

    setWinners([]);
    winnersRef.current = [];

    setCurrentTurn(0);
    currentTurnRef.current = 0;

    setPlayDirection(1);
    playDirectionRef.current = 1;

    setMoveCount(0);
    moveCountRef.current = 0;

    setGameElapsedSeconds(0);
    gameElapsedSecondsRef.current = 0;

    const now = Date.now();
    setGameStartTime(now);
    gameStartTimeRef.current = now;

    const saveId = `uno_save_${now}`;
    setCurrentGameSaveId(saveId);
    currentGameSaveIdRef.current = saveId;

    setIsPaused(false);
    isPausedRef.current = false;

    setGameState("playing");
    setIsAiProcessing(false);
    setPendingUnoCheck(null);

    triggerBanner("游戏开始！", "每位玩家已分发 7 张手牌", "bg-emerald-600");

    setTimeout(() => {
      saveCurrentGame("playing");
    }, 100);

    // Let AI players say hello
    setTimeout(() => {
      allPlayers.forEach((p, idx) => {
        if (p.isAi) {
          triggerPlayerDialogue(idx, "START");
        }
      });
    }, 1200);
  };

  // Handle Turn Advancement
  const advanceTurn = (steps = 1, currentPlayersList = playersRef.current, fromTurnIndex = currentTurnRef.current) => {
    const total = currentPlayersList.length;
    let nextTurn = (fromTurnIndex + playDirectionRef.current * steps) % total;
    if (nextTurn < 0) nextTurn += total;

    // Find next player who is NOT finished (has cards left)
    let checks = 0;
    while (currentPlayersList[nextTurn]?.cards.length === 0 && checks < total) {
      nextTurn = (nextTurn + playDirectionRef.current) % total;
      if (nextTurn < 0) nextTurn += total;
      checks++;
    }

    setCurrentTurn(nextTurn);
    currentTurnRef.current = nextTurn;
    setIsAiProcessing(false);

    // Auto save game state on turn advance
    setTimeout(() => {
      if (gameStateRef.current === "playing") {
        saveCurrentGame("playing");
      }
    }, 200);
  };

  // Draw card function
  const drawCardsForPlayer = (playerIndex: number, count: number, deckState = deckRef.current, playersState = playersRef.current): { newDeck: UnoCard[]; newPlayers: UnoPlayer[] } => {
    let currentDeck = [...deckState];
    let currentPlayers = [...playersState];

    // If deck is empty, reshuffle discard pile (except top card)
    if (currentDeck.length < count) {
      const topDiscard = discardPileRef.current[discardPileRef.current.length - 1];
      const remainingDiscard = discardPileRef.current.slice(0, -1);
      if (remainingDiscard.length > 0) {
        currentDeck = [...currentDeck, ...shuffleDeck(remainingDiscard)];
        setDiscardPile([topDiscard]);
      } else {
        // Fallback: regenerate cards if extremely low
        currentDeck = [...currentDeck, ...shuffleDeck(createUnoDeck())];
      }
    }

    const drawn = currentDeck.splice(0, count);
    currentPlayers[playerIndex] = {
      ...currentPlayers[playerIndex],
      cards: [...currentPlayers[playerIndex].cards, ...drawn],
      isUnoCalled: false, // Reset UNO call upon drawing cards
    };

    return { newDeck: currentDeck, newPlayers: currentPlayers };
  };

  // User plays a card
  const handlePlayCard = (card: UnoCard) => {
    if (gameState !== "playing" || currentTurn !== 0 || isAiProcessing || isPaused) return;
    if (!isCardPlayable(card)) {
      playSynthSound("penalty", soundMuted);
      return;
    }

    executePlayCardAction(0, card);
  };

  // Execute card action for either user or AI
  const executePlayCardAction = (
    playerIndex: number,
    card: UnoCard,
    overrideChosenColor?: "red" | "yellow" | "green" | "blue",
    overrideDialogue?: string
  ) => {
    playSynthSound("click", soundMuted);

    // Track move count
    setMoveCount((prev) => prev + 1);
    moveCountRef.current += 1;

    // Remove card from player hand
    let updatedPlayers = playersRef.current.map((p, idx) => {
      if (idx === playerIndex) {
        return {
          ...p,
          cards: p.cards.filter((c) => c.id !== card.id),
        };
      }
      return p;
    });

    const activePlayer = updatedPlayers[playerIndex];

    // Push card to discard pile
    const updatedDiscard = [...discardPileRef.current, card];
    setDiscardPile(updatedDiscard);
    discardPileRef.current = updatedDiscard;

    if (overrideDialogue) {
      updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], dialogue: overrideDialogue };
    }

    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;

    // Check Win condition
    if (activePlayer.cards.length === 0) {
      const rankName = ["冠军 (1st)", "亚军 (2nd)", "季军 (3rd)", "第四名", "第五名", "第六名"][winners.length];
      triggerBanner(`${activePlayer.name} 出完牌了！`, `荣获比赛：${rankName}`, "bg-yellow-500");
      playSynthSound("win", soundMuted);

      // Record Winner
      const updatedWinners = [...winners, activePlayer.id];
      setWinners(updatedWinners);
      winnersRef.current = updatedWinners;

      // If only one player remaining with cards, or user won and we decide to finish
      const remainingWithCards = updatedPlayers.filter((p) => p.cards.length > 0);
      if (remainingWithCards.length <= 1 || activePlayer.id === "user" || winners.length >= playersRef.current.length - 1) {
        // End game
        setGameState("game_over");
        setIsPaused(false);
        if (activePlayer.isAi) {
          triggerPlayerDialogue(playerIndex, "WIN");
        }
        setTimeout(() => {
          saveCurrentGame("completed");
        }, 100);
        return;
      }
    }

    let nextTurnStep = 1;

    // Check if player is down to 1 card and forgot to call UNO
    if (activePlayer.cards.length === 1 && !activePlayer.isUnoCalled) {
      if (activePlayer.isAi) {
        updatedPlayers[playerIndex].isUnoCalled = true;
        setTimeout(() => {
          playSynthSound("uno", soundMuted);
          triggerPlayerDialogue(playerIndex, "UNO");
        }, 300);
      } else {
        const timerId = setTimeout(() => {
          catchUserForgotUno();
        }, 2500);
        setPendingUnoCheck({ playerId: "user", timerId });
      }
    }

    // Set active game color
    if (card.color === "wild") {
      setActiveWildCard(card);
      if (activePlayer.isAi) {
        let chosenColor = overrideChosenColor;
        if (!chosenColor) {
          const colorCounts = { red: 0, yellow: 0, green: 0, blue: 0 };
          activePlayer.cards.forEach(c => {
            if (c.color !== "wild") colorCounts[c.color]++;
          });
          chosenColor = (Object.keys(colorCounts) as Array<"red" | "yellow" | "green" | "blue">).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b);
        }

        setCurrentColor(chosenColor);
        triggerBanner(`${activePlayer.name} 指定颜色`, `当前局面转为: ${chosenColor === "red" ? "● 红色" : chosenColor === "yellow" ? "○ 黄色" : chosenColor === "green" ? "▲ 绿色" : "■ 蓝色"}`, "bg-neutral-800");
        
        // Handle Wild Draw Four logic
        if (card.type === "wild_draw_four") {
          applySpecialDrawTurn(playerIndex, 4, chosenColor, updatedPlayers);
          return;
        } else {
          if (!overrideDialogue) {
            triggerPlayerDialogue(playerIndex, "PLAY_CARD", "变色卡", `我打出了变色卡，换成${chosenColor === "red" ? "红色" : chosenColor === "yellow" ? "黄色" : chosenColor === "green" ? "绿色" : "蓝色"}吧！`);
          }
          setPlayers(updatedPlayers);
          advanceTurn(1, updatedPlayers, playerIndex);
        }
      } else {
        // Open color selector for user
        setPlayers(updatedPlayers);
        setColorChooseOpen(true);
        return;
      }
    } else {
      // Normal colored card
      setCurrentColor(card.color);
      
      // Special actions
      if (card.type === "skip") {
        playSynthSound("skip", soundMuted);
        nextTurnStep = 2;
        const skippedIndex = (playerIndex + playDirectionRef.current) % playersRef.current.length;
        const skippedPlayer = playersRef.current[skippedIndex < 0 ? skippedIndex + playersRef.current.length : skippedIndex];
        triggerBanner(`${skippedPlayer.name} 被跳过`, "🚫 回合取消", "bg-orange-600");
        
        if (skippedPlayer.isAi) {
          const skippedIdx = skippedIndex < 0 ? skippedIndex + playersRef.current.length : skippedIndex;
          setTimeout(() => {
            triggerPlayerDialogue(skippedIdx, "SKIPPED");
          }, 400);
        }
        
        if (!overrideDialogue) {
          triggerPlayerDialogue(playerIndex, "PLAY_CARD", getCardReadableName(card), `看我的！跳过${skippedPlayer.name}的回合！`);
        }
      } else if (card.type === "reverse") {
        playSynthSound("reverse", soundMuted);
        const newDir = -1 * playDirectionRef.current;
        setPlayDirection(newDir);
        triggerBanner("牌局反转！", newDir === 1 ? "➡️ 顺时针方向" : "⬅️ 逆时针方向", "bg-purple-600");
        
        if (playersRef.current.length === 2) {
          nextTurnStep = 2;
        } else {
          nextTurnStep = 1;
        }

        if (!overrideDialogue) {
          triggerPlayerDialogue(playerIndex, "PLAY_CARD", "反转卡", `转一转，方向反转！现在轮到另一边咯~`);
        }
      } else if (card.type === "draw_two") {
        applySpecialDrawTurn(playerIndex, 2, card.color, updatedPlayers);
        return;
      } else {
        if (!overrideDialogue) {
          triggerPlayerDialogue(playerIndex, "PLAY_CARD", getCardReadableName(card));
        }
      }

      setPlayers(updatedPlayers);
      advanceTurn(nextTurnStep, updatedPlayers, playerIndex);
    }
  };

  // Penalize or draw special cards (+2 or +4)
  const applySpecialDrawTurn = (currentPlayerIndex: number, count: number, activeColor: "red" | "yellow" | "green" | "blue" | "wild", currentPlayersList: UnoPlayer[]) => {
    // Determine target player
    const targetIndex = (currentPlayerIndex + playDirectionRef.current) % currentPlayersList.length;
    const finalTargetIndex = targetIndex < 0 ? targetIndex + currentPlayersList.length : targetIndex;
    const targetPlayer = currentPlayersList[finalTargetIndex];

    triggerBanner(`${targetPlayer.name} 惨遭惩罚`, `📥 罚摸 ${count} 张牌并被跳过回合`, "bg-rose-700");
    playSynthSound("penalty", soundMuted);

    const { newDeck, newPlayers } = drawCardsForPlayer(finalTargetIndex, count, deckRef.current, currentPlayersList);
    setDeck(newDeck);
    
    // Set color if wild +4
    if (count === 4) {
      setCurrentColor(activeColor as any);
    }

    setPlayers(newPlayers);
    
    // AI Dialogues for both attacker and victim
    setTimeout(() => {
      triggerPlayerDialogue(currentPlayerIndex, "PLAY_CARD", count === 4 ? "+4卡" : "+2卡", `抱歉啦${targetPlayer.name}，送你${count}张手牌，顺便休息一下吧！`);
    }, 300);

    setTimeout(() => {
      triggerPlayerDialogue(finalTargetIndex, "TARGETED_DRAW", count === 4 ? "+4卡" : "+2卡");
    }, 1000);

    // Skip the target player's turn completely
    advanceTurn(2, newPlayers, currentPlayerIndex);
  };

  // User manually calls UNO
  const handleUserCallUno = () => {
    if (gameState !== "playing" || isAiProcessing || isPaused) return;

    // Set user UNO called state
    setPlayers((prev) => {
      return prev.map((p) => {
        if (p.id === "user") {
          return { ...p, isUnoCalled: true };
        }
        return p;
      });
    });

    playSynthSound("uno", soundMuted);
    triggerBanner("你大喊：UNO！", "成功保命！手牌仅剩 1 张", "bg-blue-600");

    // Clear forgot timer if it was pending
    if (pendingUnoCheck) {
      clearTimeout(pendingUnoCheck.timerId);
      setPendingUnoCheck(null);
    }
  };

  // User forgot to call UNO penalty
  const catchUserForgotUno = () => {
    setPendingUnoCheck(null);
    
    // Make a random AI player scream to catch the user!
    const aiOpponents = playersRef.current.map((p, idx) => ({ p, idx })).filter(item => item.p.isAi);
    if (aiOpponents.length > 0) {
      const catcher = aiOpponents[Math.floor(Math.random() * aiOpponents.length)];
      
      triggerBanner(`${catcher.p.name} 指控成功！`, `⚠️ 你忘记喊 UNO！被罚摸 2 张牌`, "bg-red-600");
      playSynthSound("penalty", soundMuted);

      // AI dialogue
      triggerPlayerDialogue(catcher.idx, "PLAY_CARD", "指控", `抓到你没喊 UNO 啦！快摸两张牌罚站吧！哈哈~`);

      // Draw 2 cards for user
      const { newDeck, newPlayers } = drawCardsForPlayer(0, 2);
      setDeck(newDeck);
      setPlayers(newPlayers);
    }
  };

  // User choose color callback
  const handleColorChoose = (chosenColor: "red" | "yellow" | "green" | "blue") => {
    if (!activeWildCard) return;
    
    setCurrentColor(chosenColor);
    setColorChooseOpen(false);

    triggerBanner(`你指定颜色为`, `${chosenColor === "red" ? "● 红色" : chosenColor === "yellow" ? "○ 黄色" : chosenColor === "green" ? "▲ 绿色" : "■ 蓝色"}`, "bg-neutral-800");

    // Re-verify the card hand state of User
    const updatedPlayers = [...playersRef.current];

    if (activeWildCard.type === "wild_draw_four") {
      applySpecialDrawTurn(0, 4, chosenColor, updatedPlayers);
    } else {
      setPlayers(updatedPlayers);
      advanceTurn(1, updatedPlayers, 0);
    }
    setActiveWildCard(null);
  };

  // Draw card for active player (User click)
  const handleUserDrawCard = () => {
    if (gameState !== "playing" || currentTurn !== 0 || isAiProcessing || isPaused) return;

    playSynthSound("draw", soundMuted);

    // Draw 1 card for user
    const { newDeck, newPlayers } = drawCardsForPlayer(0, 1);
    setDeck(newDeck);
    setPlayers(newPlayers);

    const drawnCard = newPlayers[0].cards[newPlayers[0].cards.length - 1];

    // If drawn card is playable, let user choose to play it or pass
    const playable = isCardPlayable(drawnCard);

    if (playable) {
      triggerBanner("摸到了一张可出牌", `你摸到了：${getCardReadableName(drawnCard)}，可立即出牌或过牌。`, "bg-blue-600");
    } else {
      triggerBanner("无可用牌，自动跳过", `你摸到了：${getCardReadableName(drawnCard)}`, "bg-neutral-700");
      // Skip turn automatically after drawing unplayable card
      setTimeout(() => {
        advanceTurn(1, newPlayers, 0);
      }, 1000);
    }
  };

  // User pass turn (after drawing)
  const handleUserPass = () => {
    if (gameState !== "playing" || currentTurn !== 0 || isAiProcessing || isPaused) return;
    playSynthSound("click", soundMuted);
    advanceTurn(1, playersRef.current, 0);
  };

  // AI Turn Logic Handler with API decision making
  const handleAiTurn = async (aiIndex: number) => {
    const aiPlayer = playersRef.current[aiIndex];
    if (!aiPlayer) return;

    // Find playable cards
    const playableCards = aiPlayer.cards.filter(c => isCardPlayable(c));

    if (playableCards.length > 0) {
      try {
        const topCard = discardPileRef.current[discardPileRef.current.length - 1];
        const res = await fetch("/api/uno-move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            character: { name: aiPlayer.name, description: aiPlayer.character?.description },
            playableCards,
            topCard,
            currentColor: currentColorRef.current,
            context: `AI玩家剩 ${aiPlayer.cards.length} 张手牌`,
            settings
          })
        });

        if (res.ok) {
          const data = await res.json();
          const selectedCard = playableCards.find(c => c.id === data.cardId) || playableCards[0];
          const chosenColor = data.chosenColor as "red" | "yellow" | "green" | "blue" | undefined;
          
          executePlayCardAction(aiIndex, selectedCard, chosenColor, data.dialogue);
          return;
        }
      } catch (err) {
        console.warn("AI move decision fetch error, falling back to local heuristic strategy:", err);
      }

      // Fallback local strategy if API fails
      playableCards.sort((a, b) => {
        const priority = { wild_draw_four: 5, draw_two: 4, skip: 3, reverse: 2, wild_color: 1, number: 0 };
        return (priority[b.type] || 0) - (priority[a.type] || 0);
      });

      const selectedCard = playableCards[0];
      executePlayCardAction(aiIndex, selectedCard);
    } else {
      // AI must draw a card
      const { newDeck, newPlayers } = drawCardsForPlayer(aiIndex, 1, deckRef.current, playersRef.current);
      setDeck(newDeck);
      setPlayers(newPlayers);

      const drawnCard = newPlayers[aiIndex].cards[newPlayers[aiIndex].cards.length - 1];
      const isPlayableNow = isCardPlayable(drawnCard);

      if (isPlayableNow) {
        // AI immediately plays the drawn card
        setTimeout(() => {
          executePlayCardAction(aiIndex, drawnCard);
        }, 800);
      } else {
        // AI cannot play, say something and pass
        setTimeout(() => {
          triggerPlayerDialogue(aiIndex, "DRAW_CARD");
          advanceTurn(1, newPlayers, aiIndex);
        }, 800);
      }
    }
  };
  const getPlayerContainerClass = (idx: number, total: number) => {
    const isActive = idx === currentTurn;
    return `relative flex flex-col items-center justify-center p-2 rounded-[16px] border transition-all duration-300 ${
      isActive 
        ? "border-2 border-[#1A1A1A] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] scale-105 z-10" 
        : "border border-[#E5E2DC] bg-white/90 text-[#1A1A1A]"
    }`;
  };

  const getCardMatteColorClasses = (color: "red" | "yellow" | "green" | "blue" | "wild") => {
    switch (color) {
      case "red":
        return {
          bg: "bg-[#DC2626]",
          border: "border-[#991B1B]",
          text: "text-white",
          tag: "● 红"
        };
      case "yellow":
        return {
          bg: "bg-[#EAB308]",
          border: "border-[#CA8A04]",
          text: "text-[#1A1A1A]",
          tag: "○ 黄"
        };
      case "green":
        return {
          bg: "bg-[#16A34A]",
          border: "border-[#15803D]",
          text: "text-white",
          tag: "▲ 绿"
        };
      case "blue":
        return {
          bg: "bg-[#2563EB]",
          border: "border-[#1D4ED8]",
          text: "text-white",
          tag: "■ 蓝"
        };
      case "wild":
        return {
          bg: "bg-[#18181B]",
          border: "border-[#09090B]",
          text: "text-white",
          tag: "★ 变色"
        };
    }
  };

  const getSuitBadge = (color: "red" | "yellow" | "green" | "blue" | "wild" | "") => {
    switch (color) {
      case "red": return "● 红色";
      case "yellow": return "○ 黄色";
      case "green": return "▲ 绿色";
      case "blue": return "■ 蓝色";
      case "wild": return "★ 万能";
      default: return "";
    }
  };

  const getSuitShortBadge = (color: "red" | "yellow" | "green" | "blue" | "wild") => {
    switch (color) {
      case "red": return "● 红";
      case "yellow": return "○ 黄";
      case "green": return "▲ 绿";
      case "blue": return "■ 蓝";
      case "wild": return "★ 变色";
      default: return "";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8F6F3] text-[#1A1A1A] select-none relative overflow-hidden animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="h-14 bg-white border-b border-[#E5E2DC] flex items-center justify-between px-3 shrink-0 z-10">
        <button 
          onClick={() => {
            playSynthSound("click", soundMuted);
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
          className="p-2 hover:bg-[#F0EDE8] rounded-[8px] transition text-[#1A1A1A] active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-serif font-bold text-sm tracking-wide text-[#1A1A1A] flex items-center gap-1.5">
          UNO 极简对决 {gameState === "playing" && <span className="font-mono text-[11px] font-normal text-[#A8A39A]">({formatSeconds(gameElapsedSeconds)})</span>}
        </span>
        <div className="flex items-center gap-1">
          {/* History Archives button */}
          <button 
            onClick={() => {
              playSynthSound("click", soundMuted);
              setHistoryModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-sans font-medium text-[#1A1A1A] hover:bg-[#F0EDE8] rounded-[8px] transition flex items-center gap-1 cursor-pointer border border-[#E5E2DC]"
            title="历史对局/存档"
          >
            <History className="w-3.5 h-3.5 text-[#1A1A1A]" />
            <span>历史</span>
            {savedGames.length > 0 && (
              <span className="bg-[#1A1A1A] text-white text-[9px] px-1 rounded-full font-mono">
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
                  ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  : "bg-white text-[#1A1A1A] border-[#E5E2DC] hover:bg-[#F0EDE8]"
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? "继续" : "暂停"}</span>
            </button>
          )}

          <button 
            onClick={() => setRuleDialog(true)}
            className="p-2 text-[#1A1A1A] hover:bg-[#F0EDE8] rounded-[8px] transition active:scale-95 cursor-pointer"
            title="查看规则"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setSoundMuted(!soundMuted)}
            className="p-2 text-[#1A1A1A] hover:bg-[#F0EDE8] rounded-[8px] transition active:scale-95 cursor-pointer"
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-[#A8A39A]" /> : <Volume2 className="w-4 h-4 text-[#1A1A1A]" />}
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      {gameState === "setup" ? (
        /* SETUP SCREEN */
        <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto bg-[#F8F6F3]">
          <div className="space-y-5">
            {/* Top Logo Card */}
            <div className="text-center py-6 bg-white rounded-[16px] border border-[#E5E2DC] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1A1A1A] text-white font-serif font-bold text-2xl rounded-[16px] mb-3 shadow-xs">
                UNO
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">UNO 桌游俱乐部</h2>
              <p className="text-xs text-[#A8A39A] px-4 mt-2 leading-relaxed font-sans">
                黑白极简牌桌，邀请角色群落展开一场智谋与策略的 UNO 决斗。
              </p>
            </div>

            {/* Select Player Count */}
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-wider text-[#A8A39A] uppercase">玩家人数 / Players</label>
              <div className="grid grid-cols-4 gap-2">
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      playSynthSound("click", soundMuted);
                      setPlayerCount(num);
                    }}
                    className={`py-2.5 rounded-[8px] font-sans font-bold text-xs transition active:scale-95 cursor-pointer ${
                      playerCount === num
                        ? "bg-[#1A1A1A] text-white shadow-xs"
                        : "bg-white border border-[#E5E2DC] text-[#1A1A1A] hover:bg-[#F0EDE8]"
                    }`}
                  >
                    {num} 人
                  </button>
                ))}
              </div>
            </div>

            {/* Select AI Characters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold tracking-wider text-[#A8A39A] uppercase">选择加入牌局的角色</label>
                <span className="text-[10px] text-[#A8A39A] font-mono">（需选 {playerCount - 1} 位对手）</span>
              </div>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {characters.map((char) => {
                  const isSelected = selectedCharIds.includes(char.id);
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        playSynthSound("click", soundMuted);
                        if (isSelected) {
                          setSelectedCharIds(prev => prev.filter(id => id !== char.id));
                        } else {
                          if (selectedCharIds.length < playerCount - 1) {
                            setSelectedCharIds(prev => [...prev, char.id]);
                          } else {
                            setSelectedCharIds(prev => [...prev.slice(1), char.id]);
                          }
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-[16px] border text-left transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] shadow-xs"
                          : "bg-white border border-[#E5E2DC] text-[#1A1A1A] hover:bg-[#F0EDE8]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {char.chatAvatar ? (
                          <img src={char.chatAvatar} alt={char.name} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-xl shrink-0">{char.avatar || "👤"}</span>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-[#1A1A1A] block">{char.name}</span>
                          <span className="text-[10px] text-[#A8A39A] truncate block max-w-[190px]">{char.description}</span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-[#1A1A1A] border-[#1A1A1A] text-white" : "border-[#E5E2DC]"
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                playSynthSound("click", soundMuted);
                setHistoryModalOpen(true);
              }}
              className="flex-1 py-3.5 bg-white border border-[#E5E2DC] hover:bg-[#F0EDE8] text-[#1A1A1A] font-sans font-bold text-xs rounded-[8px] active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-[#1A1A1A]" />
              历史对局 ({savedGames.length})
            </button>
            <button
              onClick={handleStartGame}
              disabled={selectedCharIds.length < playerCount - 1 && characters.length >= playerCount - 1}
              className="flex-1 py-3.5 bg-[#1A1A1A] hover:bg-neutral-800 disabled:bg-[#F0EDE8] disabled:text-[#A8A39A] text-white font-sans font-bold text-xs rounded-[8px] shadow-xs active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              开局发牌
            </button>
          </div>
        </div>
      ) : (
        /* GAME BOARD SCREEN */
        <div className="flex-1 flex flex-col justify-between relative bg-[#F8F6F3] overflow-hidden">
          
          {/* Top: Opponents Area */}
          <div className="px-3 pt-3 shrink-0">
            <div className={`grid ${players.length <= 4 ? "grid-cols-3" : "grid-cols-4"} gap-2`}>
              {players.map((p, idx) => {
                if (idx === 0) return null; // Skip user (rendered at bottom)
                const isCurrent = idx === currentTurn;
                return (
                  <div key={p.id} className={getPlayerContainerClass(idx, players.length)}>
                    <div className="relative">
                      {p.character?.chatAvatar ? (
                        <img src={p.character.chatAvatar} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-[#E5E2DC] shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#F0EDE8] border border-[#E5E2DC] flex items-center justify-center text-lg select-none shrink-0">
                          {p.avatar}
                        </div>
                      )}
                      
                      {/* Card count badge */}
                      <span className="absolute -bottom-1 -right-1 bg-[#1A1A1A] text-white text-[9px] font-serif font-bold w-4.5 h-4.5 rounded-full border border-white flex items-center justify-center">
                        {p.cards.length}
                      </span>

                      {/* UNO indicator */}
                      {p.cards.length === 1 && p.isUnoCalled && (
                        <span className="absolute -top-1 -left-1 bg-[#1A1A1A] text-white text-[8px] font-serif font-bold px-1 rounded-[4px] shadow-xs">
                          UNO
                        </span>
                      )}
                    </div>
                    
                    <span className="text-[10px] font-bold text-[#1A1A1A] mt-1 truncate max-w-[65px] block">{p.name}</span>
                    
                    {/* Status Dot */}
                    {isCurrent && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1A1A1A] rounded-full animate-ping" />
                    )}

                    {/* Speech/Thought bubble popup */}
                    {p.recentDialogue && (
                      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[120px] bg-white text-[#1A1A1A] text-[10px] p-2 rounded-[12px] border border-[#E5E2DC] shadow-lg z-20 font-sans leading-relaxed select-none animate-fade-in">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-t border-l border-[#E5E2DC]" />
                        <p className="relative z-10 text-center font-medium break-all">{p.recentDialogue}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center: Table & Play Pile Area */}
          <div className="flex-1 flex flex-col items-center justify-center relative py-4 min-h-0">
            {/* Direction Arrows background wrapper */}
            <div className="absolute w-44 h-44 border border-[#E5E2DC] rounded-full flex items-center justify-center pointer-events-none">
              <div className="text-[#A8A39A]/20 text-5xl">
                {playDirection === 1 ? <RotateCw className="w-16 h-16" /> : <RotateCcw className="w-16 h-16" />}
              </div>
            </div>

            <div className="flex items-center gap-6 z-10">
              {/* Draw Pile (Face Down) */}
              <button
                onClick={handleUserDrawCard}
                disabled={currentTurn !== 0 || isAiProcessing}
                className={`w-20 h-28 rounded-[16px] bg-[#1A1A1A] text-white border ${
                  currentTurn === 0 && !players[0].cards.some(c => isCardPlayable(c))
                    ? "border-2 border-[#1A1A1A] ring-2 ring-[#1A1A1A] ring-offset-2 ring-offset-[#F8F6F3]"
                    : "border-[#1A1A1A]"
                } flex flex-col items-center justify-center relative active:scale-95 disabled:opacity-90 disabled:active:scale-100 transition shadow-[0_4px_20px_rgba(0,0,0,0.08)] shrink-0 cursor-pointer`}
              >
                <div className="w-12 h-18 rounded-[12px] border border-white/20 flex flex-col items-center justify-center text-center p-1">
                  <span className="font-serif font-bold text-sm tracking-widest text-white">UNO</span>
                </div>
                <span className="absolute bottom-1.5 font-sans text-[10px] text-[#A8A39A]">
                  {deck.length}张
                </span>
              </button>

              {/* Discard Pile (Face Up) */}
              <div className="relative">
                {discardPile.map((card, idx) => {
                  const isTop = idx === discardPile.length - 1;
                  if (!isTop) return null;

                  const symbolMap = {
                    number: card.value,
                    skip: "🚫",
                    reverse: "⇄",
                    draw_two: "+2",
                    wild_color: "WILD",
                    wild_draw_four: "+4"
                  };

                  const matte = getCardMatteColorClasses(card.color);

                  return (
                    <div
                      key={card.id}
                      className={`w-22 h-32 rounded-[16px] ${matte.bg} ${matte.text} border-2 ${matte.border} shadow-[0_8px_24px_rgba(0,0,0,0.15)] flex flex-col items-center justify-between p-2.5 shrink-0 select-none z-10`}
                    >
                      <div className="w-full flex items-center justify-between text-[10px] font-sans font-bold opacity-90">
                        <span>{matte.tag}</span>
                        <span className="font-serif">{symbolMap[card.type]}</span>
                      </div>
                      
                      {/* Central Value */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black/10 border border-white/20">
                        <span className={`font-serif text-3xl font-black ${matte.text}`}>
                          {symbolMap[card.type]}
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between text-[10px] font-sans font-bold opacity-90 rotate-180">
                        <span>{matte.tag}</span>
                        <span className="font-serif">{symbolMap[card.type]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current Active Color overlay badge */}
            {currentColor && (
              <div className="mt-3 z-10">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-sans font-medium border border-[#E5E2DC] bg-white text-[#1A1A1A] shadow-xs flex items-center gap-2">
                  <span className="text-[#A8A39A]">当前跟牌:</span>
                  <span className={`px-2 py-0.5 rounded-full text-white text-[11px] font-bold ${
                    currentColor === "red" ? "bg-[#DC2626]" :
                    currentColor === "yellow" ? "bg-[#EAB308] text-[#1A1A1A]" :
                    currentColor === "green" ? "bg-[#16A34A]" :
                    currentColor === "blue" ? "bg-[#2563EB]" : "bg-[#18181B]"
                  }`}>
                    {getSuitBadge(currentColor)}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Bottom Area: User Controls & Cards */}
          <div className="bg-white border-t border-[#E5E2DC] p-3.5 shrink-0 flex flex-col gap-2.5 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
            {/* Status indicators */}
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#1A1A1A]">
                <span className={`w-2 h-2 rounded-full ${currentTurn === 0 ? "bg-[#1A1A1A] animate-ping" : "bg-[#A8A39A]"}`} />
                {currentTurn === 0 ? "轮到你的回合" : `等待对手：${players[currentTurn]?.name}`}
              </span>

              {/* UNO Button and Pass button */}
              <div className="flex items-center gap-1.5">
                {/* Manual Pass button (appears after user draws a card) */}
                {currentTurn === 0 && (
                  <button
                    onClick={handleUserPass}
                    className="px-3 py-1.5 bg-[#F0EDE8] hover:bg-[#E5E2DC] text-[#1A1A1A] font-sans text-xs font-medium rounded-[8px] active:scale-95 transition cursor-pointer"
                  >
                    过牌 / Pass
                  </button>
                )}

                {/* Show glowing UNO button if user is near 1 card */}
                {players[0]?.cards.length <= 2 && (
                  <button
                    onClick={handleUserCallUno}
                    className={`px-3.5 py-1.5 text-xs font-sans font-bold rounded-[8px] transition active:scale-95 cursor-pointer ${
                      players[0].isUnoCalled
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-[#1A1A1A] text-white ring-2 ring-offset-2 ring-[#1A1A1A]"
                    }`}
                  >
                    喊出 UNO! {players[0].isUnoCalled && "✓"}
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable user cards */}
            <div className="flex gap-3 overflow-x-auto py-3 px-1 scrollbar-hide min-h-[135px] items-center">
              {players[0]?.cards.map((card) => {
                const playable = isCardPlayable(card) && currentTurn === 0 && !isAiProcessing;
                
                const symbolMap = {
                  number: card.value,
                  skip: "🚫",
                  reverse: "⇄",
                  draw_two: "+2",
                  wild_color: "WILD",
                  wild_draw_four: "+4"
                };

                const matte = getCardMatteColorClasses(card.color);

                return (
                  <button
                    key={card.id}
                    onClick={() => handlePlayCard(card)}
                    disabled={!playable}
                    className={`w-20 h-28 rounded-[16px] border-2 flex flex-col items-center justify-between p-2.5 transition-all duration-200 select-none shrink-0 ${matte.bg} ${matte.text} ${matte.border} ${
                      playable 
                        ? "shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:-translate-y-3 cursor-pointer active:scale-95 ring-2 ring-transparent hover:ring-white/50" 
                        : "brightness-75 saturate-70 cursor-not-allowed border-gray-400"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between text-[9px] font-sans font-bold opacity-90">
                      <span>{matte.tag}</span>
                      <span className="font-serif">{symbolMap[card.type]}</span>
                    </div>
                    
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-black/10 border border-white/20">
                      <span className={`font-serif text-2xl font-black ${matte.text}`}>
                        {symbolMap[card.type]}
                      </span>
                    </div>

                    <div className="w-full flex items-center justify-between text-[9px] font-sans font-bold opacity-90 rotate-180">
                      <span>{matte.tag}</span>
                      <span className="font-serif">{symbolMap[card.type]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="text-center text-[10px] text-[#A8A39A] font-sans">
              与 {players.filter((_, idx) => idx !== 0).map(p => p.name).join("、")} 对决中 · 手牌余 {players[0]?.cards.length} 张
            </div>
          </div>

          {/* Action Notification Banner */}
          {gameBanner && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-fade-in">
              <div className="bg-[#1A1A1A] text-white border border-neutral-700 px-5 py-3.5 rounded-[16px] shadow-2xl text-center max-w-[280px]">
                <h3 className="text-sm font-serif font-bold text-white tracking-tight">{gameBanner.title}</h3>
                <p className="text-[11px] font-sans text-[#A8A39A] mt-0.5">{gameBanner.subtitle}</p>
              </div>
            </div>
          )}

          {/* Color Chooser Modal */}
          {colorChooseOpen && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fade-in">
              <div className="bg-white border border-[#E5E2DC] p-6 rounded-[16px] w-full max-w-[280px] text-center space-y-4 shadow-2xl">
                <div className="space-y-1">
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">
                    请选择跟牌颜色
                  </h3>
                  <p className="text-[10px] text-[#A8A39A] font-sans">指定下一步牌局要跟出的卡牌颜色</p>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleColorChoose("red")}
                    className="py-3 bg-[#C85250] hover:bg-[#B24341] active:scale-95 text-white font-sans text-xs font-bold rounded-[8px] transition cursor-pointer shadow-xs"
                  >
                    ● 红色 (Red)
                  </button>
                  <button
                    onClick={() => handleColorChoose("yellow")}
                    className="py-3 bg-[#D19B38] hover:bg-[#BD8A2B] active:scale-95 text-white font-sans text-xs font-bold rounded-[8px] transition cursor-pointer shadow-xs"
                  >
                    ○ 黄色 (Yellow)
                  </button>
                  <button
                    onClick={() => handleColorChoose("green")}
                    className="py-3 bg-[#458B64] hover:bg-[#397654] active:scale-95 text-white font-sans text-xs font-bold rounded-[8px] transition cursor-pointer shadow-xs"
                  >
                    ▲ 绿色 (Green)
                  </button>
                  <button
                    onClick={() => handleColorChoose("blue")}
                    className="py-3 bg-[#4873A6] hover:bg-[#3A608F] active:scale-95 text-white font-sans text-xs font-bold rounded-[8px] transition cursor-pointer shadow-xs"
                  >
                    ■ 蓝色 (Blue)
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Paused Game Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fade-in">
              <div className="bg-white border border-[#E5E2DC] p-6 rounded-[20px] w-full max-w-[300px] text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                  <Pause className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-serif font-bold text-[#1A1A1A]">
                    游戏已暂停
                  </h3>
                  <p className="text-xs text-[#A8A39A] font-sans leading-relaxed">
                    所有操作按钮已禁用，进度已自动存档至本地。
                  </p>
                </div>

                <div className="p-3 bg-[#F8F6F3] rounded-[12px] border border-[#E5E2DC] text-left text-xs space-y-1.5">
                  <div className="flex justify-between text-[#1A1A1A]">
                    <span className="text-[#A8A39A]">当前回合:</span>
                    <span className="font-bold">{players[currentTurn]?.name || "未知"}</span>
                  </div>
                  <div className="flex justify-between text-[#1A1A1A]">
                    <span className="text-[#A8A39A]">出牌次数:</span>
                    <span className="font-mono font-bold">{moveCount} 次</span>
                  </div>
                  <div className="flex justify-between text-[#1A1A1A]">
                    <span className="text-[#A8A39A]">已用时长:</span>
                    <span className="font-mono font-bold">{formatSeconds(gameElapsedSeconds)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={handleResumeGame}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-sans text-xs font-bold rounded-[8px] transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    继续对局
                  </button>
                  <button
                    onClick={() => {
                      playSynthSound("click", soundMuted);
                      setHistoryModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-white border border-[#E5E2DC] hover:bg-[#F0EDE8] active:scale-95 text-[#1A1A1A] font-sans text-xs font-bold rounded-[8px] transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <History className="w-3.5 h-3.5 text-[#1A1A1A]" />
                    历史对局列表
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GAME OVER SETTLEMENT SCREEN */}
      {gameState === "game_over" && (
        <div className="absolute inset-0 bg-[#F8F6F3] flex flex-col justify-between p-6 z-50 overflow-y-auto animate-fade-in">
          <div className="space-y-5 text-center mt-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1A1A1A] text-white font-serif font-bold text-2xl rounded-[16px] shadow-xs mb-1">
              🏆
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">本局对局结算</h2>
              <p className="text-xs text-[#A8A39A] font-sans">
                胜负定局，比赛完整数据及排名汇总
              </p>
            </div>

            {/* Match Summary Metrics */}
            <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
              <div className="p-3 bg-white rounded-[14px] border border-[#E5E2DC] text-center">
                <span className="text-[10px] text-[#A8A39A] font-sans block">累计出牌</span>
                <span className="text-sm font-serif font-bold text-[#1A1A1A]">{moveCount} 次</span>
              </div>
              <div className="p-3 bg-white rounded-[14px] border border-[#E5E2DC] text-center">
                <span className="text-[10px] text-[#A8A39A] font-sans block">总用时长</span>
                <span className="text-sm font-mono font-bold text-[#1A1A1A]">{formatSeconds(gameElapsedSeconds)}</span>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="text-left text-[10px] font-bold tracking-wider text-[#A8A39A] uppercase px-1">
                最终排名表 / Leaderboard
              </div>
              {players
                .map((p) => {
                  const winIdx = winners.indexOf(p.id);
                  return {
                    ...p,
                    rank: winIdx !== -1 ? winIdx + 1 : winners.length + 1,
                  };
                })
                .sort((a, b) => a.rank! - b.rank!)
                .map((p, idx) => {
                  const rankLabel = ["1st · 冠军", "2nd · 亚军", "3rd · 季军", "4th", "5th", "6th"][idx];
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-[14px] border transition-all ${
                        p.id === "user"
                          ? "bg-white border-2 border-[#1A1A1A] shadow-xs"
                          : "bg-white border border-[#E5E2DC]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-sm font-bold text-[#1A1A1A]">{idx + 1}.</span>
                        <div className="w-8 h-8 rounded-full bg-[#F0EDE8] flex items-center justify-center text-sm shrink-0">
                          {p.avatar}
                        </div>
                        <span className="font-bold text-xs text-[#1A1A1A]">{p.name} {p.id === "user" && "（你）"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-serif font-bold text-[#1A1A1A] block">{rankLabel}</span>
                        <span className="text-[10px] text-[#A8A39A] font-sans">余 {p.cards.length} 张牌</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="space-y-2 mt-6 max-w-sm mx-auto w-full">
            <button
              onClick={() => {
                playSynthSound("click", soundMuted);
                setGameState("setup");
              }}
              className="w-full py-3.5 bg-[#1A1A1A] hover:bg-neutral-800 text-white font-sans font-bold text-xs rounded-[8px] active:scale-95 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-4 h-4" />
              重新开始 / 再来一局
            </button>
            <button
              onClick={() => {
                playSynthSound("click", soundMuted);
                setHistoryModalOpen(true);
              }}
              className="w-full py-3 bg-white border border-[#E5E2DC] hover:bg-[#F0EDE8] text-[#1A1A1A] font-sans font-bold text-xs rounded-[8px] active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <History className="w-4 h-4 text-[#1A1A1A]" />
              查看历史对局记录
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-[#A8A39A] hover:text-[#1A1A1A] font-sans text-xs transition cursor-pointer"
            >
              返回主屏幕
            </button>
          </div>
        </div>
      )}

      {/* HISTORY ARCHIVES MODAL */}
      {historyModalOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E2DC] p-5 rounded-[20px] w-full max-w-[340px] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-3 mb-3 shrink-0">
              <span className="text-sm font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#1A1A1A]" />
                历史对局存档 ({savedGames.length})
              </span>
              <button 
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 hover:bg-[#F0EDE8] rounded-full text-[#1A1A1A] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {savedGames.length === 0 ? (
              <div className="py-12 text-center text-[#A8A39A] space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto opacity-50 stroke-1" />
                <p className="text-xs">暂无历史对局存档</p>
                <p className="text-[10px] text-[#A8A39A]/80">暂停对局或游戏结束时将自动保存</p>
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
                  const isCurrentActive = currentGameSaveId === save.id && gameState === "playing";

                  return (
                    <div
                      key={save.id}
                      onClick={() => loadSaveRecord(save)}
                      className={`p-3.5 rounded-[14px] border text-left transition cursor-pointer relative group active:scale-[0.98] ${
                        isCurrentActive
                          ? "bg-amber-50/50 border-amber-300 ring-1 ring-amber-300"
                          : "bg-white border-[#E5E2DC] hover:border-[#1A1A1A] hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-xs text-[#1A1A1A]">{save.title}</span>
                            {save.status === "completed" ? (
                              <span className="px-1.5 py-0.5 text-[9px] bg-[#F0EDE8] text-[#1A1A1A] font-bold rounded-[4px]">
                                已结束
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
                          <span className="text-[10px] text-[#A8A39A] font-mono mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#A8A39A]" /> {dateStr}
                          </span>
                        </div>

                        <button
                          onClick={(e) => deleteSaveRecord(save.id, e)}
                          className="p-1.5 text-[#A8A39A] hover:text-red-600 hover:bg-red-50 rounded-[6px] transition cursor-pointer"
                          title="删除存档"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#F0EDE8] flex items-center justify-between text-[11px] text-[#1A1A1A]">
                        <span className="text-[#A8A39A]">
                          {save.playerCount} 人局 · {save.status === "completed" ? (save.winnerName ? `获胜: ${save.winnerName}` : "已完结") : `当前: ${save.players[save.currentTurn]?.name || "玩家"}`}
                        </span>
                        <span className="font-mono text-[#1A1A1A] font-medium">
                          {save.moveCount}手 / {formatSeconds(save.durationSeconds)}
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

      {/* RULE DETAILS MODAL */}
      {ruleDialog && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white border border-[#E5E2DC] p-5 rounded-[16px] w-full max-w-[320px] shadow-2xl flex flex-col max-h-[85%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2.5 mb-3">
              <span className="text-xs font-serif font-bold text-[#1A1A1A] flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#1A1A1A]" />
                UNO 游戏规则说明
              </span>
              <button 
                onClick={() => setRuleDialog(false)}
                className="text-[#1A1A1A] hover:bg-[#F0EDE8] text-xs font-bold px-2.5 py-1 border border-[#E5E2DC] rounded-[8px] cursor-pointer"
              >
                关闭
              </button>
            </div>
            <div className="text-xs text-[#1A1A1A]/80 space-y-2.5 leading-relaxed font-sans">
              <p>
                1. <b>核心目标</b>：谁先将手上的全部卡牌打完，谁就能赢得本轮比赛胜利。
              </p>
              <p>
                2. <b>跟牌规则</b>：出牌必须与出牌区顶部的卡牌<b>颜色相同</b>或<b>符号/数字相同</b>。黑色万能卡在任何时候都可跟牌。
              </p>
              <p>
                3. <b>特殊功能卡牌</b>：
                <br />• <span className="font-bold text-[#1A1A1A]">🚫 跳过</span>: 下一位玩家将被剥夺出牌回合。
                <br />• <span className="font-bold text-[#1A1A1A]">⇄ 反转</span>: 改变逆/顺时针的出牌方向。
                <br />• <span className="font-bold text-[#1A1A1A]">🃏 +2卡</span>: 下一位玩家罚摸 2 张牌且回合跳过。
                <br />• <span className="font-bold text-[#1A1A1A]">🌈 变色</span>: 玩牌者可以自由指定下一步颜色。
                <br />• <span className="font-bold text-[#1A1A1A]">🔥 +4卡</span>: 罚摸 4 张牌，跳过回合，且指定变色。
              </p>
              <p>
                4. <b>忘记喊 UNO 处罚</b>：
                <br />当你打出第二到最后一张牌，手牌<b>只剩 1 张</b>时，如果你没有点击<b>『喊出 UNO!』</b>按钮，你在 2.5 秒内可能会被 AI 玩家抓包，届时必须<b>罚摸 2 张牌</b>！
              </p>
              <p>
                5. <b>摸牌过牌</b>：如果手上没有可以跟出的卡牌，点击左侧的牌堆<b>摸牌 1 张</b>。如果新摸到的牌可以出，你可以矢量跟出或选择直接过牌结束回合。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

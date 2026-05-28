/**
 * App.tsx
 * -------
 * DescribeIt — AI Word Guessing Game
 *
 * The user is given a secret word and must describe it in a chat interface
 * (like ChatGPT). The AI reads each clue and guesses the word.
 * The game continues until the AI guesses correctly.
 *
 * Files:
 *  - src/ai/wordList.ts  — Large word dataset + pickRandomWord()
 *  - src/ai/gameAI.ts    — Cheat detection, OpenAI API call, answer check
 *  - src/App.tsx         — This file — React UI
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { pickRandomWord } from "./ai/wordList";
import { askAI, flagCheat, ChatMessage } from "./ai/gameAI";

// ── Types ──────────────────────────────────────────────────────────────────

type GameState = "idle" | "playing" | "won";

interface DisplayMessage {
  id: number;
  from: "user" | "ai" | "system";
  text: string;
  isError?: boolean;
  isWin?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let msgIdCounter = 0;
function nextId() {
  return ++msgIdCounter;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function App() {
  // API key state
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("openai_api_key") ?? "";
  });
  const [showKey, setShowKey] = useState(false);

  // Game state
  const [gameState, setGameState] = useState<GameState>("idle");
  const [secretWord, setSecretWord] = useState<string>("");
  const [turnCount, setTurnCount] = useState(0);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save API key to localStorage
  useEffect(() => {
    if (apiKey) localStorage.setItem("openai_api_key", apiKey);
  }, [apiKey]);

  // ── Game Actions ──────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    const word = pickRandomWord();
    setSecretWord(word);
    setTurnCount(0);
    setHistory([]);
    setMessages([
      {
        id: nextId(),
        from: "system",
        text: `🎮 New game started! Your secret word has been chosen.`,
      },
      {
        id: nextId(),
        from: "ai",
        text: `Hello! I'm ready to play DescribeIt 🧠\n\nYou've been given a secret word. Describe it to me — use any clues you like, but **don't say the word itself** (or spell it out, use leet-speak tricks, etc.).\n\nI'll try to guess what it is. Let's go! 🚀`,
      },
    ]);
    setGameState("playing");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const resetGame = useCallback(() => {
    setGameState("idle");
    setSecretWord("");
    setMessages([]);
    setHistory([]);
    setInput("");
    setTurnCount(0);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || gameState !== "playing") return;
    if (!apiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          from: "system",
          text: "⚠️ Please enter your OpenAI API key above before playing.",
          isError: true,
        },
      ]);
      return;
    }

    // ── Cheat detection ──
    const cheatResult = flagCheat(text, secretWord);
    if (cheatResult.cheated) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), from: "user", text },
        { id: nextId(), from: "system", text: cheatResult.reason, isError: true },
      ]);
      setInput("");
      return;
    }

    // Add user message
    const userMsg: DisplayMessage = { id: nextId(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const newHistory: ChatMessage[] = [
      ...history,
      { role: "user", content: text },
    ];

    try {
      const aiResponse = await askAI(apiKey, newHistory, secretWord);

      const assistantHistory: ChatMessage[] = [
        ...newHistory,
        { role: "assistant", content: aiResponse.message },
      ];
      setHistory(assistantHistory);
      setTurnCount((t) => t + 1);

      if (aiResponse.correct) {
        // AI won!
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            from: "ai",
            text: aiResponse.message,
            isWin: true,
          },
          {
            id: nextId(),
            from: "system",
            text: `🎉 The AI guessed it in ${turnCount + 1} turn${turnCount + 1 === 1 ? "" : "s"}! The word was **${secretWord}**.`,
            isWin: true,
          },
        ]);
        setGameState("won");
      } else {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), from: "ai", text: aiResponse.message },
        ]);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unknown error talking to OpenAI.";
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          from: "system",
          text: `❌ Error: ${msg}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, gameState, apiKey, secretWord, history, turnCount]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">DescribeIt</h1>
            <p className="text-xs text-gray-400">AI Word Guessing Game</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {gameState === "playing" && (
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-400">Turn</span>
              <span className="text-sm font-bold text-indigo-400">{turnCount}</span>
            </div>
          )}
          {gameState !== "idle" && (
            <button
              onClick={resetGame}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              New Game
            </button>
          )}
        </div>
      </header>

      {/* ── API Key Bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap">OpenAI Key:</span>
        <div className="relative flex-1 max-w-sm">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs text-gray-200 pr-16 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setShowKey((s) => !s)}
            className="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300 px-1"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <span className="text-xs text-gray-500">
          (stored locally, never sent anywhere except OpenAI)
        </span>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Idle / Start Screen ── */}
        {gameState === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
            <div className="text-7xl animate-bounce">🤔</div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">How to Play</h2>
              <p className="text-gray-400 max-w-md mx-auto text-sm leading-relaxed">
                You'll be given a <span className="text-indigo-400 font-semibold">secret word</span>.
                Describe it to the AI using a chat — but <span className="text-red-400 font-semibold">never say the word</span> itself,
                spell it out, use leet-speak, or use large chunks of the word.
                The AI will guess after each clue. See how few turns it takes!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full text-left">
              {[
                { icon: "🎯", title: "Secret Word", desc: "A random word is chosen from a huge dataset." },
                { icon: "💬", title: "Describe It", desc: "Give clues in plain language — no tricks!" },
                { icon: "🤖", title: "AI Guesses", desc: "The AI tries to figure out the word from your hints." },
              ].map((c) => (
                <div key={c.title} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="text-sm font-semibold text-white mb-1">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.desc}</div>
                </div>
              ))}
            </div>

            {!apiKey.trim() && (
              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg px-4 py-3 text-sm text-yellow-300 max-w-md">
                ⚠️ Enter your OpenAI API key in the bar above to play.
              </div>
            )}

            <button
              onClick={startGame}
              disabled={!apiKey.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold px-10 py-4 rounded-2xl text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-900/40"
            >
              🎮 Start Game
            </button>
          </div>
        )}

        {/* ── Game / Chat Screen ── */}
        {(gameState === "playing" || gameState === "won") && (
          <>
            {/* Secret word banner */}
            <div className="bg-indigo-900/30 border-b border-indigo-800/40 px-4 py-2 text-center flex-shrink-0">
              <span className="text-xs text-indigo-300">
                🔐 Your secret word:{" "}
                <span className="font-bold text-white bg-indigo-700/60 px-2 py-0.5 rounded tracking-widest uppercase">
                  {secretWord}
                </span>
                {" "}— describe it without saying it!
              </span>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} />
              ))}

              {loading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-sm flex-shrink-0">
                    🤖
                  </div>
                  <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Win banner */}
            {gameState === "won" && (
              <div className="px-4 py-3 bg-green-900/30 border-t border-green-700/40 text-center flex-shrink-0">
                <p className="text-green-300 font-semibold text-sm mb-2">
                  🎊 The AI guessed your word in{" "}
                  <span className="text-white font-bold">{turnCount}</span> turn
                  {turnCount !== 1 ? "s" : ""}!
                </p>
                <button
                  onClick={startGame}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-xl text-sm transition-all"
                >
                  🔄 Play Again
                </button>
              </div>
            )}

            {/* Chat input */}
            {gameState === "playing" && (
              <div className="border-t border-gray-800 px-4 py-3 bg-gray-900 flex-shrink-0">
                <div className="max-w-3xl mx-auto flex items-end gap-3">
                  <div className="flex-1 bg-gray-800 border border-gray-700 focus-within:border-indigo-500 rounded-2xl px-4 py-3 transition-colors">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe your word… (Press Enter to send, Shift+Enter for newline)"
                      rows={1}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none max-h-32 leading-relaxed"
                      style={{ minHeight: "24px" }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Send (Enter)"
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-gray-600 mt-2">
                  Cheating is auto-detected — no saying the word, spelling it out, or using leet-speak!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── ChatBubble Sub-Component ───────────────────────────────────────────────

interface ChatBubbleProps {
  msg: DisplayMessage;
}

function ChatBubble({ msg }: ChatBubbleProps) {
  if (msg.from === "system") {
    return (
      <div
        className={`flex justify-center ${msg.isWin ? "" : ""}`}
      >
        <div
          className={`text-xs px-4 py-2 rounded-full text-center max-w-md leading-relaxed
            ${msg.isError
              ? "bg-red-900/40 border border-red-700/50 text-red-300"
              : msg.isWin
              ? "bg-green-900/40 border border-green-700/50 text-green-300 font-semibold"
              : "bg-gray-800/80 text-gray-400"
            }`}
        >
          <MarkdownText text={msg.text} />
        </div>
      </div>
    );
  }

  if (msg.from === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs sm:max-w-md text-sm leading-relaxed">
          {msg.text}
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
          ${msg.isWin ? "bg-green-700" : "bg-indigo-700"}`}
      >
        🤖
      </div>
      <div
        className={`rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs sm:max-w-md text-sm leading-relaxed
          ${msg.isWin
            ? "bg-green-900/40 border border-green-700/50 text-green-100"
            : "bg-gray-800 text-gray-100"
          }`}
      >
        <MarkdownText text={msg.text} />
      </div>
    </div>
  );
}

// ── Simple Markdown-ish Text Renderer ────────────────────────────────────────
// Supports **bold** only — keeps it safe without a full MD lib

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

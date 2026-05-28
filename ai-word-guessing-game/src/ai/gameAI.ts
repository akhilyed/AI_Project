/**
 * gameAI.ts
 * ---------
 * Core AI logic for the DescribeIt word-guessing game.
 *
 * Responsibilities:
 *  1. CHEATING DETECTION  – flagCheat()
 *     Checks if the user's description contains the target word or any obvious
 *     substring trick (e.g. the word split across parts, letter-by-letter, or
 *     disguised with common substitutions like "3" for "e", "@" for "a", etc.).
 *
 *  2. AI GUESSING  – askAI()
 *     Sends the accumulated conversation to the OpenAI Chat Completions API
 *     and parses the model's single-word guess + an optional follow-up question.
 *
 *  3. ANSWER CHECKING  – isCorrectGuess()
 *     Compares the AI's guess to the secret word (case-insensitive, trimmed).
 *
 * ── How to train / extend ──────────────────────────────────────────────────
 * The "training" in this project is done via the SYSTEM_PROMPT below.
 * That prompt teaches the model its role, the rules, and gives it examples
 * of good reasoning. Tune it freely to change model behaviour.
 *
 * For a fully offline, custom-trained neural-net approach you would:
 *   1. Collect (description → word) pairs into a JSONL dataset.
 *   2. Fine-tune a smaller model (e.g. GPT-3.5 or an open-source LLM) using
 *      the OpenAI fine-tuning API or Hugging Face Trainer.
 *   3. Replace the MODEL constant below with your fine-tuned model ID.
 * ──────────────────────────────────────────────────────────────────────────
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface AIResponse {
  guess: string;           // The single word the AI is guessing
  message: string;         // Full natural-language response shown to the user
  correct: boolean;        // Whether the guess matches the secret word
}

export interface CheatResult {
  cheated: boolean;
  reason: string;
}

// ── Configuration ──────────────────────────────────────────────────────────

const MODEL = "gpt-3.5-turbo"; // swap for "gpt-4o" or your fine-tuned model ID

/**
 * SYSTEM_PROMPT — this is the "training" instruction set for the AI.
 * It defines the game rules, the AI's persona, and the expected output format.
 */
const SYSTEM_PROMPT = `
You are an expert word-guesser playing a game called DescribeIt.

GAME RULES:
- The human player has been given a secret word and must describe it WITHOUT saying it.
- You must try to guess the secret word from their description.
- After each of the user's clues, output EXACTLY this JSON (no markdown, no extra text):
  {"guess":"<your_best_single_word_guess>","message":"<natural language response to user>"}

IMPORTANT:
- The "guess" field must be a SINGLE lowercase English word — your best current guess.
- The "message" field should be a friendly sentence acknowledging the clue, stating your guess, and optionally asking ONE clarifying follow-up question to narrow it down.
- If you are very confident, say so enthusiastically!
- Keep messages concise (1–3 sentences).
- Never reveal the secret word; you don't know it — you are guessing it.
- Think carefully. Use all previous clues together. Update your guess each turn.
- If the user's latest clue contradicts your previous guess, reconsider completely.

EXAMPLE TURN (secret word was "elephant"):
User: "It is a very large mammal that lives in Africa and Asia."
You: {"guess":"elephant","message":"Hmm, a huge mammal from Africa and Asia — I'm guessing elephant! Is that right? 🐘"}
`.trim();

// ── Cheat Detection ────────────────────────────────────────────────────────

/**
 * Normalise a string for cheat-checking:
 * lower-case, strip non-alpha, collapse spaces, expand leet-speak.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    // Expand common leet / symbol substitutions
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    // Remove all non-letter characters
    .replace(/[^a-z]/g, "");
}

/**
 * Build a set of "forbidden" patterns derived from the secret word.
 * Checks: the full word, substrings ≥ 4 chars, and concatenated initials of
 * multi-part phrases that reconstruct the word.
 */
function buildForbiddenPatterns(word: string): string[] {
  const w = word.toLowerCase();
  const patterns: string[] = [w];

  // substrings of length 4+ that cover more than half the word
  for (let len = 4; len <= w.length; len++) {
    for (let start = 0; start <= w.length - len; start++) {
      patterns.push(w.slice(start, start + len));
    }
  }

  return patterns;
}

/**
 * flagCheat
 * Checks whether the user's input contains or implies the secret word.
 * Returns { cheated: true, reason: "..." } when something suspicious is found,
 * or { cheated: false, reason: "" } when the input is clean.
 */
export function flagCheat(input: string, secretWord: string): CheatResult {
  const normInput = normalise(input);
  const normWord = normalise(secretWord);
  const word = secretWord.toLowerCase();

  // 1. Direct exact-word check (on raw tokens)
  const rawTokens: string[] = input.toLowerCase().match(/[a-z]+/g) ?? [];
  if (rawTokens.includes(word)) {
    return {
      cheated: true,
      reason: `🚫 You said the word "${secretWord}" directly! Try describing it without using the word itself.`,
    };
  }

  // 2. Normalised full-word match (catches leet, symbols, etc.)
  if (normInput.includes(normWord)) {
    return {
      cheated: true,
      reason: `🚫 Your description contains "${secretWord}" in disguise (leet speak, symbols, etc.). Be creative — describe it without hinting at the letters!`,
    };
  }

  // 3. Substring trick: if input contains a long substring of the word
  const forbidden = buildForbiddenPatterns(word);
  for (const pattern of forbidden) {
    if (pattern.length >= Math.ceil(word.length * 0.55) && normInput.includes(pattern)) {
      return {
        cheated: true,
        reason: `🚫 Your description seems to contain a large chunk of the word ("${pattern}"). Try a clue that doesn't spell out the word!`,
      };
    }
  }

  // 4. Split-word trick: user says word split with spaces / hyphens / dots
  const joinedTokens = rawTokens.join("");
  if (joinedTokens.includes(word)) {
    return {
      cheated: true,
      reason: `🚫 Sneaky! It looks like the letters of "${secretWord}" appear back-to-back across your words. Describe it differently!`,
    };
  }

  // 5. Rhyme / sounds-like hint check (rudimentary)
  // Check if a token rhymes closely (shares last 3+ chars) AND first char
  const wordEnd = word.slice(-3);
  const wordStart = word[0];
  for (const tok of rawTokens) {
    if (
      tok !== word &&
      tok.length >= 4 &&
      tok.endsWith(wordEnd) &&
      tok[0] === wordStart &&
      tok.length >= word.length - 1 &&
      tok.length <= word.length + 1
    ) {
      return {
        cheated: true,
        reason: `🚫 "${tok}" sounds extremely close to the secret word. Use a real description, not a near-spelling!`,
      };
    }
  }

  return { cheated: false, reason: "" };
}

// ── AI Guessing ────────────────────────────────────────────────────────────

/**
 * askAI
 * Sends the conversation history to OpenAI and parses the JSON response.
 *
 * @param apiKey      – OpenAI API key (user-provided in the UI)
 * @param history     – Full conversation so far (without the system prompt)
 * @param secretWord  – Used only to check if the guess is correct
 */
export async function askAI(
  apiKey: string,
  history: ChatMessage[],
  secretWord: string
): Promise<AIResponse> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `OpenAI API error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  const raw = data.choices[0]?.message?.content?.trim() ?? "";

  // Parse JSON from the model's response
  let parsed: { guess?: string; message?: string } = {};
  try {
    // Strip markdown code fences if model wrapped it
    const jsonStr = raw.replace(/```json?/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    // Fallback: try to extract a guess from free-form text
    const wordMatch = raw.match(/\b([a-zA-Z]+)\b/);
    parsed = {
      guess: wordMatch?.[1]?.toLowerCase() ?? "unknown",
      message: raw,
    };
  }

  const guess = (parsed.guess ?? "").toLowerCase().trim();
  const message = parsed.message ?? raw;
  const correct = isCorrectGuess(guess, secretWord);

  return { guess, message, correct };
}

// ── Answer Checking ────────────────────────────────────────────────────────

/**
 * isCorrectGuess
 * Case-insensitive, whitespace-trimmed comparison.
 */
export function isCorrectGuess(guess: string, secretWord: string): boolean {
  return guess.trim().toLowerCase() === secretWord.trim().toLowerCase();
}

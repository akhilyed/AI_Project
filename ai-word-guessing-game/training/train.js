/**
 * train.js
 * --------
 * DescribeIt — AI Training Script
 *
 * This script fine-tunes a GPT model (e.g. gpt-3.5-turbo) on a
 * (description → guess) dataset so the model becomes better at guessing
 * words from natural-language clues — specifically tuned to the word list
 * in src/ai/wordList.ts.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   1. Install dependencies (from the training/ folder):
 *        npm install openai dotenv
 *
 *   2. Create a .env file in this folder:
 *        OPENAI_API_KEY=sk-...
 *
 *   3. Edit the TRAINING_DATA array below with your (description → word) pairs.
 *      The more diverse examples you add, the better the fine-tuned model.
 *
 *   4. Run:
 *        node train.js
 *
 *   5. The script will:
 *        a) Write training data to training_data.jsonl
 *        b) Upload it to OpenAI
 *        c) Start a fine-tuning job
 *        d) Poll every 30 s until it completes, then print the new model ID.
 *
 *   6. Copy the printed model ID into src/ai/gameAI.ts → const MODEL = "..."
 *
 * ── Notes ──────────────────────────────────────────────────────────────────
 *  - OpenAI requires at least 10 training examples for fine-tuning.
 *    More (50-200+) gives significantly better results.
 *  - Fine-tuning costs money; check https://openai.com/pricing before running.
 *  - The "system" message below MUST match SYSTEM_PROMPT in src/ai/gameAI.ts
 *    so the fine-tuned model has the same context during inference.
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSONL_PATH = path.join(__dirname, "training_data.jsonl");
const FINE_TUNE_MODEL = "gpt-3.5-turbo"; // Base model to fine-tune

// ── System prompt (must mirror src/ai/gameAI.ts → SYSTEM_PROMPT) ──────────

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
`.trim();

// ── Training Data ──────────────────────────────────────────────────────────
//
// Format: { word, clues: string[] }
//   - Each entry represents ONE multi-turn conversation.
//   - clues are given one at a time; the model should guess after each.
//   - The LAST clue should be enough for a definitive guess.
//
// Add as many word+clues pairs as you can — aim for 50+ entries.

const TRAINING_DATA = [
  {
    word: "elephant",
    clues: [
      "It is a very large mammal.",
      "It has four legs and lives in Africa and Asia.",
      "It has a long trunk it uses to drink water and grab things.",
      "It has large floppy ears and ivory tusks.",
    ],
  },
  {
    word: "umbrella",
    clues: [
      "You use it when it rains.",
      "It is held above your head and opens up like a dome.",
      "It has a handle and a canopy made of fabric stretched over metal ribs.",
    ],
  },
  {
    word: "volcano",
    clues: [
      "It is a landform, often found near tectonic plates.",
      "It can erupt and shoot hot liquid rock into the air.",
      "The hot liquid rock that comes out of it is called lava.",
    ],
  },
  {
    word: "pineapple",
    clues: [
      "It is a fruit.",
      "It has a rough, spiky outer skin and is yellow inside.",
      "It grows in tropical regions and tastes sweet and tangy.",
      "It is controversial as a pizza topping.",
    ],
  },
  {
    word: "telescope",
    clues: [
      "It is a scientific instrument.",
      "You look through it to see things that are very far away.",
      "Astronomers use it to observe stars and planets.",
    ],
  },
  {
    word: "submarine",
    clues: [
      "It is a type of vehicle.",
      "It travels underwater.",
      "It is used by navies for stealth missions and can launch torpedoes.",
    ],
  },
  {
    word: "cathedral",
    clues: [
      "It is a building.",
      "It is a place of worship for Christians.",
      "It is the main church in a diocese and often has very tall spires.",
      "Famous examples include Notre-Dame in Paris.",
    ],
  },
  {
    word: "flamingo",
    clues: [
      "It is a bird.",
      "It is known for standing on one leg.",
      "It has bright pink feathers and a curved beak.",
      "It lives near shallow lakes and lagoons.",
    ],
  },
  {
    word: "hourglass",
    clues: [
      "It is an object used to measure time.",
      "It has two glass chambers connected at the middle.",
      "Sand flows from the top chamber to the bottom.",
      "When all the sand has fallen, a set amount of time has passed.",
    ],
  },
  {
    word: "accordion",
    clues: [
      "It is a musical instrument.",
      "You hold it with both hands and squeeze it in and out.",
      "It has buttons or keys on one side and a bellows in the middle.",
      "It is common in folk music from France, Germany, and Argentina.",
    ],
  },
  {
    word: "labyrinth",
    clues: [
      "It is a structure or place.",
      "It is full of winding, confusing paths.",
      "In Greek mythology, the Minotaur was trapped in one.",
      "It is like a very complex maze.",
    ],
  },
  {
    word: "photosynthesis",
    clues: [
      "It is a biological process.",
      "Plants do this to make their own food.",
      "They use sunlight, water, and carbon dioxide.",
      "Oxygen is released as a byproduct.",
    ],
  },
  {
    word: "boomerang",
    clues: [
      "It is an object you throw.",
      "It was originally used by Australian Aboriginal people as a hunting tool.",
      "When thrown correctly, it curves in the air and comes back to you.",
    ],
  },
  {
    word: "kaleidoscope",
    clues: [
      "It is a tube-shaped toy.",
      "You look through one end and see colourful symmetrical patterns.",
      "Turning it changes the pattern because mirrors inside reflect small coloured pieces.",
    ],
  },
  {
    word: "cryptocurrency",
    clues: [
      "It is a type of digital currency.",
      "It uses cryptography and a decentralised ledger called a blockchain.",
      "Bitcoin is the most famous example.",
    ],
  },
];

// ── Build JSONL ────────────────────────────────────────────────────────────

function buildJSONL() {
  const lines = [];

  for (const entry of TRAINING_DATA) {
    // Build a multi-turn conversation that ends with the correct guess
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    for (let i = 0; i < entry.clues.length; i++) {
      const clue = entry.clues[i];
      const isLast = i === entry.clues.length - 1;

      messages.push({ role: "user", content: clue });

      if (isLast) {
        // Final assistant message: correct guess
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            guess: entry.word,
            message: `I'm very confident now — the word is **${entry.word}**! 🎉`,
          }),
        });
      } else {
        // Intermediate: uncertain guess (use a plausible but wrong guess)
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            guess: "unknown",
            message: `Interesting clue! I'm not sure yet — can you tell me more? Maybe give me another hint about its size or where it's found?`,
          }),
        });
      }
    }

    lines.push(JSON.stringify({ messages }));
  }

  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌  OPENAI_API_KEY is not set. Create a .env file in training/ with your key.");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 1. Write JSONL
  console.log("✏️  Writing training data to", JSONL_PATH);
  const jsonl = buildJSONL();
  fs.writeFileSync(JSONL_PATH, jsonl, "utf-8");
  console.log(`   ${TRAINING_DATA.length} training examples written.`);

  // 2. Upload file
  console.log("\n📤  Uploading training file to OpenAI...");
  const file = await openai.files.create({
    file: fs.createReadStream(JSONL_PATH),
    purpose: "fine-tune",
  });
  console.log(`   File uploaded. ID: ${file.id}`);

  // 3. Start fine-tune job
  console.log("\n🚀  Starting fine-tuning job...");
  const job = await openai.fineTuning.jobs.create({
    training_file: file.id,
    model: FINE_TUNE_MODEL,
  });
  console.log(`   Job ID: ${job.id}  |  Status: ${job.status}`);

  // 4. Poll until done
  console.log("\n⏳  Polling for completion (this can take 10–60 minutes)...");
  let current = job;
  while (current.status !== "succeeded" && current.status !== "failed" && current.status !== "cancelled") {
    await new Promise((r) => setTimeout(r, 30_000)); // wait 30 s
    current = await openai.fineTuning.jobs.retrieve(job.id);
    console.log(`   [${new Date().toLocaleTimeString()}] Status: ${current.status}`);
  }

  if (current.status === "succeeded") {
    console.log("\n✅  Fine-tuning complete!");
    console.log(`   Fine-tuned model ID: ${current.fine_tuned_model}`);
    console.log("\n👉  Copy that model ID into src/ai/gameAI.ts:");
    console.log(`   const MODEL = "${current.fine_tuned_model}";`);
  } else {
    console.error(`\n❌  Fine-tuning ${current.status}. Check the OpenAI dashboard for details.`);
  }
}

main().catch(console.error);

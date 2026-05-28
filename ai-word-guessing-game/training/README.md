# DescribeIt — Training Script

This folder contains the AI fine-tuning script for the DescribeIt game.

## How it works

The game AI (`src/ai/gameAI.ts`) uses OpenAI's GPT-3.5-turbo model by default,
guided by a carefully crafted system prompt. Fine-tuning makes the model
**specifically better** at guessing words from natural-language descriptions —
the exact task of this game.

## Setup

```bash
cd training
npm install
```

Create a `.env` file in the `training/` folder:

```
OPENAI_API_KEY=sk-your-key-here
```

## Run fine-tuning

```bash
npm run train
# or
node train.js
```

The script will:
1. Convert `TRAINING_DATA` in `train.js` to a `.jsonl` file
2. Upload it to OpenAI
3. Start a fine-tuning job
4. Poll every 30 seconds until the job completes
5. Print the new fine-tuned model ID

## Use the fine-tuned model

Once training completes, copy the model ID printed in the console, then update
`src/ai/gameAI.ts`:

```ts
const MODEL = "ft:gpt-3.5-turbo:your-org:describeit:xxxxxxxx";
```

Rebuild the website:

```bash
npm run build
```

## Extending the dataset

Add more entries to the `TRAINING_DATA` array in `train.js`:

```js
{
  word: "waterfall",
  clues: [
    "It is a natural feature found outdoors.",
    "Water flows over the edge of a cliff or rock face.",
    "Famous examples include Niagara and Victoria.",
  ],
},
```

Aim for **50–200+ examples** spanning diverse word categories for best results.

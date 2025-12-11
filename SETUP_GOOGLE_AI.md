# Google AI Setup Instructions

## Step 1: Install the Package

Run this command in your terminal (in the project directory):

```bash
npm install @google/generative-ai --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is needed to resolve a dependency conflict with eslint. This is safe to use.

## Step 2: Create .env.local File

1. In the project root folder (same folder as `package.json`), create a file named `.env.local`
2. Make sure the filename starts with a dot: `.env.local` (not `env.local`)
3. Add this line to the file (replace with your actual API key):

```
GOOGLE_AI_API_KEY=AIzaSyBQ8OlRfXoEjo_kcM_JkyRkFC6ADnA0xYk
```

**Important:**
- No spaces around the `=` sign
- No quotes around the value
- No trailing spaces
- The file must be in the project root (same folder as package.json)

## Step 3: Restart Dev Server

**CRITICAL:** After creating or modifying `.env.local`, you MUST restart your dev server:

1. Stop the current server (press Ctrl+C in the terminal)
2. Run: `npm run dev`
3. Wait for it to start completely

Next.js only loads `.env.local` when the server starts, so changes won't take effect until you restart.

## Step 4: Verify Setup

1. Go to the wizard page: `/wizard`
2. Fill in Product Name and Main Keyword (Step 1)
3. Fill in Audience & Tone (Step 2)
4. Go to Step 3 and click "Generate content with AI"
5. If you see an error, check the error message - it will tell you what's missing

## Troubleshooting

**Error: "GOOGLE_AI_API_KEY environment variable is not set"**
- Make sure `.env.local` exists in the project root
- Make sure the filename is exactly `.env.local` (with the dot)
- Make sure you restarted the dev server after creating the file
- Check that the file contains: `GOOGLE_AI_API_KEY=your-key-here` (no spaces around =)

**Error: "Google AI package is not installed"**
- Run: `npm install @google/generative-ai`
- Restart the dev server

**Error: "Invalid Google AI API key"**
- Verify your API key is correct
- Make sure there are no extra spaces or quotes in the .env.local file

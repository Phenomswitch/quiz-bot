# Discord Quiz Bot

A trivia bot for Discord with button-based answers, live timers, a per-server
custom question bank, and a persistent leaderboard. Built with discord.js v14.

## Features

- **`/quiz start`** — runs a quiz with 1–20 rounds. Choose the question source
  (Open Trivia DB API, your custom bank, or a mix), plus optional category and
  difficulty for API questions.
- **`/quiz stop`** — ends the quiz currently running in the channel.
- **Buttons, not reactions** — players click A/B/C/D within a 20-second timer;
  duplicate answers are blocked and answers are private (ephemeral) so others
  can't see what you picked.
- **Scoring** — 100 base points per correct answer, up to +50 for speed, and a
  +25 bonus for the first correct player each round.
- **`/leaderboard`** — top 10 for the server, with accuracy %. Server admins
  (Manage Server permission) can reset it with `/leaderboard reset:true`.
- **Custom question bank** — `/addquestion`, `/listquestions`,
  `/removequestion` let each server build its own question set, stored in
  `data/customQuestions.json`.

## Setup

### 1. Create the Discord application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. Under **Bot**, click **Reset Token** and copy it — this is `DISCORD_TOKEN`.
3. On the same Bot page, make sure **Public Bot** matches your needs (off if
   only you should be able to add it).
4. Copy the **Application ID** from the **General Information** page — this is
   `CLIENT_ID`.
5. Under **OAuth2 → URL Generator**, check the `bot` and
   `applications.commands` scopes, then under bot permissions check at least:
   `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`.
   Open the generated URL to invite the bot to your server.

### 2. Install and configure

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
GUILD_ID=your_test_server_id   # optional, for instant command sync while developing
```

`GUILD_ID` is optional — set it to your test server's ID (enable Developer
Mode in Discord, right-click the server icon → Copy Server ID) so slash
commands register instantly. Leave it blank for global commands, which can
take up to an hour to show up everywhere.

### 3. Register slash commands and run

```bash
npm run deploy   # registers /quiz, /leaderboard, /addquestion, etc.
npm start        # logs the bot in
```

You should see `✅ Logged in as YourBot#1234` in the console.

## Usage

```
/quiz start rounds:10 source:mixed category:science difficulty:medium
/quiz stop
/leaderboard
/leaderboard reset:true         (requires Manage Server permission)
/addquestion question:"..." option_a:"..." option_b:"..." option_c:"..." option_d:"..." correct:B category:"Movies"
/listquestions
/removequestion id:ab12cd34
```

## Data storage

Scores and custom questions are stored as JSON files in `data/`, scoped per
server (guild ID). This is intentionally simple for easy self-hosting — no
database required. If you outgrow it (very large servers, need for backups/
concurrency), swap the read/write calls in `lib/store.js` for a real database
like SQLite or Postgres; nothing else in the codebase needs to change.

## Project structure

```
index.js              Bot entry point, command loading, event wiring
deploy-commands.js     One-off script to register slash commands
commands/
  quiz.js              /quiz start|stop
  leaderboard.js        /leaderboard
  addquestion.js        /addquestion
  listquestions.js       /listquestions
  removequestion.js      /removequestion
lib/
  quizManager.js        Runs question rounds, timers, scoring, embeds
  triviaAPI.js           Open Trivia DB client + HTML entity decoding
  customQuestions.js     Per-guild custom question bank
  scores.js              Per-guild persistent leaderboard
  store.js                Tiny JSON file read/write helper
data/
  scores.json, customQuestions.json   (auto-created, gitignored contents grow at runtime)
```

## Notes & possible extensions

- Only one quiz can run per channel at a time; `/quiz start` in a busy channel
  is rejected with a hint to run it elsewhere or `/quiz stop` first.
- If OpenTDB has no questions matching a category/difficulty combo, mixed mode
  falls back to whatever custom questions exist rather than failing outright.
- Ideas if you want to extend it: timed "speed round" mode, image-based
  questions, per-category leaderboards, or a `/quiz history` command backed by
  a small SQLite table instead of the flat JSON file.

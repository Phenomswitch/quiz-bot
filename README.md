# quiz-bot

A Discord Quiz Bot built with Node.js and discord.js v14. It allows users to play interactive quizzes, keep track of scores, and manage custom quiz questions using slash commands.

# project structure
discord-quiz-bot/
├── commands/
├── data/
├── lib/
├── .env.example
├── deploy-commands.js
├── index.js
├── package.json
└── README.md

# requirements
- Node.js 18 or later
- Discord Developer Account
- Discord Bot Token

# installation
clone the repository
- git clone https://github.com/yourusername/discord-quiz-bot.git

 navigate into the project
- cd discord-quiz-bot

install dependencies
- npm install

# configuration 
create a .env file and add:
TOKEN=YOUR_BOT_TOKEN
CLIENT_ID=YOUR_APPLICATION_ID
GUILD_ID=YOUR_SERVER_ID

Replace the placeholders above with your Discord application credentials.

# deploy commands
- npm run deploy

# start the bot
- npm start

# commands
| Command           | Description               |
| ----------------- | ------------------------- |
| `/quiz`           | Start a quiz              |
| `/leaderboard`    | View the leaderboard      |
| `/addquestion`    | Add a custom question     |
| `/removequestion` | Remove a custom question  |
| `/listquestions`  | View all custom questions |

# data storage
The bot stores data in the data folder:
scores.json – User scores
customQuestions.json – Custom quiz questions

# technologies
- Node.js
- discord.js v14
- dotenv
- node-fetch

# license
This project is licensed under the MIT License

# author
Switch

const { SlashCommandBuilder } = require('discord.js');
const quizManager = require('../lib/quizManager');
const { CATEGORIES } = require('../lib/triviaAPI');

const categoryChoices = Object.keys(CATEGORIES).map((key) => ({ name: key, value: key }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Run a trivia quiz in this channel')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new quiz')
        .addIntegerOption((opt) =>
          opt.setName('rounds').setDescription('Number of questions (1-20)').setMinValue(1).setMaxValue(20)
        )
        .addStringOption((opt) =>
          opt
            .setName('source')
            .setDescription('Where questions come from')
            .addChoices(
              { name: 'mixed (custom + trivia API)', value: 'mixed' },
              { name: 'trivia API only', value: 'api' },
              { name: 'custom question bank only', value: 'custom' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('category').setDescription('Trivia API category (ignored for custom-only)').addChoices(...categoryChoices)
        )
        .addStringOption((opt) =>
          opt
            .setName('difficulty')
            .setDescription('Trivia API difficulty (ignored for custom-only)')
            .addChoices(
              { name: 'any', value: 'any' },
              { name: 'easy', value: 'easy' },
              { name: 'medium', value: 'medium' },
              { name: 'hard', value: 'hard' }
            )
        )
    )
    .addSubcommand((sub) => sub.setName('stop').setDescription('Stop the currently running quiz in this channel')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'stop') {
      const stopped = quizManager.stopQuiz(interaction.channelId);
      await interaction.reply(stopped ? '🛑 Stopping the quiz after this round…' : 'There\u2019s no quiz running here right now.');
      return;
    }

    // sub === 'start'
    if (quizManager.isQuizActive(interaction.channelId)) {
      await interaction.reply({ content: 'A quiz is already running in this channel. Use `/quiz stop` first.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const rounds = interaction.options.getInteger('rounds') ?? 5;
    const source = interaction.options.getString('source') ?? 'mixed';
    const category = interaction.options.getString('category') ?? 'any';
    const difficulty = interaction.options.getString('difficulty') ?? 'any';

    await quizManager.runQuiz(interaction, { rounds, source, category, difficulty });
  },
};

const { SlashCommandBuilder } = require('discord.js');
const customQuestions = require('../lib/customQuestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addquestion')
    .setDescription('Add a question to this server\u2019s custom quiz bank')
    .addStringOption((opt) => opt.setName('question').setDescription('The question text').setRequired(true))
    .addStringOption((opt) => opt.setName('option_a').setDescription('Option A').setRequired(true))
    .addStringOption((opt) => opt.setName('option_b').setDescription('Option B').setRequired(true))
    .addStringOption((opt) => opt.setName('option_c').setDescription('Option C').setRequired(true))
    .addStringOption((opt) => opt.setName('option_d').setDescription('Option D').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('correct')
        .setDescription('Which option is correct')
        .setRequired(true)
        .addChoices(
          { name: 'A', value: 'A' },
          { name: 'B', value: 'B' },
          { name: 'C', value: 'C' },
          { name: 'D', value: 'D' }
        )
    )
    .addStringOption((opt) => opt.setName('category').setDescription('Optional category label')),

  async execute(interaction) {
    const question = interaction.options.getString('question', true);
    const choices = [
      interaction.options.getString('option_a', true),
      interaction.options.getString('option_b', true),
      interaction.options.getString('option_c', true),
      interaction.options.getString('option_d', true),
    ];
    const correctIndex = ['A', 'B', 'C', 'D'].indexOf(interaction.options.getString('correct', true));
    const category = interaction.options.getString('category') ?? undefined;

    const entry = customQuestions.addQuestion(interaction.guildId, {
      question,
      choices,
      correctIndex,
      category,
      addedBy: interaction.user.id,
    });

    await interaction.reply({
      content: `✅ Added question **${entry.id.slice(0, 8)}** to the bank (category: ${entry.category}). Correct answer: ${String.fromCharCode(
        65 + correctIndex
      )}.`,
      ephemeral: true,
    });
  },
};

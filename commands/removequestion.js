const { SlashCommandBuilder } = require('discord.js');
const customQuestions = require('../lib/customQuestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removequestion')
    .setDescription('Remove a question from the custom bank by its ID')
    .addStringOption((opt) =>
      opt.setName('id').setDescription('Full or partial ID shown in /listquestions').setRequired(true)
    ),

  async execute(interaction) {
    const partialId = interaction.options.getString('id', true);
    const list = customQuestions.listQuestions(interaction.guildId);
    const match = list.find((q) => q.id.startsWith(partialId));

    if (!match) {
      await interaction.reply({ content: `No question found starting with \`${partialId}\`. Check /listquestions.`, ephemeral: true });
      return;
    }

    customQuestions.removeQuestion(interaction.guildId, match.id);
    await interaction.reply({ content: `🗑️ Removed question: "${match.question}"`, ephemeral: true });
  },
};

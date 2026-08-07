const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const customQuestions = require('../lib/customQuestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listquestions')
    .setDescription('List this server\u2019s custom quiz questions'),

  async execute(interaction) {
    const list = customQuestions.listQuestions(interaction.guildId);
    if (list.length === 0) {
      await interaction.reply({ content: 'No custom questions yet. Add one with `/addquestion`.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Custom question bank (${list.length})`)
      .setDescription(
        list
          .slice(0, 20)
          .map((q, i) => `**${i + 1}.** [\`${q.id.slice(0, 8)}\`] ${q.question} _(cat: ${q.category})_`)
          .join('\n') + (list.length > 20 ? `\n…and ${list.length - 20} more.` : '')
      )
      .setFooter({ text: 'Use /removequestion <id> to delete one.' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

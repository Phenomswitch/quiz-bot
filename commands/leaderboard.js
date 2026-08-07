const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const scores = require('../lib/scores');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show this server\u2019s quiz leaderboard')
    .addBooleanOption((opt) =>
      opt.setName('reset').setDescription('Reset the leaderboard (admin only)')
    ),

  async execute(interaction) {
    const wantsReset = interaction.options.getBoolean('reset') ?? false;

    if (wantsReset) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: 'You need the "Manage Server" permission to reset the leaderboard.', ephemeral: true });
        return;
      }
      scores.resetGuild(interaction.guildId);
      await interaction.reply('🧹 Leaderboard has been reset for this server.');
      return;
    }

    const top = scores.getLeaderboard(interaction.guildId, 10);
    if (top.length === 0) {
      await interaction.reply('No scores yet — run `/quiz start` to get things going!');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`🏆 Leaderboard — ${interaction.guild?.name ?? 'this server'}`)
      .setDescription(
        top
          .map((entry, idx) => {
            const rankIcon = medals[idx] ?? `**${idx + 1}.**`;
            const accuracy = entry.played > 0 ? Math.round((entry.correct / entry.played) * 100) : 0;
            return `${rankIcon} <@${entry.userId}> — **${entry.points}** pts (${entry.correct}/${entry.played}, ${accuracy}%)`;
          })
          .join('\n')
      );

    await interaction.reply({ embeds: [embed] });
  },
};

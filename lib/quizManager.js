const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');
const triviaAPI = require('./triviaAPI');
const customQuestions = require('./customQuestions');
const scores = require('./scores');

const LETTERS = ['🇦', '🇧', '🇨', '🇩'];
const BUTTON_STYLES = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];
const QUESTION_TIME_MS = 20_000;
const BASE_POINTS = 100;
const SPEED_BONUS_MAX = 50;
const FIRST_CORRECT_BONUS = 25;

// channelId -> { stopRequested: boolean }
const activeSessions = new Map();

function isQuizActive(channelId) {
  return activeSessions.has(channelId);
}

function stopQuiz(channelId) {
  const session = activeSessions.get(channelId);
  if (!session) return false;
  session.stopRequested = true;
  return true;
}

function buildQuestionEmbed(q, index, total, timeLeftMs) {
  const seconds = Math.ceil(timeLeftMs / 1000);
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`Question ${index + 1} / ${total}`)
    .setDescription(`**${q.question}**`)
    .addFields(
      q.choices.map((choice, i) => ({
        name: `${LETTERS[i]} Option ${String.fromCharCode(65 + i)}`,
        value: choice,
        inline: false,
      }))
    )
    .setFooter({ text: `Category: ${q.category} • ${seconds}s to answer • Source: ${q.source}` });
}

function buildAnswerRow(q, disabled, correctIndex = null) {
  const row = new ActionRowBuilder();
  q.choices.forEach((choice, i) => {
    const btn = new ButtonBuilder()
      .setCustomId(`quiz_answer_${i}`)
      .setLabel(`${String.fromCharCode(65 + i)}`)
      .setStyle(BUTTON_STYLES[i % BUTTON_STYLES.length])
      .setDisabled(disabled);
    if (disabled && correctIndex !== null) {
      if (i === correctIndex) btn.setStyle(ButtonStyle.Success);
      else btn.setStyle(ButtonStyle.Secondary);
    }
    row.addComponents(btn);
  });
  return row;
}

async function getQuestionSet({ guildId, rounds, source, category, difficulty }) {
  if (source === 'custom') {
    const qs = customQuestions.getRandom(guildId, rounds);
    if (qs.length === 0) {
      throw new Error('No custom questions found for this server. Add some with /addquestion first.');
    }
    return qs;
  }

  if (source === 'api') {
    return triviaAPI.fetchQuestions({ count: rounds, category, difficulty });
  }

  // mixed: fill as much as possible from custom, top up with API
  const custom = customQuestions.getRandom(guildId, rounds);
  const remaining = rounds - custom.length;
  if (remaining <= 0) return custom.slice(0, rounds);

  try {
    const apiQuestions = await triviaAPI.fetchQuestions({ count: remaining, category, difficulty });
    return [...custom, ...apiQuestions].sort(() => Math.random() - 0.5);
  } catch (err) {
    if (custom.length > 0) return custom; // degrade gracefully
    throw err;
  }
}

async function runQuiz(interaction, { rounds, source, category, difficulty }) {
  const channel = interaction.channel;
  const guildId = interaction.guildId;

  if (isQuizActive(channel.id)) {
    await interaction.editReply('A quiz is already running in this channel. Use `/quiz stop` to end it first.');
    return;
  }

  let questions;
  try {
    questions = await getQuestionSet({ guildId, rounds, source, category, difficulty });
  } catch (err) {
    await interaction.editReply(`Couldn't start the quiz: ${err.message}`);
    return;
  }

  if (questions.length === 0) {
    await interaction.editReply('No questions available to run this quiz.');
    return;
  }

  const session = { stopRequested: false };
  activeSessions.set(channel.id, session);

  const roundWinners = []; // { userId, username, question }
  const participants = new Map(); // userId -> username, for "played" tracking

  try {
    await interaction.editReply(
      `🎬 Starting a quiz with **${questions.length}** question(s)! First correct answer per round gets a speed bonus. Good luck!`
    );

    for (let i = 0; i < questions.length; i++) {
      if (session.stopRequested) break;
      const q = questions[i];
      const embed = buildQuestionEmbed(q, i, questions.length, QUESTION_TIME_MS);
      const row = buildAnswerRow(q, false);
      const qMessage = await channel.send({ embeds: [embed], components: [row] });

      const answered = new Map(); // userId -> { index, timeMs }
      const startedAt = Date.now();

      const collector = qMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: QUESTION_TIME_MS,
      });

      await new Promise((resolve) => {
        collector.on('collect', async (btnInteraction) => {
          const userId = btnInteraction.user.id;
          participants.set(userId, btnInteraction.user.username);

          if (answered.has(userId)) {
            await btnInteraction.reply({ content: 'You already locked in an answer for this round!', ephemeral: true });
            return;
          }

          const chosenIndex = Number(btnInteraction.customId.split('_').pop());
          const elapsed = Date.now() - startedAt;
          answered.set(userId, { index: chosenIndex, timeMs: elapsed });

          await btnInteraction.reply({
            content: `Locked in: **${String.fromCharCode(65 + chosenIndex)}** — ${q.choices[chosenIndex]}`,
            ephemeral: true,
          });
        });

        collector.on('end', () => resolve());
      });

      // Score the round
      let firstCorrectUserId = null;
      for (const [userId, { index, timeMs }] of answered.entries()) {
        const wasCorrect = index === q.correctIndex;
        const username = participants.get(userId) || 'Unknown';
        if (wasCorrect) {
          const timeRatio = Math.max(0, 1 - timeMs / QUESTION_TIME_MS);
          const speedBonus = Math.round(SPEED_BONUS_MAX * timeRatio);
          let points = BASE_POINTS + speedBonus;
          if (firstCorrectUserId === null) {
            firstCorrectUserId = userId;
            points += FIRST_CORRECT_BONUS;
          }
          scores.addPoints(guildId, userId, username, points, true);
        } else {
          scores.addPoints(guildId, userId, username, 0, false);
        }
      }

      if (firstCorrectUserId) {
        roundWinners.push({ userId: firstCorrectUserId, username: participants.get(firstCorrectUserId), question: q.question });
      }

      const revealEmbed = buildQuestionEmbed(q, i, questions.length, 0);
      revealEmbed.addFields({
        name: 'Correct answer',
        value: `${String.fromCharCode(65 + q.correctIndex)}. ${q.choices[q.correctIndex]}`,
      });
      if (firstCorrectUserId) {
        revealEmbed.addFields({ name: 'First correct', value: `<@${firstCorrectUserId}> ⚡` });
      } else if (answered.size === 0) {
        revealEmbed.addFields({ name: 'Result', value: 'Nobody answered in time!' });
      } else {
        revealEmbed.addFields({ name: 'Result', value: 'Nobody got it right this round.' });
      }

      const revealRow = buildAnswerRow(q, true, q.correctIndex);
      await qMessage.edit({ embeds: [revealEmbed], components: [revealRow] });

      // Brief pause between rounds so results are readable
      if (i < questions.length - 1 && !session.stopRequested) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // Final summary
    const finalBoard = scores.getLeaderboard(guildId, 5);
    const summary = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(session.stopRequested ? '🛑 Quiz stopped' : '🏁 Quiz complete!')
      .setDescription(
        finalBoard.length
          ? finalBoard
              .map((entry, idx) => `**${idx + 1}.** <@${entry.userId}> — ${entry.points} pts (${entry.correct} correct)`)
              .join('\n')
          : 'No one scored any points this round.'
      )
      .setFooter({ text: 'Use /leaderboard anytime to see full standings.' });

    await channel.send({ embeds: [summary] });
  } finally {
    activeSessions.delete(channel.id);
  }
}

module.exports = { runQuiz, isQuizActive, stopQuiz };

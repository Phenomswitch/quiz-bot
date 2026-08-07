const path = require('path');
const { readJSON, writeJSON } = require('./store');

const SCORES_PATH = path.join(__dirname, '..', 'data', 'scores.json');

// Shape: { [guildId]: { [userId]: { username, points, correct, played } } }
function loadAll() {
  return readJSON(SCORES_PATH, {});
}

function saveAll(data) {
  writeJSON(SCORES_PATH, data);
}

function addPoints(guildId, userId, username, points, wasCorrect) {
  const all = loadAll();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) {
    all[guildId][userId] = { username, points: 0, correct: 0, played: 0 };
  }
  const entry = all[guildId][userId];
  entry.username = username; // keep display name fresh
  entry.points += points;
  entry.played += 1;
  if (wasCorrect) entry.correct += 1;
  saveAll(all);
  return entry;
}

function recordPlayed(guildId, userId, username) {
  const all = loadAll();
  if (!all[guildId]) all[guildId] = {};
  if (!all[guildId][userId]) {
    all[guildId][userId] = { username, points: 0, correct: 0, played: 0 };
  }
  all[guildId][userId].username = username;
  all[guildId][userId].played += 1;
  saveAll(all);
}

function getLeaderboard(guildId, limit = 10) {
  const all = loadAll();
  const guildScores = all[guildId] || {};
  return Object.entries(guildScores)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

function resetGuild(guildId) {
  const all = loadAll();
  delete all[guildId];
  saveAll(all);
}

module.exports = { addPoints, recordPlayed, getLeaderboard, resetGuild };

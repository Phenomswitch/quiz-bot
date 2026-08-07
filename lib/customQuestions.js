const path = require('path');
const crypto = require('crypto');
const { readJSON, writeJSON } = require('./store');

const QUESTIONS_PATH = path.join(__dirname, '..', 'data', 'customQuestions.json');

// Shape: { [guildId]: [{ id, question, choices: [4], correctIndex, category, addedBy }] }
function loadAll() {
  return readJSON(QUESTIONS_PATH, {});
}

function saveAll(data) {
  writeJSON(QUESTIONS_PATH, data);
}

function addQuestion(guildId, { question, choices, correctIndex, category, addedBy }) {
  const all = loadAll();
  if (!all[guildId]) all[guildId] = [];
  const entry = {
    id: crypto.randomUUID(),
    question,
    choices,
    correctIndex,
    category: category || 'Custom',
    addedBy,
  };
  all[guildId].push(entry);
  saveAll(all);
  return entry;
}

function removeQuestion(guildId, id) {
  const all = loadAll();
  if (!all[guildId]) return false;
  const before = all[guildId].length;
  all[guildId] = all[guildId].filter((q) => q.id !== id);
  saveAll(all);
  return all[guildId].length < before;
}

function listQuestions(guildId) {
  const all = loadAll();
  return all[guildId] || [];
}

// Returns a normalized question shape shared with the trivia API questions:
// { question, choices: [4 strings], correctIndex, category, source }
function getRandom(guildId, count) {
  const pool = listQuestions(guildId);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => ({
    question: q.question,
    choices: q.choices,
    correctIndex: q.correctIndex,
    category: q.category,
    source: 'custom',
  }));
}

module.exports = { addQuestion, removeQuestion, listQuestions, getRandom };

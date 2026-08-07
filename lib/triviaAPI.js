const fetch = require('node-fetch');

// A curated subset of OpenTDB category IDs for the /quiz start autocomplete.
// Full list: https://opentdb.com/api_category.php
const CATEGORIES = {
  any: null,
  general: 9,
  books: 10,
  film: 11,
  music: 12,
  television: 14,
  videogames: 15,
  boardgames: 16,
  science: 17,
  computers: 18,
  math: 19,
  mythology: 20,
  sports: 21,
  geography: 22,
  history: 23,
  animals: 27,
};

const ENTITY_MAP = {
  '&quot;': '"',
  '&#039;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&eacute;': 'é',
  '&uuml;': 'ü',
  '&ouml;': 'ö',
  '&auml;': 'ä',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&hellip;': '…',
};

function decodeEntities(str) {
  return str.replace(/&[a-zA-Z#0-9]+;/g, (match) => ENTITY_MAP[match] || match);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Fetches `count` multiple-choice questions from OpenTDB and normalizes them to:
 * { question, choices: [4 strings], correctIndex, category, source: 'api' }
 */
async function fetchQuestions({ count = 5, category = 'any', difficulty = null } = {}) {
  const params = new URLSearchParams({ amount: String(count), type: 'multiple' });
  const catId = CATEGORIES[category];
  if (catId) params.set('category', String(catId));
  if (difficulty && difficulty !== 'any') params.set('difficulty', difficulty);

  const url = `https://opentdb.com/api.php?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenTDB request failed: ${res.status}`);
  const data = await res.json();

  if (data.response_code !== 0 || !Array.isArray(data.results) || data.results.length === 0) {
    throw new Error('OpenTDB returned no questions for that combination of filters.');
  }

  return data.results.map((q) => {
    const correctAnswer = decodeEntities(q.correct_answer);
    const incorrect = q.incorrect_answers.map(decodeEntities);
    const choices = shuffle([correctAnswer, ...incorrect]);
    return {
      question: decodeEntities(q.question),
      choices,
      correctIndex: choices.indexOf(correctAnswer),
      category: decodeEntities(q.category),
      difficulty: q.difficulty,
      source: 'api',
    };
  });
}

module.exports = { fetchQuestions, CATEGORIES };

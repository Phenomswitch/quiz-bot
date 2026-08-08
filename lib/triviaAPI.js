const fetch = require('node-fetch');

// A curated subset of OpenTDB category IDs for the /quiz start autocomplete.
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

// Helper: fetch with timeout
async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Fetches `count` multiple-choice questions from OpenTDB
 * with timeout + retry.
 */
async function fetchQuestions({ count = 5, category = 'any', difficulty = null } = {}) {
  const params = new URLSearchParams({ amount: String(count), type: 'multiple' });
  const catId = CATEGORIES[category];
  if (catId) params.set('category', String(catId));
  if (difficulty && difficulty !== 'any') params.set('difficulty', difficulty);

  const url = `https://opentdb.com/api.php?${params.toString()}`;

  let lastError;

  // Retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetchWithTimeout(url, 8000);

      if (!res.ok) {
        throw new Error(`OpenTDB request failed: ${res.status}`);
      }

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
    } catch (err) {
      lastError = err;
      console.warn(`OpenTDB attempt ${attempt} failed:`, err.message);

      // Wait a bit before retrying
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // All retries failed
  throw new Error(`Failed to fetch questions after 3 attempts: ${lastError.message}`);
}

module.exports = { fetchQuestions, CATEGORIES };

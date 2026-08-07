// Minimal, dependency-free JSON file store with atomic-ish writes.
// Good enough for a self-hosted single-instance bot. If you outgrow this,
// swap the read/write internals for SQLite without touching call sites.
const fs = require('fs');
const path = require('path');

function ensureFile(filePath, defaultValue) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJSON(filePath, defaultValue) {
  ensureFile(filePath, defaultValue);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.trim() ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Failed to read ${filePath}, resetting to default.`, err);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  ensureFile(filePath, data);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

module.exports = { readJSON, writeJSON };

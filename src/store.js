const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function readJson(relativePath, fallback) {
  const file = path.join(ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(relativePath, value) {
  const file = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function id(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { readJson, writeJson, id };

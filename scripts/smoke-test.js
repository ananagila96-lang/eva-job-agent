const fs = require('fs');
const path = require('path');
const { analyzeJob } = require('../src/matcher');

const profile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'profile.json'), 'utf8'));
const sample = {
  title: 'Implementation Specialist',
  company: 'Demo',
  description: 'Customer service, operations, REST API, JavaScript and English',
  location: 'Remote'
};
const result = analyzeJob(sample, profile);
if (!Number.isFinite(result.score)) throw new Error('Matcher did not return a numeric score');
if (!Array.isArray(result.matchedSkills)) throw new Error('Matcher did not return matchedSkills');
console.log('Smoke test OK:', result);

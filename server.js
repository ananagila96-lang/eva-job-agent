const express = require('express');
const cors = require('cors');
const path = require('path');
const { readJson, writeJson, id } = require('./src/store');
const { analyzeJob } = require('./src/matcher');
const { coverLetter } = require('./src/coverLetter');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function profile() {
  return readJson('config/profile.json', {});
}

function jobs() {
  return readJson('data/jobs.json', []);
}

function applications() {
  return readJson('data/applications.json', []);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, project: 'EVA-01', time: new Date().toISOString() });
});

app.get('/api/profile', (_req, res) => res.json(profile()));

app.get('/api/jobs', (_req, res) => {
  const p = profile();
  const result = jobs()
    .map(job => ({ ...job, analysis: analyzeJob(job, p) }))
    .sort((a, b) => b.analysis.score - a.analysis.score);
  res.json(result);
});

app.post('/api/jobs', (req, res) => {
  const current = jobs();
  const incoming = req.body || {};
  const job = {
    id: id('job'),
    title: incoming.title || '',
    company: incoming.company || '',
    location: incoming.location || '',
    workplace: incoming.workplace || '',
    url: incoming.url || '',
    description: incoming.description || '',
    source: incoming.source || 'manual',
    createdAt: new Date().toISOString()
  };
  current.push(job);
  writeJson('data/jobs.json', current);
  res.status(201).json({ ...job, analysis: analyzeJob(job, profile()) });
});

app.post('/api/jobs/import', (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : [];
  const current = jobs();
  const known = new Set(current.map(j => j.url || `${j.company}|${j.title}`));
  const added = [];

  for (const item of incoming) {
    const key = item.url || `${item.company}|${item.title}`;
    if (!key || known.has(key)) continue;
    const job = {
      id: id('job'),
      title: item.title || '',
      company: item.company || '',
      location: item.location || '',
      workplace: item.workplace || '',
      url: item.url || '',
      description: item.description || '',
      source: item.source || 'browser',
      createdAt: new Date().toISOString()
    };
    current.push(job);
    added.push(job);
    known.add(key);
  }

  writeJson('data/jobs.json', current);
  res.json({ imported: added.length, jobs: added });
});

app.post('/api/jobs/:id/letter', (req, res) => {
  const job = jobs().find(j => j.id === req.params.id);
  if (!job) return res.status(404).json({ error: 'Vaga nao encontrada' });
  const language = req.body?.language === 'en' ? 'en' : 'pt';
  res.json({ letter: coverLetter(job, profile(), language) });
});

app.get('/api/applications', (_req, res) => res.json(applications()));

app.post('/api/applications', (req, res) => {
  const current = applications();
  const application = {
    id: id('app'),
    jobId: req.body?.jobId || '',
    status: req.body?.status || 'prepared',
    notes: req.body?.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  current.push(application);
  writeJson('data/applications.json', current);
  res.status(201).json(application);
});

app.patch('/api/applications/:id', (req, res) => {
  const current = applications();
  const index = current.findIndex(a => a.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Candidatura nao encontrada' });
  current[index] = {
    ...current[index],
    ...req.body,
    id: current[index].id,
    updatedAt: new Date().toISOString()
  };
  writeJson('data/applications.json', current);
  res.json(current[index]);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EVA-01 online em http://localhost:${PORT}`);
});

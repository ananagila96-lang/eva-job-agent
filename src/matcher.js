function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function analyzeJob(job, profile) {
  const haystack = normalize([
    job.title,
    job.company,
    job.description,
    job.location,
    job.workplace,
    ...(job.tags || [])
  ].filter(Boolean).join(' '));

  const matchedSkills = [];
  const matchedRoles = [];
  const warnings = [];
  let points = 0;

  for (const skill of profile.skills || []) {
    if (haystack.includes(normalize(skill))) {
      matchedSkills.push(skill);
      points += 6;
    }
  }

  for (const role of profile.targetRoles || []) {
    const words = normalize(role).split(/\s+/).filter(w => w.length > 3);
    const hits = words.filter(w => haystack.includes(w));
    if (hits.length >= Math.max(1, Math.ceil(words.length / 2))) {
      matchedRoles.push(role);
      points += 10;
    }
  }

  if (/english|ingles/.test(haystack)) points += 8;
  if (/remote|remoto|home office/.test(haystack) && profile.preferences?.remote) points += 8;
  if (/brasilia|distrito federal|df/.test(haystack) && profile.preferences?.onsiteBrasilia) points += 6;
  if (/senior|sr\.|lead|principal|staff/.test(haystack)) {
    warnings.push('Senioridade possivelmente acima do perfil-alvo');
    points -= 18;
  }
  if (/5\+\s*(years|anos)|five years|cinco anos/.test(haystack)) {
    warnings.push('Requisito de 5+ anos identificado');
    points -= 12;
  }

  const score = Math.max(0, Math.min(100, Math.round(points)));
  return {
    score,
    matchedSkills,
    matchedRoles,
    warnings,
    recommended: score >= (profile.preferences?.minimumMatch ?? 55)
  };
}

module.exports = { analyzeJob };

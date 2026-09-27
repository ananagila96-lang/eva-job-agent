const $ = s => document.querySelector(s);

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function scoreClass(score) {
  if (score >= 55) return 'good';
  if (score >= 35) return 'mid';
  return 'low';
}

async function refreshAgentStatus() {
  try {
    const status = await api('/api/agent/status');
    const last = status.last;
    let text = `Fila: ${status.pending} pendente(s) • ${status.running} em execução • ${status.completed} concluída(s)`;
    if (last) text += ` • Última: ${last.type} (${last.status})`;
    $('#agentStatus').textContent = text;
  } catch {
    $('#agentStatus').textContent = 'Agente indisponível. Atualize a página.';
  }
}

async function load() {
  const [profile, jobs, applications] = await Promise.all([
    api('/api/profile'), api('/api/jobs'), api('/api/applications')
  ]);

  $('#profileName').textContent = profile.name || 'Perfil';
  $('#profileSummary').textContent = profile.summary || '';
  $('#profileTags').innerHTML = (profile.targetRoles || []).slice(0, 8).map(x => `<span class="tag">${x}</span>`).join('');

  const recommended = jobs.filter(j => j.analysis?.recommended).length;
  const sent = applications.filter(a => a.status === 'sent').length;
  const interviews = applications.filter(a => a.status === 'interview').length;
  $('#stats').innerHTML = [
    ['Vagas', jobs.length], ['Recomendadas', recommended], ['Enviadas', sent], ['Entrevistas', interviews]
  ].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');

  $('#jobs').innerHTML = jobs.length ? jobs.map(job => {
    const a = job.analysis || { score: 0, matchedSkills: [], warnings: [] };
    const skills = a.matchedSkills?.slice(0, 6).join(', ') || 'Sem correspondências fortes ainda';
    const warning = a.warnings?.length ? `<p class="meta">⚠ ${a.warnings.join(' • ')}</p>` : '';
    return `<article class="job">
      <div>
        <h3>${job.title || 'Sem cargo'}</h3>
        <p>${job.company || 'Empresa não informada'} ${job.location ? '• ' + job.location : ''}</p>
        <p class="meta">Match: ${skills}</p>${warning}
      </div>
      <div class="job-actions">
        <div class="score ${scoreClass(a.score)}">${a.score}%</div>
        <button class="small-btn" onclick="letter('${job.id}')">Carta</button>
        <button class="small-btn secondary" onclick="prepare('${job.id}')">Preparar</button>
        ${job.url ? `<button class="small-btn" onclick="executeApplication('${job.id}','${job.url.replace(/'/g, "\\'")}')">Agente executar</button>` : ''}
        ${job.url ? `<button class="small-btn secondary" onclick="window.open('${job.url}','_blank')">Abrir vaga</button>` : ''}
      </div>
    </article>`;
  }).join('') : '<div class="empty">Nenhuma vaga ainda. Use “Varrer vagas abertas” com o LinkedIn aberto.</div>';

  $('#applications').innerHTML = applications.length ? applications.slice().reverse().map(a => `<div class="application"><strong>${a.status}</strong><span>${new Date(a.updatedAt || a.createdAt).toLocaleString('pt-BR')}</span></div>`).join('') : '<div class="empty">Nenhuma candidatura preparada.</div>';

  await refreshAgentStatus();
}

$('#jobForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  await api('/api/jobs', { method: 'POST', body: JSON.stringify(data) });
  e.target.reset();
  await load();
});

async function letter(id) {
  const { letter } = await api(`/api/jobs/${id}/letter`, { method: 'POST', body: JSON.stringify({ language: 'pt' }) });
  $('#letterText').value = letter;
  $('#letterDialog').showModal();
}

async function prepare(id) {
  await api('/api/applications', { method: 'POST', body: JSON.stringify({ jobId: id, status: 'prepared' }) });
  await load();
}

async function executeApplication(id, url) {
  await prepare(id);
  await api('/api/agent/tasks', {
    method: 'POST',
    body: JSON.stringify({ type: 'prepare_application', jobId: id, targetUrl: url })
  });
  window.open(url, '_blank');
  await refreshAgentStatus();
}

async function queueScan() {
  await api('/api/agent/tasks', { method: 'POST', body: JSON.stringify({ type: 'scan_jobs', targetUrl: 'https://www.linkedin.com/jobs/' }) });
  window.open('https://www.linkedin.com/jobs/', '_blank');
  await refreshAgentStatus();
}

$('#refreshBtn').onclick = load;
$('#linkedinBtn').onclick = () => window.open('https://www.linkedin.com/jobs/', '_blank');
$('#openLinkedinAgent').onclick = () => window.open('https://www.linkedin.com/jobs/', '_blank');
$('#scanLinkedin').onclick = queueScan;
$('#closeLetter').onclick = () => $('#letterDialog').close();
$('#copyLetter').onclick = () => navigator.clipboard.writeText($('#letterText').value);

load().catch(err => {
  console.error(err);
  $('#jobs').innerHTML = `<div class="empty">Erro ao carregar EVA-01: ${err.message}</div>`;
});

setInterval(refreshAgentStatus, 4000);
window.letter = letter;
window.prepare = prepare;
window.executeApplication = executeApplication;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function showView(id) {
  $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
  $$('.nav').forEach(n => n.classList.toggle('active', n.dataset.target === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('[data-target]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.target)));

function scoreClass(score) {
  if (score >= 55) return 'good';
  if (score >= 35) return 'mid';
  return 'low';
}

function taskLabel(type) {
  return type === 'scan_jobs' ? 'Varredura de vagas' : type === 'prepare_application' ? 'Preparar candidatura' : type;
}

async function refreshAgentStatus() {
  try {
    const [status, activity] = await Promise.all([api('/api/agent/status'), api('/api/agent/activity')]);
    const text = `${status.pending} na fila • ${status.running} executando • ${status.completed} concluídas`;
    $('#agentStatus').textContent = text;
    $('#sideStatus').textContent = status.running ? 'Executando agora' : status.pending ? 'Aguardando extensão' : 'Pronto';
    $('#agentHeadline').textContent = status.running ? 'Executando agora' : status.pending ? 'Tarefa na fila' : 'Pronta para trabalhar';
    $('#activity').innerHTML = activity.length ? activity.map(t => `
      <div class="activity-item">
        <div><strong>${taskLabel(t.type)}</strong><span>${t.command || t.targetUrl || 'EVA-01'}</span></div>
        <span>${t.status} • ${new Date(t.updatedAt || t.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>`).join('') : '<div class="empty">Nenhuma atividade ainda.</div>';
  } catch {
    $('#agentStatus').textContent = 'Executor indisponível';
    $('#sideStatus').textContent = 'Offline';
  }
}

async function load() {
  const [profile, jobs, applications] = await Promise.all([
    api('/api/profile'), api('/api/jobs'), api('/api/applications')
  ]);

  $('#profileName').textContent = profile.name || 'Perfil';
  $('#profileSummary').textContent = profile.summary || '';
  $('#profileTags').innerHTML = (profile.targetRoles || []).map(x => `<span class="tag">${x}</span>`).join('');

  const recommended = jobs.filter(j => j.analysis?.recommended).length;
  const sent = applications.filter(a => a.status === 'sent').length;
  const interviews = applications.filter(a => a.status === 'interview').length;
  $('#stats').innerHTML = [
    ['Vagas', jobs.length], ['Recomendadas', recommended], ['Enviadas', sent], ['Entrevistas', interviews]
  ].map(([label, value]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');

  $('#jobs').innerHTML = jobs.length ? jobs.map(job => {
    const a = job.analysis || { score: 0, matchedSkills: [], warnings: [] };
    const skills = a.matchedSkills?.slice(0, 5).join(', ') || 'Sem correspondências fortes';
    const warning = a.warnings?.length ? `<p>⚠ ${a.warnings.join(' • ')}</p>` : '';
    const safeUrl = String(job.url || '').replace(/'/g, "\\'");
    return `<article class="job">
      <div>
        <h3>${job.title || 'Sem cargo'}</h3>
        <p>${job.company || 'Empresa não informada'} ${job.location ? '• ' + job.location : ''}</p>
        <p>Match: ${skills}</p>${warning}
      </div>
      <div class="job-actions">
        <div class="score ${scoreClass(a.score)}">${a.score}%</div>
        <button class="small-btn" onclick="executeApplication('${job.id}','${safeUrl}')">Executar</button>
        <button class="small-btn secondary" onclick="letter('${job.id}')">Carta</button>
        <button class="small-btn secondary" onclick="prepare('${job.id}')">Preparar</button>
        ${job.url ? `<button class="small-btn secondary" onclick="window.open('${safeUrl}','_blank')">Abrir vaga</button>` : ''}
      </div>
    </article>`;
  }).join('') : '<div class="empty">Nenhuma vaga ainda. Peça para a EVA varrer o LinkedIn.</div>';

  $('#applications').innerHTML = applications.length ? applications.slice().reverse().map(a => `
    <div class="application"><strong>${a.status}</strong><span>${new Date(a.updatedAt || a.createdAt).toLocaleString('pt-BR')}</span></div>`).join('') : '<div class="empty">Nenhuma candidatura preparada.</div>';

  await refreshAgentStatus();
}

$('#jobForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  await api('/api/jobs', { method: 'POST', body: JSON.stringify(data) });
  e.target.reset();
  toast('Vaga salva e analisada.');
  await load();
});

$('#commandForm').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('#commandInput').value.trim();
  if (!text) return;
  const result = await api('/api/agent/command', { method: 'POST', body: JSON.stringify({ text }) });
  toast(result.message || 'Comando enviado.');
  $('#commandInput').value = '';
  if (result.task?.type === 'scan_jobs') window.open('https://www.linkedin.com/jobs/', '_blank');
  await refreshAgentStatus();
});

async function letter(id) {
  const { letter } = await api(`/api/jobs/${id}/letter`, { method: 'POST', body: JSON.stringify({ language: 'pt' }) });
  $('#letterText').value = letter;
  $('#letterDialog').showModal();
}

async function prepare(id) {
  await api('/api/applications', { method: 'POST', body: JSON.stringify({ jobId: id, status: 'prepared' }) });
  toast('Candidatura preparada.');
  await load();
}

async function executeApplication(id, url) {
  if (!url) return toast('Essa vaga ainda não tem link para execução.');
  await prepare(id);
  await api('/api/agent/tasks', { method: 'POST', body: JSON.stringify({ type: 'prepare_application', jobId: id, targetUrl: url }) });
  toast('Tarefa enviada ao executor.');
  window.open(url, '_blank');
  await refreshAgentStatus();
}

async function queueScan() {
  await api('/api/agent/tasks', { method: 'POST', body: JSON.stringify({ type: 'scan_jobs', targetUrl: 'https://www.linkedin.com/jobs/' }) });
  toast('Varredura colocada na fila.');
  window.open('https://www.linkedin.com/jobs/', '_blank');
  await refreshAgentStatus();
}

$('#refreshBtn').onclick = load;
$('#linkedinBtn').onclick = () => window.open('https://www.linkedin.com/jobs/', '_blank');
$('#openLinkedinAgent').onclick = () => window.open('https://www.linkedin.com/jobs/', '_blank');
$('#scanLinkedin').onclick = queueScan;
$('#closeLetter').onclick = () => $('#letterDialog').close();
$('#copyLetter').onclick = async () => { await navigator.clipboard.writeText($('#letterText').value); toast('Carta copiada.'); };

load().catch(err => {
  console.error(err);
  toast(`Erro ao carregar EVA-01: ${err.message}`);
});

setInterval(refreshAgentStatus, 4000);
window.letter = letter;
window.prepare = prepare;
window.executeApplication = executeApplication;

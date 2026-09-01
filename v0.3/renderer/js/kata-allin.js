let _uid = Date.now();
const uid = () => ++_uid;
const sanitize = v => typeof v==='string' ? v.replace(/<[^>]*>/g,'').trim().slice(0,200) : '';
const go = p => { window.location.href = p; };
const openDisplay = () => window.api.send('display:open');

const t = {
  name:'', category:'', judges:5,
  competitors:[], currentRound:1,
  currentPerformer:null,
  judgeScores:{}, done:false
};

let judgeServerRunning = false;

function loadSoundSettings() {
  window.api.invoke('settings:get-all').then(s => {
    if (!s) return;
    Sound.setEnabled(s.soundEnabled !== 'false');
    Sound.setVolume(parseFloat(s.soundVolume) || 0.8);
  });
}

function toggleJudgeServer() {
  const btn = document.getElementById('judgeServerBtn');
  if (!judgeServerRunning) {
    window.api.send('server:start');
    judgeServerRunning = true;
    btn.textContent = 'Stop Judge Server';
    btn.classList.add('btn-danger'); btn.classList.remove('btn-ghost');
  } else {
    window.api.send('server:stop');
    judgeServerRunning = false;
    btn.textContent = 'Start Judge Server';
    btn.classList.remove('btn-danger'); btn.classList.add('btn-ghost');
  }
}

// ── Setup ────────────────────────────────────────────────────────────────────
function addCompetitor() {
  const name = sanitize(Utils.getVal('newName'));
  const club = sanitize(Utils.getVal('newClub'));
  if (!name) { Toast.error('Missing', 'Enter competitor name'); return; }
  t.competitors.push({ id:uid(), name, club, totalScore:0, eliminated:false, rounds:{} });
  Utils.setVal('newName',''); Utils.setVal('newClub','');
  renderSetupList();
}

function renderSetupList() {
  const list = document.getElementById('competitorList');
  Utils.setText('compCount', t.competitors.length);
  list.innerHTML = '';
  t.competitors.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'competitor-row';

    const num = document.createElement('span'); num.className = 'comp-num'; num.textContent = i+1;
    const info = document.createElement('div'); info.className = 'comp-info';
    const name = document.createElement('div'); name.className = 'comp-name'; name.textContent = c.name;
    const club = document.createElement('div'); club.className = 'comp-club'; club.textContent = c.club;
    info.appendChild(name); info.appendChild(club);

    const del = document.createElement('button');
    del.className = 'btn btn-danger btn-sm';
    del.textContent = '✕';
    del.addEventListener('click', () => { t.competitors = t.competitors.filter(x => x.id !== c.id); renderSetupList(); });

    row.appendChild(num); row.appendChild(info); row.appendChild(del);
    list.appendChild(row);
  });
}

function startTournament() {
  if (t.competitors.length < 4) { Toast.error('Not Enough', 'Need at least 4 competitors'); return; }
  t.name     = sanitize(Utils.getVal('tournamentName')) || 'Kata Tournament';
  t.category = sanitize(Utils.getVal('category'));
  t.judges   = parseInt(Utils.getVal('judgeCount')) || 5;
  t.currentRound = 1;

  document.getElementById('setupSection').style.display      = 'none';
  document.getElementById('tournamentSection').style.display = 'block';

  Utils.setText('tournamentTitle', t.name);
  window.api.send('display:open');
  window.api.send('match:start', { discipline:'kata-allin', tournament:t });
  window.api.send('server:start');
  judgeServerRunning = true;
  const btn = document.getElementById('judgeServerBtn');
  if (btn) { btn.textContent = 'Stop Judge Server'; btn.classList.add('btn-danger'); btn.classList.remove('btn-ghost'); }

  renderRound();
  Sound.matchStart();
  Toast.success('Tournament Started', `${t.competitors.length} competitors — ${t.judges} judges`);
}

// ── Round ────────────────────────────────────────────────────────────────────
function renderRound() {
  const active = t.competitors.filter(c => !c.eliminated);
  Utils.setText('roundInfo', `Round ${t.currentRound} — ${active.length} competitors`);
  Utils.setText('bracketTitle', `Round ${t.currentRound} — ${active.length} Competitors`);
  renderBracket(active);
  renderLeaderboard();
}

function renderBracket(competitors) {
  const grid = document.getElementById('bracketGrid');
  grid.innerHTML = '';
  competitors.forEach(c => {
    const card = document.createElement('div');
    const isActive = t.currentPerformer?.id === c.id;
    const scored = t.judgeScores[c.id] ? Object.keys(t.judgeScores[c.id]).length : 0;
    const done = scored >= t.judges;
    card.className = `bracket-card ${isActive ? 'active' : done ? 'done' : ''}`;
    card.addEventListener('click', () => selectPerformer(c.id));

    const rank = document.createElement('div'); rank.className = 'bc-rank'; rank.textContent = done ? '✓' : '—';
    const name = document.createElement('div'); name.className = 'bc-name'; name.textContent = c.name;
    const club = document.createElement('div'); club.className = 'bc-club'; club.textContent = c.club;
    const score = document.createElement('div'); score.className = 'bc-score'; score.textContent = c.totalScore.toFixed(2);
    const status = document.createElement('div'); status.className = 'bc-status';
    status.textContent = isActive ? '⚡ Performing' : done ? `${scored}/${t.judges} scored` : `${scored}/${t.judges}`;

    card.appendChild(rank); card.appendChild(name); card.appendChild(club);
    card.appendChild(score); card.appendChild(status);
    grid.appendChild(card);
  });
}

function renderLeaderboard() {
  const lb = document.getElementById('leaderboard');
  lb.innerHTML = '';
  const sorted = [...t.competitors].filter(c => !c.eliminated).sort((a,b) => b.totalScore - a.totalScore);
  const rankClasses = ['gold','silver','bronze'];
  sorted.forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'leaderboard-row';
    const rank = document.createElement('div'); rank.className = `lb-rank ${rankClasses[i] || ''}`;
    rank.textContent = i+1;
    const info = document.createElement('div'); info.className = 'lb-info';
    const name = document.createElement('div'); name.className = 'lb-name'; name.textContent = c.name;
    const club = document.createElement('div'); club.className = 'lb-club'; club.textContent = c.club;
    info.appendChild(name); info.appendChild(club);
    const score = document.createElement('div'); score.className = 'lb-score'; score.textContent = c.totalScore.toFixed(2);
    row.appendChild(rank); row.appendChild(info); row.appendChild(score);
    lb.appendChild(row);
  });
}

// ── Performer ────────────────────────────────────────────────────────────────
function selectPerformer(id) {
  t.currentPerformer = t.competitors.find(c => c.id === id) || null;
  if (!t.currentPerformer) return;
  Utils.hide('noPerformerMsg');
  Utils.show('performerInfo');
  Utils.setText('performerName', t.currentPerformer.name);
  Utils.setText('performerClub', t.currentPerformer.club);
  renderPerformerChips();
  renderBracket(t.competitors.filter(c => !c.eliminated));
}

function renderPerformerChips() {
  const wrap = document.getElementById('performerJudgeChips');
  if (!wrap || !t.currentPerformer) return;
  wrap.innerHTML = '';
  const scores = t.judgeScores[t.currentPerformer.id] || {};
  for (let i = 1; i <= t.judges; i++) {
    const chip = document.createElement('span');
    chip.className = `judge-chip ${scores[i] ? 'scored' : ''}`;
    chip.id = `pchip-${i}`;
    chip.textContent = scores[i] ? `J${i}: ${scores[i].total.toFixed(1)}` : `J${i}`;
    wrap.appendChild(chip);
  }
}

function startPerformance() {
  if (!t.currentPerformer) { Toast.error('Error', 'Select a performer first'); return; }
  if (!t.judgeScores[t.currentPerformer.id]) t.judgeScores[t.currentPerformer.id] = {};
  window.api.send('kata:performance-start', { performer:t.currentPerformer, tournament:t, discipline:'kata-allin' });
  window.api.send('match:update', { discipline:'kata-allin', tournament:t });
  Sound.gong();
  Toast.info('Performance', `${t.currentPerformer.name} is performing`);
}

function endPerformance() {
  if (!t.currentPerformer) return;
  const scored = Object.keys(t.judgeScores[t.currentPerformer.id] || {}).length;
  if (scored < t.judges) { Toast.warning('Waiting', `${t.judges - scored} judge score(s) pending`); return; }
  calcScore(t.currentPerformer.id);
  renderBracket(t.competitors.filter(c => !c.eliminated));
  renderLeaderboard();
  window.api.send('match:update', { discipline:'kata-allin', tournament:t });
  Sound.submit();
  Toast.success('Scored', `${t.currentPerformer.name}: ${t.currentPerformer.totalScore.toFixed(2)}`);
}

function calcScore(id) {
  const scores = Object.values(t.judgeScores[id] || {});
  if (!scores.length) return;
  let tech = scores.map(s => s.technical).sort((a,b) => a-b);
  let ath  = scores.map(s => s.athletic).sort((a,b) => a-b);
  if (scores.length >= 5) { tech = tech.slice(1,-1); ath = ath.slice(1,-1); }
  if (!tech.length) return;
  const avgT = tech.reduce((a,b) => a+b,0) / tech.length;
  const avgA = ath.reduce((a,b) => a+b,0) / ath.length;
  const comp = t.competitors.find(c => c.id === id);
  if (comp) comp.totalScore = avgT + avgA;
}

// ── Round finish ─────────────────────────────────────────────────────────────
function finishRound() {
  const active = t.competitors.filter(c => !c.eliminated).sort((a,b) => b.totalScore - a.totalScore);
  let keep;
  if (t.currentRound === 1)      keep = Math.min(8, active.length);
  else if (active.length > 4)    keep = 4;
  else if (active.length > 2)    keep = 2;
  else { endTournament(); return; }

  for (let i = keep; i < active.length; i++) active[i].eliminated = true;
  Sound.point();
  Toast.success(`Round ${t.currentRound} Done`, `Top ${keep} advance to Round ${t.currentRound + 1}`);
  t.currentRound++;
  t.currentPerformer = null;
  Utils.hide('performerInfo');
  Utils.show('noPerformerMsg');
  renderRound();
  window.api.send('match:update', { discipline:'kata-allin', tournament:t });
}

function endTournament() {
  const winner = t.competitors.filter(c => !c.eliminated).sort((a,b) => b.totalScore - a.totalScore)[0];
  if (!winner) { Toast.info('Tournament', 'No winner determined'); return; }
  Sound.winner();
  Toast.success('🏆 Tournament Winner', `${winner.name} — ${winner.totalScore.toFixed(2)}`);
  window.api.send('match:end', { winner, winnerName:winner.name, winnerClub:winner.club, method:'Kata Tournament', discipline:'kata-allin', tournament:t });
  t.done = true;
}

function showResults() {
  const sorted = [...t.competitors].sort((a,b) => b.totalScore - a.totalScore);
  const lines = sorted.map((c,i) => `${i+1}. ${c.name} — ${c.totalScore.toFixed(2)}${c.eliminated?' (elim)':''}`).join('\n');
  Toast.info('Leaderboard', lines, 8000);
}

function resetTournament() {
  Object.assign(t, { name:'', category:'', judges:5, competitors:[], currentRound:1, currentPerformer:null, judgeScores:{}, done:false });
  document.getElementById('tournamentSection').style.display = 'none';
  document.getElementById('setupSection').style.display      = 'block';
  renderSetupList();
}

// ── Judge scores ─────────────────────────────────────────────────────────────
window.api.on('judge:score', (data) => {
  const { judgeNumber, technical, athletic, total } = data;
  const id = t.currentPerformer?.id;
  if (!id) return;
  if (!t.judgeScores[id]) t.judgeScores[id] = {};
  t.judgeScores[id][judgeNumber] = { technical, athletic, total };
  renderPerformerChips();
  renderBracket(t.competitors.filter(c => !c.eliminated));
  window.api.send('match:update', { discipline:'kata-allin', tournament:t });
  Sound.score();
  Toast.info(`Judge ${judgeNumber}`, `Score: ${total.toFixed(1)}`);
});

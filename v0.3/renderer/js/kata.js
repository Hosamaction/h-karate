const match = {
  red:  { name:'', club:'', kata:'', technical:0, athletic:0, total:0 },
  blue: { name:'', club:'', kata:'', technical:0, athletic:0, total:0 },
  judges: 3, category:'', round:'',
  currentPerformer: null,
  judgeScores: { red:{}, blue:{} }
};

let judgeServerRunning = false;

function sanitize(v) { return typeof v==='string' ? v.replace(/<[^>]*>/g,'').trim().slice(0,200) : ''; }
function go(p) { window.location.href = p; }
function openDisplay() { window.api.send('display:open'); }

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
    btn.classList.add('btn-danger');
    btn.classList.remove('btn-ghost');
  } else {
    window.api.send('server:stop');
    judgeServerRunning = false;
    btn.textContent = 'Start Judge Server';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-ghost');
  }
}

function startMatch() {
  const rn = sanitize(Utils.getVal('redName'));
  const bn = sanitize(Utils.getVal('blueName'));
  if (!rn || !bn) { Toast.error('Missing Info', 'Enter both competitor names'); return; }

  match.red  = { name:rn, club:sanitize(Utils.getVal('redClub'))||'Unknown', kata:sanitize(Utils.getVal('redKata')), technical:0, athletic:0, total:0 };
  match.blue = { name:bn, club:sanitize(Utils.getVal('blueClub'))||'Unknown', kata:sanitize(Utils.getVal('blueKata')), technical:0, athletic:0, total:0 };
  match.category = sanitize(Utils.getVal('category'));
  match.round    = Utils.getVal('round');
  match.judges   = parseInt(Utils.getVal('judgeCount')) || 3;
  match.judgeScores = { red:{}, blue:{} };

  document.getElementById('setupSection').style.display   = 'none';
  document.getElementById('scoringSection').style.display = 'block';

  Utils.setText('redDisplayName',  match.red.name);
  Utils.setText('redDisplayClub',  match.red.club);
  Utils.setText('redDisplayKata',  match.red.kata || '—');
  Utils.setText('blueDisplayName', match.blue.name);
  Utils.setText('blueDisplayClub', match.blue.club);
  Utils.setText('blueDisplayKata', match.blue.kata || '—');
  Utils.setText('matchInfoLine',   `${match.category} — ${match.round} — ${match.judges} Judges`);

  renderJudgeGrids();
  window.api.send('display:open');
  window.api.send('match:start', { ...match, discipline:'kata' });
  window.api.send('server:start');
  judgeServerRunning = true;
  const btn = document.getElementById('judgeServerBtn');
  if (btn) { btn.textContent = 'Stop Judge Server'; btn.classList.add('btn-danger'); btn.classList.remove('btn-ghost'); }
  Sound.matchStart();
  Toast.success('Match Started', `${rn} vs ${bn}`);
}

function renderJudgeGrids() {
  ['red','blue'].forEach(corner => {
    const grid = document.getElementById(`${corner}JudgeGrid`);
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= match.judges; i++) {
      const s = match.judgeScores[corner][i];
      const chip = document.createElement('div');
      chip.className = `judge-chip ${s ? 'scored' : 'waiting'}`;
      chip.id = `judge-chip-${corner}-${i}`;
      const num = document.createElement('span');
      num.className = 'jnum';
      num.textContent = `J${i}`;
      const score = document.createElement('span');
      score.className = 'jscore';
      score.textContent = s ? s.total.toFixed(1) : '—';
      chip.appendChild(num);
      chip.appendChild(score);
      grid.appendChild(chip);
    }
  });
}

function updateJudgeChip(corner, judgeNum) {
  const chip = document.getElementById(`judge-chip-${corner}-${judgeNum}`);
  if (!chip) return;
  const s = match.judgeScores[corner][judgeNum];
  chip.className = `judge-chip ${s ? 'scored' : 'waiting'}`;
  chip.querySelector('.jscore').textContent = s ? s.total.toFixed(1) : '—';
}

function startPerformance() {
  const performer = Utils.getVal('currentPerformer') || 'red';
  match.currentPerformer = performer;
  Utils.show(`${performer}PerformingBadge`);
  const opp = performer === 'red' ? 'blue' : 'red';
  Utils.hide(`${opp}PerformingBadge`);
  window.api.send('kata:performance-start', { performer, match, discipline:'kata' });
  Sound.gong();
  Toast.info('Performance', `${match[performer].name} is performing`);
}

function endPerformance() {
  if (!match.currentPerformer) { Toast.error('Error', 'No active performer'); return; }
  const p = match.currentPerformer;
  const scored = Object.keys(match.judgeScores[p]).length;
  if (scored < match.judges) {
    Toast.warning('Waiting', `${match.judges - scored} judge score(s) still pending`);
    return;
  }
  calcAverage(p);
  updateScoreDisplay();
  updateDetailedTable();
  Utils.hide(`${p}PerformingBadge`);
  window.api.send('match:update', { ...match, discipline:'kata' });
  Toast.success('Performance Done', `${match[p].name}: ${match[p].total.toFixed(2)}`);
  Sound.submit();
}

function calcAverage(performer) {
  const scores = Object.values(match.judgeScores[performer]);
  if (!scores.length) return;
  let tech = scores.map(s => s.technical).sort((a,b) => a-b);
  let ath  = scores.map(s => s.athletic).sort((a,b) => a-b);
  if (scores.length >= 5) { tech = tech.slice(1,-1); ath = ath.slice(1,-1); }
  if (!tech.length) return;
  match[performer].technical = tech.reduce((a,b) => a+b, 0) / tech.length;
  match[performer].athletic  = ath.reduce((a,b) => a+b, 0) / ath.length;
  match[performer].total     = match[performer].technical + match[performer].athletic;
}

function updateScoreDisplay() {
  ['red','blue'].forEach(c => {
    Utils.setText(`${c}FinalScore`, match[c].total.toFixed(2));
    Utils.setText(`${c}Technical`,  match[c].technical.toFixed(2));
    Utils.setText(`${c}Athletic`,   match[c].athletic.toFixed(2));
    Utils.popScore(`${c}FinalScore`);
  });
}

function updateDetailedTable() {
  const tbody = document.getElementById('detailedScoresTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const fmt = v => typeof v === 'number' ? v.toFixed(1) : '—';
  for (let i = 1; i <= match.judges; i++) {
    const r = match.judgeScores.red[i];
    const b = match.judgeScores.blue[i];
    const row = tbody.insertRow();
    [i, fmt(r?.technical), fmt(r?.athletic), fmt(r?.total),
        fmt(b?.technical), fmt(b?.athletic), fmt(b?.total)].forEach(v => {
      row.insertCell().textContent = v;
    });
  }
}

function calculateResults() {
  ['red','blue'].forEach(p => { if (Object.keys(match.judgeScores[p]).length) calcAverage(p); });
  updateScoreDisplay();
  updateDetailedTable();
  const r = match.red.total, b = match.blue.total;
  const winner = r > b ? 'red' : b > r ? 'blue' : null;
  if (winner) {
    Toast.success('Results', `Winner: ${match[winner].name} (${match[winner].total.toFixed(2)} vs ${match[winner === 'red' ? 'blue' : 'red'].total.toFixed(2)})`);
  } else {
    Toast.info('Results', `Draw — Red: ${r.toFixed(2)} | Blue: ${b.toFixed(2)}`);
  }
  window.api.send('match:update', { ...match, discipline:'kata' });
}

function endMatch() {
  calculateResults();
  const r = match.red.total, b = match.blue.total;
  const winner = r > b ? 'red' : b > r ? 'blue' : null;
  window.api.send('match:end', {
    winner,
    winnerName: winner ? match[winner].name : null,
    winnerClub: winner ? match[winner].club : null,
    method: 'Kata Scoring',
    match,
    discipline: 'kata'
  });
}

function resetMatch() {
  match.red  = { name:'', club:'', kata:'', technical:0, athletic:0, total:0 };
  match.blue = { name:'', club:'', kata:'', technical:0, athletic:0, total:0 };
  match.judgeScores = { red:{}, blue:{} };
  match.currentPerformer = null;
  document.getElementById('scoringSection').style.display = 'none';
  document.getElementById('setupSection').style.display   = 'block';
  ['redName','redClub','redKata','blueName','blueClub','blueKata','category'].forEach(id => Utils.setVal(id,''));
}

// Receive judge scores from web judges or local judge panel
  window.api.on('judge:score', (data) => {
  const { judgeNumber, performer, technical, athletic, total } = data;
  const p = performer || match.currentPerformer;
  if (!p || !match.judgeScores[p]) return;
  match.judgeScores[p][judgeNumber] = { technical, athletic, total };
  updateJudgeChip(p, judgeNumber);
  updateDetailedTable();
  window.api.send('match:update', { ...match, discipline:'kata' });
  Sound.score();
  Toast.info(`Judge ${judgeNumber}`, `Score: ${total.toFixed(1)} for ${p}`);
});

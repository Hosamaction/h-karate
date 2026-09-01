const WINNER_DURATION = 12000;
let currentDiscipline = null;
let judgeScores = { red:{}, blue:{} };

function safe(v) { return String(v ?? '').replace(/<[^>]*>/g,'').trim(); }

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = safe(String(v));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// Clock
setInterval(() => {
  const now = new Date();
  setText('dispClock', now.toLocaleTimeString('en-GB'));
}, 1000);

// ── Match Started ─────────────────────────────────────────────────────────────
window.api.on('match:started', (data) => {
  try {
    currentDiscipline = data.discipline;
    judgeScores = { red:{}, blue:{} };

    setText('dispCategory', data.category || 'H Karate');
    setText('dispRound',    data.round    || '');

    if (data.discipline === 'kumite') {
      setText('kRedName',  (data.red?.name  || '').toUpperCase());
      setText('kRedClub',  (data.red?.club  || '').toUpperCase());
      setText('kBlueName', (data.blue?.name || '').toUpperCase());
      setText('kBlueClub', (data.blue?.club || '').toUpperCase());
      setText('kRedScore',  0); setText('kBlueScore', 0);
      setText('kStatus', 'READY');
      showScreen('kumiteScreen');
    } else if (data.discipline === 'kata') {
      setText('kaRedName',  (data.red?.name  || '').toUpperCase());
      setText('kaRedClub',  (data.red?.club  || '').toUpperCase());
      setText('kaRedKata',  data.red?.kata   || '');
      setText('kaBlueeName',(data.blue?.name || '').toUpperCase());
      setText('kaBlueeClub',(data.blue?.club || '').toUpperCase());
      setText('kaBlueeKata', data.blue?.kata || '');
      showScreen('kataScreen');
    } else if (data.discipline === 'kata-allin') {
      setText('dispCategory', data.tournament?.name || 'Kata Tournament');
      setText('dispRound',    `Round ${data.tournament?.currentRound || 1}`);
      showScreen('allInScreen');
    }
  } catch(e) { console.error('match:started', e); }
});

// ── Match Updated ─────────────────────────────────────────────────────────────
window.api.on('match:updated', (data) => {
  try {
    if (data.discipline === 'kumite') updateKumite(data);
    else if (data.discipline === 'kata') updateKata(data);
    else if (data.discipline === 'kata-allin') updateAllIn(data);
  } catch(e) { console.error('match:updated', e); }
});

function updateKumite(data) {
  setText('kRedScore',      data.red?.score      ?? 0);
  setText('kBlueScore',     data.blue?.score     ?? 0);
  setText('kRedYuko',       data.red?.yuko       ?? 0);
  setText('kRedWazaari',    data.red?.wazaari    ?? 0);
  setText('kRedIppon',      data.red?.ippon      ?? 0);
  setText('kRedPenalties',  data.red?.penalties  ?? 0);
  setText('kBlueYuko',      data.blue?.yuko      ?? 0);
  setText('kBlueWazaari',   data.blue?.wazaari   ?? 0);
  setText('kBlueIppon',     data.blue?.ippon     ?? 0);
  setText('kBluePenalties', data.blue?.penalties ?? 0);
  popEl('kRedScore'); popEl('kBlueScore');
}

function updateKata(data) {
  const fmt = v => (typeof v === 'number' ? v : 0).toFixed(2);
  setText('kaRedScore',  fmt(data.red?.total));
  setText('kaRedTech',   fmt(data.red?.technical));
  setText('kaRedAth',    fmt(data.red?.athletic));
  setText('kaBlueeScore',fmt(data.blue?.total));
  setText('kaBlueeTech', fmt(data.blue?.technical));
  setText('kaBlueeAth',  fmt(data.blue?.athletic));
  renderKataJudges(data.judgeScores);
}

function renderKataJudges(scores) {
  if (!scores) return;
  ['red','blue'].forEach(corner => {
    const wrap = document.getElementById(`ka${corner === 'red' ? 'Red' : 'Bluee'}Judges`);
    if (!wrap) return;
    wrap.innerHTML = '';
    const s = scores[corner] || {};
    Object.keys(s).forEach(j => {
      const chip = document.createElement('div');
      chip.className = 'jsc';
      const jn = document.createElement('div'); jn.className = 'jn'; jn.textContent = `J${j}`;
      const jv = document.createElement('div'); jv.className = 'jv'; jv.textContent = s[j].total.toFixed(1);
      chip.appendChild(jn); chip.appendChild(jv);
      wrap.appendChild(chip);
    });
  });
}

function updateAllIn(data) {
  const t = data.tournament;
  if (!t) return;
  setText('dispCategory', t.name || 'Kata Tournament');
  setText('dispRound',    `Round ${t.currentRound || 1}`);
  if (t.currentPerformer) {
    setText('aiPerfName',  (t.currentPerformer.name || '').toUpperCase());
    setText('aiPerfClub',  (t.currentPerformer.club || '').toUpperCase());
    setText('aiPerfScore', (t.currentPerformer.totalScore || 0).toFixed(2));
  }
  renderAllInLeaderboard(t.competitors);
}

function renderAllInLeaderboard(competitors) {
  const lb = document.getElementById('aiLeaderboard');
  if (!lb || !competitors) return;
  lb.innerHTML = '';
  const sorted = [...competitors].filter(c => !c.eliminated).sort((a,b) => b.totalScore - a.totalScore);
  const rankColors = ['var(--gold)','#94a3b8','#b45309'];
  sorted.slice(0, 8).forEach((c, i) => {
    const row = document.createElement('div'); row.className = 'allin-lb-row';
    const rank = document.createElement('div'); rank.className = 'allin-lb-rank';
    rank.style.color = rankColors[i] || 'var(--text-muted)';
    rank.textContent = i + 1;
    const info = document.createElement('div'); info.className = 'allin-lb-info';
    const name = document.createElement('div'); name.className = 'allin-lb-name'; name.textContent = c.name;
    const club = document.createElement('div'); club.className = 'allin-lb-club'; club.textContent = c.club;
    info.appendChild(name); info.appendChild(club);
    const score = document.createElement('div'); score.className = 'allin-lb-score'; score.textContent = c.totalScore.toFixed(2);
    row.appendChild(rank); row.appendChild(info); row.appendChild(score);
    lb.appendChild(row);
  });
}

// ── Timer ─────────────────────────────────────────────────────────────────────
window.api.on('timer:updated', (timer) => {
  try {
    const m = Math.floor(timer.time / 60);
    const s = timer.time % 60;
    const display = `${m}:${String(s).padStart(2,'0')}`;
    const el = document.getElementById('kTimer');
    if (el) {
      el.textContent = display;
      el.className = 'k-timer ' + (timer.time <= 30 ? 'timer-red' : timer.time <= 60 ? 'timer-orange' : 'timer-green');
    }
    setText('kTimerStatus', timer.running ? 'RUNNING' : timer.time === 0 ? 'TIME UP' : 'PAUSED');
  } catch(e) {}
});

// ── Judge Score ───────────────────────────────────────────────────────────────
window.api.on('judge:score', (data) => {
  try {
    const { judgeNumber, performer, technical, athletic, total } = data;
    if (!performer) return;
    if (!judgeScores[performer]) judgeScores[performer] = {};
    judgeScores[performer][judgeNumber] = { technical, athletic, total };
    renderKataJudges(judgeScores);
  } catch(e) {}
});

// ── Kata Performance ──────────────────────────────────────────────────────────
window.api.on('kata:performance-started', (data) => {
  try {
    const name = data.performer?.name || data.performer || '';
    setText('kataPerforming', `⚡ ${String(name).toUpperCase()} PERFORMING`);
    if (data.performer) {
      setText('aiPerfName', (data.performer.name || '').toUpperCase());
      setText('aiPerfClub', (data.performer.club || '').toUpperCase());
    }
  } catch(e) {}
});

// ── Match Ended ───────────────────────────────────────────────────────────────
window.api.on('match:ended', (data) => {
  try {
    if (!data.winner) return;
    setText('winnerName',   (data.winnerName || '').toUpperCase());
    setText('winnerClub',   (data.winnerClub || '').toUpperCase());
    setText('winnerMethod', data.method || '');

    const cornerEl = document.getElementById('winnerCorner');
    if (cornerEl) {
      if (data.winner === 'red')  { cornerEl.textContent = '🔴 Red Corner';  cornerEl.className = 'winner-corner red'; }
      else if (data.winner === 'blue') { cornerEl.textContent = '🔵 Blue Corner'; cornerEl.className = 'winner-corner blue'; }
      else { cornerEl.textContent = '🏆 Tournament Winner'; cornerEl.className = 'winner-corner gold'; }
    }

    showScreen('winnerScreen');
    setTimeout(() => {
      if (currentDiscipline === 'kumite') showScreen('kumiteScreen');
      else if (currentDiscipline === 'kata') showScreen('kataScreen');
      else if (currentDiscipline === 'kata-allin') showScreen('allInScreen');
      else showScreen('readyScreen');
    }, WINNER_DURATION);
  } catch(e) { console.error('match:ended', e); }
});

// ── State Sync ────────────────────────────────────────────────────────────────
window.api.on('state:sync', (state) => {
  try {
    if (state.match) {
      currentDiscipline = state.discipline;
      if (state.discipline === 'kumite') { updateKumite(state.match); showScreen('kumiteScreen'); }
      else if (state.discipline === 'kata') { updateKata(state.match); showScreen('kataScreen'); }
      else if (state.discipline === 'kata-allin') { updateAllIn(state.match); showScreen('allInScreen'); }
    }
  } catch(e) {}
});

function popEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('score-pop');
  void el.offsetWidth;
  el.classList.add('score-pop');
}

const match = {
  red:  { name:'', club:'', country:'', yuko:0, wazaari:0, ippon:0, penalties:0, score:0 },
  blue: { name:'', club:'', country:'', yuko:0, wazaari:0, ippon:0, penalties:0, score:0 },
  timer: { time:180, running:false },
  category:'', round:'', duration:180
};

let timerInterval = null;

function sanitize(v) { return typeof v==='string' ? v.replace(/<[^>]*>/g,'').trim().slice(0,200) : ''; }
function go(p) { window.location.href = p; }
function openDisplay() { window.api.send('display:open'); }

async function loadSoundSettings() {
  const s = await window.api.invoke('settings:get-all');
  if (!s) return;
  Sound.setEnabled(s.soundEnabled !== 'false');
  Sound.setVolume(s.soundVolume || 0.8);
  await ScoringRules.load();
}

function startMatch() {
  const rn = sanitize(Utils.getVal('redName'));
  const bn = sanitize(Utils.getVal('blueName'));
  if (!rn || !bn) { Toast.error('Missing Info', 'Enter both fighter names'); return; }

  match.red.name    = rn;
  match.red.club    = sanitize(Utils.getVal('redClub')) || 'Unknown';
  match.red.country = sanitize(Utils.getVal('redCountry'));
  match.blue.name   = bn;
  match.blue.club   = sanitize(Utils.getVal('blueClub')) || 'Unknown';
  match.blue.country= sanitize(Utils.getVal('blueCountry'));
  match.category    = sanitize(Utils.getVal('category'));
  match.round       = Utils.getVal('round');
  match.duration    = parseInt(Utils.getVal('matchDuration')) || 180;
  match.timer.time  = match.duration;

  showScoring();
  window.api.send('display:open');
  window.api.send('match:start', { ...match, discipline:'kumite' });
  Sound.matchStart();
  Toast.success('Match Started', `${rn} vs ${bn}`);
  saveState();
}

function showScoring() {
  document.getElementById('setupSection').style.display  = 'none';
  document.getElementById('scoringSection').style.display = 'block';
  Utils.setText('redDisplayName',  match.red.name);
  Utils.setText('redDisplayClub',  match.red.club);
  Utils.setText('blueDisplayName', match.blue.name);
  Utils.setText('blueDisplayClub', match.blue.club);
  Utils.setText('matchInfoLine',   `${match.category} — ${match.round}`);
  Utils.setText('infoCategory',    match.category || '—');
  Utils.setText('infoRound',       match.round || '—');
  updateTimerDisplay();
  updateDisplay();
}

function saveState() {
  try { sessionStorage.setItem('kumite_state', JSON.stringify(match)); } catch(_) {}
}

function restoreState() {
  try {
    const raw = sessionStorage.getItem('kumite_state');
    if (!raw) return false;
    const saved = JSON.parse(raw);
    Object.assign(match, saved);
    match.timer.running = false;
    showScoring();
    return true;
  } catch(_) { return false; }
}

function calcScore(corner) {
  const c = match[corner];
  const rules = ScoringRules.get();
  c.score = (c.yuko * rules.yuko) + (c.wazaari * rules.wazaari) + (c.ippon * rules.ippon);
}

function addScore(corner, type) {
  if (!['red','blue'].includes(corner)) return;
  if (!['yuko','wazaari','ippon'].includes(type)) return;
  match[corner][type]++;
  calcScore(corner);
  updateDisplay();
  broadcast();
  Sound.score();
  Utils.popScore(corner === 'red' ? 'redScore' : 'blueScore');
  saveState();
  const gap = ScoringRules.get().pointGap;
  if (match[corner].score >= gap) endMatch(corner, `${gap}-Point Rule`);
}

function undoScore(corner) {
  const c = match[corner];
  if (c.ippon > 0) c.ippon--;
  else if (c.wazaari > 0) c.wazaari--;
  else if (c.yuko > 0) c.yuko--;
  calcScore(corner);
  updateDisplay();
  broadcast();
  saveState();
}

function addPenalty(corner, type) {
  if (!['red','blue'].includes(corner)) return;
  match[corner].penalties++;
  if (type === 'keikoku') {
    const opp = corner === 'red' ? 'blue' : 'red';
    match[opp].score++;
    Utils.popScore(opp === 'red' ? 'redScore' : 'blueScore');
  }
  if (type === 'hansoku') {
    const winner = corner === 'red' ? 'blue' : 'red';
    endMatch(winner, 'Hansoku — Disqualification');
    return;
  }
  Sound.penalty();
  const maxP = ScoringRules.get().maxPenalties;
  if (match[corner].penalties >= maxP) {
    const winner = corner === 'red' ? 'blue' : 'red';
    endMatch(winner, `${maxP} Penalties`);
    return;
  }
  updateDisplay();
  broadcast();
  saveState();
  if (type !== 'hansoku') Toast.warning('Penalty', `${corner.toUpperCase()} — ${type}`);
}

function undoPenalty(corner) {
  if (match[corner].penalties > 0) { match[corner].penalties--; updateDisplay(); broadcast(); }
}

function startTimer() {
  if (timerInterval) return;
  match.timer.running = true;
  Utils.setText('timerStatus', 'RUNNING');
  Utils.setText('infoStatus', 'In Progress');
  timerInterval = setInterval(() => {
    if (match.timer.time > 0) {
      match.timer.time--;
      updateTimerDisplay();
      window.api.send('timer:update', match.timer);
      if (match.timer.time === 30 || match.timer.time === 10) Sound.timerLow();
      if (match.timer.time === 0) { timeUp(); }
    }
  }, 1000);
}

function pauseTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  match.timer.running = false;
  Utils.setText('timerStatus', 'PAUSED');
  window.api.send('timer:update', match.timer);
}

function resetTimer() {
  pauseTimer();
  match.timer.time = match.duration;
  updateTimerDisplay();
  Utils.setText('timerStatus', 'READY');
  window.api.send('timer:update', match.timer);
}

function timeUp() {
  pauseTimer();
  Utils.setText('timerStatus', 'TIME UP');
  Sound.matchEnd();
  const r = match.red.score, b = match.blue.score;
  if (r > b) endMatch('red', 'Time Up — Points');
  else if (b > r) endMatch('blue', 'Time Up — Points');
  else {
    Toast.info('Time Up', 'Draw — Encho-sen required');
    window.api.send('match:end', { winner: null, method: 'Draw — Encho-sen', match, discipline: 'kumite' });
    sessionStorage.removeItem('kumite_state');
  }
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (!el) return;
  el.textContent = Utils.formatTime(match.timer.time);
  el.className = 'timer-val ' + (match.timer.time <= 30 ? 'timer-red' : match.timer.time <= 60 ? 'timer-orange' : 'timer-green');
}

function updateDisplay() {
  Utils.setText('redScore',     match.red.score);
  Utils.setText('blueScore',    match.blue.score);
  Utils.setText('redYuko',      match.red.yuko);
  Utils.setText('redWazaari',   match.red.wazaari);
  Utils.setText('redIppon',     match.red.ippon);
  Utils.setText('redPenalties', match.red.penalties);
  Utils.setText('blueYuko',     match.blue.yuko);
  Utils.setText('blueWazaari',  match.blue.wazaari);
  Utils.setText('blueIppon',    match.blue.ippon);
  Utils.setText('bluePenalties',match.blue.penalties);
}

function broadcast() {
  window.api.send('match:update', { ...match, discipline:'kumite' });
}

function endMatch(winner = null, method = 'Manual') {
  pauseTimer();
  sessionStorage.removeItem('kumite_state');
  if (winner) {
    const name = match[winner].name;
    Sound.winner();
    Toast.success('Match Over', `Winner: ${name} (${winner.toUpperCase()}) — ${method}`);
    window.api.send('match:end', { winner, winnerName: name, winnerClub: match[winner].club, method, match, discipline:'kumite' });
    Utils.setText('infoStatus', `Winner: ${name}`);
  } else {
    Sound.matchEnd();
    Toast.info('Match Over', 'Draw');
    window.api.send('match:end', { winner: null, method, match, discipline:'kumite' });
  }
}

function medicalTimeout() {
  pauseTimer();
  Toast.warning('Medical Timeout', 'Match paused for medical attention');
  window.api.send('match:update', { ...match, discipline:'kumite', status:'medical-timeout' });
}

function resetMatch() {
  pauseTimer();
  sessionStorage.removeItem('kumite_state');
  match.red  = { name:'', club:'', country:'', yuko:0, wazaari:0, ippon:0, penalties:0, score:0 };
  match.blue = { name:'', club:'', country:'', yuko:0, wazaari:0, ippon:0, penalties:0, score:0 };
  match.timer = { time:180, running:false };
  document.getElementById('scoringSection').style.display = 'none';
  document.getElementById('setupSection').style.display   = 'block';
  ['redName','redClub','redCountry','blueName','blueClub','blueCountry','category'].forEach(id => Utils.setVal(id,''));
}

// Restore state on page load
if (!restoreState()) {
  // fresh page — nothing to restore
}

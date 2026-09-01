const { notificationSystem } = require('./notifications.js');

class KataScoring {
    constructor() {
        this.match = {
            red: { name: '', club: '', kata: '', technical: 0, athletic: 0, total: 0 },
            blue: { name: '', club: '', kata: '', technical: 0, athletic: 0, total: 0 },
            judges: 3,
            category: '',
            round: '',
            currentPerformer: null,
            judgeScores: {}
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupJudges();
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.replace(/<[^>]*>/g, '').trim().substring(0, 200);
    }

    safeSet(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    setupEventListeners() {
        if (window.electronAPI) {
            window.electronAPI.receive('judge-score', (scoreData) => {
                try {
                    this.receiveJudgeScore(scoreData);
                } catch (error) {
                    console.error('Error processing judge score:', error);
                    notificationSystem.error('Error', 'Failed to process judge score');
                }
            });
        }
    }

    startKataMatch() {
        const redName = this.sanitizeInput(document.getElementById('redName')?.value || '');
        const redClub = this.sanitizeInput(document.getElementById('redClub')?.value || '');
        const redKata = this.sanitizeInput(document.getElementById('redKata')?.value || '');
        const blueName = this.sanitizeInput(document.getElementById('blueName')?.value || '');
        const blueClub = this.sanitizeInput(document.getElementById('blueClub')?.value || '');
        const blueKata = this.sanitizeInput(document.getElementById('blueKata')?.value || '');
        const category = this.sanitizeInput(document.getElementById('category')?.value || '');
        const round = this.sanitizeInput(document.getElementById('round')?.value || '');

        if (!redName || !blueName) {
            notificationSystem.error('Error', 'Please enter both competitor names');
            return;
        }

        this.match.red = { name: redName, club: redClub || 'Unknown', kata: redKata, technical: 0, athletic: 0, total: 0 };
        this.match.blue = { name: blueName, club: blueClub || 'Unknown', kata: blueKata, technical: 0, athletic: 0, total: 0 };
        this.match.category = category;
        this.match.round = round;
        this.match.discipline = 'kata';

        const scoringEl = document.getElementById('kataScoring');
        if (scoringEl) scoringEl.style.display = 'block';
        this.updateDisplay();

        if (window.electronAPI) {
            window.electronAPI.send('open-display-window');
            window.electronAPI.send('match-start', this.match);
        }
    }

    setupJudges() {
        const judgeCountEl = document.getElementById('judgeCount');
        this.match.judges = parseInt(judgeCountEl?.value) || 3;
        if (window.electronAPI) {
            window.electronAPI.send('judge-setup', {
                type: 'kata',
                judges: this.match.judges,
                competitors: { red: this.match.red.name, blue: this.match.blue.name },
                discipline: 'kata'
            });
        }
        this.updateJudgeStatus();
    }

    updateJudgeStatus() {
        const grid = document.getElementById('judgeStatusGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= this.match.judges; i++) {
            const hasScored = this.match.currentPerformer &&
                this.match.judgeScores[this.match.currentPerformer]?.[i];
            const div = document.createElement('div');
            div.className = `judge-status ${hasScored ? 'scored' : 'waiting'}`;
            const h4 = document.createElement('h4');
            h4.textContent = `Judge ${i}`;
            const p = document.createElement('p');
            p.textContent = hasScored ? 'Score Submitted' : 'Waiting...';
            div.appendChild(h4);
            div.appendChild(p);
            fragment.appendChild(div);
        }
        grid.appendChild(fragment);
    }

    setCurrentPerformer() {
        const el = document.getElementById('currentPerformer');
        if (el) this.match.currentPerformer = el.value;
    }

    startPerformance() {
        if (!this.match.currentPerformer) {
            notificationSystem.error('Error', 'Please select current performer');
            return;
        }
        const performer = this.match[this.match.currentPerformer];
        if (!performer) return;
        notificationSystem.info('Performance Started', `Starting: ${performer.name} - ${performer.kata}`);
        if (!this.match.judgeScores[this.match.currentPerformer]) {
            this.match.judgeScores[this.match.currentPerformer] = {};
        }
        if (window.electronAPI) {
            window.electronAPI.send('kata-start', { performer: this.match.currentPerformer, match: this.match });
        }
        this.updateJudgeStatus();
    }

    endPerformance() {
        if (!this.match.currentPerformer) return;
        const scores = this.match.judgeScores[this.match.currentPerformer];
        const judgeCount = Object.keys(scores || {}).length;
        if (judgeCount < this.match.judges) {
            notificationSystem.warning('Waiting', `Waiting for ${this.match.judges - judgeCount} more judge scores`);
            return;
        }
        this.calculateAverageScore(this.match.currentPerformer);
        this.updateDisplay();
        notificationSystem.success('Performance Ended', `Final score: ${this.match[this.match.currentPerformer].total.toFixed(2)}`);
    }

    receiveJudgeScore(scoreData) {
        const { judgeNumber, technical, athletic, total } = scoreData;
        if (!this.match.currentPerformer) return;
        if (!this.match.judgeScores[this.match.currentPerformer]) {
            this.match.judgeScores[this.match.currentPerformer] = {};
        }
        this.match.judgeScores[this.match.currentPerformer][judgeNumber] = { technical, athletic, total };
        this.updateJudgeStatus();
        this.updateDetailedScores();
        if (window.electronAPI) {
            window.electronAPI.send('judge-score', { ...scoreData, discipline: 'kata', match: this.match });
            window.electronAPI.send('score-update', { ...this.match, discipline: 'kata' });
        }
    }

    calculateAverageScore(performer) {
        const scores = this.match.judgeScores[performer];
        if (!scores) return;
        const judgeScores = Object.values(scores);
        if (judgeScores.length === 0) return;

        let technicalScores = judgeScores.map(s => s.technical).sort((a, b) => a - b);
        let athleticScores = judgeScores.map(s => s.athletic).sort((a, b) => a - b);

        if (judgeScores.length >= 5) {
            technicalScores = technicalScores.slice(1, -1);
            athleticScores = athleticScores.slice(1, -1);
        }

        if (technicalScores.length === 0 || athleticScores.length === 0) return;

        const avgTechnical = technicalScores.reduce((a, b) => a + b, 0) / technicalScores.length;
        const avgAthletic = athleticScores.reduce((a, b) => a + b, 0) / athleticScores.length;

        this.match[performer].technical = avgTechnical;
        this.match[performer].athletic = avgAthletic;
        this.match[performer].total = avgTechnical + avgAthletic;
    }

    updateDetailedScores() {
        const table = document.getElementById('detailedScoresTable');
        if (!table) return;
        table.innerHTML = '';
        const t = document.createElement('table');
        t.className = 'scores-table';
        const hrow = t.createTHead().insertRow();
        ['Judge', 'Red Tech', 'Red Ath', 'Red Total', 'Blue Tech', 'Blue Ath', 'Blue Total'].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            hrow.appendChild(th);
        });
        const tbody = t.createTBody();
        const fmt = v => typeof v === 'number' ? v.toFixed(1) : '-';
        for (let i = 1; i <= this.match.judges; i++) {
            const red = this.match.judgeScores.red?.[i];
            const blue = this.match.judgeScores.blue?.[i];
            const row = tbody.insertRow();
            [i, fmt(red?.technical), fmt(red?.athletic), fmt(red?.total),
             fmt(blue?.technical), fmt(blue?.athletic), fmt(blue?.total)].forEach(val => {
                row.insertCell().textContent = val;
            });
        }
        table.appendChild(t);
    }

    determineWinner() {
        if (this.match.red.total > this.match.blue.total) return 'red';
        if (this.match.blue.total > this.match.red.total) return 'blue';
        return null;
    }

    calculateFinalResults() {
        ['red', 'blue'].forEach(p => {
            if (this.match.judgeScores[p]) this.calculateAverageScore(p);
        });
        this.updateDisplay();
        const winner = this.determineWinner();
        const redScore = this.match.red.total.toFixed(2);
        const blueScore = this.match.blue.total.toFixed(2);
        if (winner) {
            notificationSystem.success('Final Results', `Red: ${redScore}\nBlue: ${blueScore}\nWinner: ${this.match[winner].name}`);
        } else {
            notificationSystem.info('Final Results', `Red: ${redScore}\nBlue: ${blueScore}\nResult: Draw`);
        }
    }

    endKataMatch() {
        this.calculateFinalResults();
        const winner = this.determineWinner();
        if (window.electronAPI) {
            window.electronAPI.send('match-end', { winner, method: 'Kata Scoring', match: this.match, discipline: 'kata' });
        }
    }

    resetMatch() {
        this.match = {
            red: { name: '', club: '', kata: '', technical: 0, athletic: 0, total: 0 },
            blue: { name: '', club: '', kata: '', technical: 0, athletic: 0, total: 0 },
            judges: 3, category: '', round: '', currentPerformer: null, judgeScores: {}
        };
        const scoringEl = document.getElementById('kataScoring');
        if (scoringEl) scoringEl.style.display = 'none';
        ['redName', 'redClub', 'redKata', 'blueName', 'blueClub', 'blueKata'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.updateDisplay();
    }

    updateDisplay() {
        this.safeSet('redSummaryName', this.match.red.name || 'Red Corner');
        this.safeSet('blueSummaryName', this.match.blue.name || 'Blue Corner');
        this.safeSet('redKataName', this.match.red.kata || '-');
        this.safeSet('blueKataName', this.match.blue.kata || '-');
        this.safeSet('redFinalScore', this.match.red.total.toFixed(2));
        this.safeSet('blueFinalScore', this.match.blue.total.toFixed(2));
        this.safeSet('redTechnical', this.match.red.technical.toFixed(2));
        this.safeSet('redAthletic', this.match.red.athletic.toFixed(2));
        this.safeSet('blueTechnical', this.match.blue.technical.toFixed(2));
        this.safeSet('blueAthletic', this.match.blue.athletic.toFixed(2));
        this.updateDetailedScores();
    }
}

function openDisplay() {
    if (window.electronAPI) window.electronAPI.send('open-display-window');
}

function openJudgePanel() {
    if (window.electronAPI) window.electronAPI.send('open-judge-window');
}

function goBack() { window.location.href = 'main.html'; }

let kata;
window.addEventListener('DOMContentLoaded', () => {
    kata = new KataScoring();
});

function startKataMatch() { if (kata) kata.startKataMatch(); }
function setupJudges() { if (kata) kata.setupJudges(); }
function setCurrentPerformer() { if (kata) kata.setCurrentPerformer(); }
function startPerformance() { if (kata) kata.startPerformance(); }
function endPerformance() { if (kata) kata.endPerformance(); }
function calculateFinalResults() { if (kata) kata.calculateFinalResults(); }
function endKataMatch() { if (kata) kata.endKataMatch(); }
function resetMatch() { if (kata) kata.resetMatch(); }

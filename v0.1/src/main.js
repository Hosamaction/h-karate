const { notificationSystem } = require('./notifications.js');

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>/g, '').trim().substring(0, 200);
}

class KarateScoring {
    constructor() {
        this.currentMatch = {
            discipline: 'kumite',
            competitors: { red: {}, blue: {} },
            scores: { red: 0, blue: 0 },
            kumite: {
                red: { yuko: 0, wazaari: 0, ippon: 0, penalties: 0 },
                blue: { yuko: 0, wazaari: 0, ippon: 0, penalties: 0 }
            },
            kata: {
                red: { technical: 0, athletic: 0, total: 0 },
                blue: { technical: 0, athletic: 0, total: 0 }
            },
            timer: { time: 180, running: false },
            judges: 3
        };
        this.timerInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        if (window.electronAPI) {
            window.electronAPI.receive('score-updated', () => {
                try { this.updateDisplay(); } catch (e) { console.error('score-updated error:', e); }
            });
        }
    }

    switchDiscipline() {
        const disciplineEl = document.getElementById('discipline');
        if (!disciplineEl) return;
        const discipline = disciplineEl.value;
        this.currentMatch.discipline = discipline;
        const kumitePanel = document.getElementById('kumitePanel');
        const kataPanel = document.getElementById('kataPanel');
        if (kumitePanel) kumitePanel.style.display = discipline === 'kumite' ? 'block' : 'none';
        if (kataPanel) kataPanel.style.display = discipline === 'kata' ? 'block' : 'none';
    }

    startMatch() {
        const comp1Name = sanitizeInput(document.getElementById('comp1Name')?.value || '');
        const comp1Club = sanitizeInput(document.getElementById('comp1Club')?.value || '');
        const comp2Name = sanitizeInput(document.getElementById('comp2Name')?.value || '');
        const comp2Club = sanitizeInput(document.getElementById('comp2Club')?.value || '');

        if (!comp1Name || !comp2Name) {
            notificationSystem.error('Error', 'Please enter competitor names');
            return;
        }

        this.currentMatch.competitors.red = { name: comp1Name, club: comp1Club || 'Unknown' };
        this.currentMatch.competitors.blue = { name: comp2Name, club: comp2Club || 'Unknown' };

        if (window.electronAPI) {
            window.electronAPI.send('match-start', this.currentMatch);
        }
        this.updateDisplay();
        notificationSystem.info('Match Started', 'Match started! Open display and judge windows.');
    }

    resetMatch() {
        this.currentMatch.scores = { red: 0, blue: 0 };
        this.currentMatch.kumite = {
            red: { yuko: 0, wazaari: 0, ippon: 0, penalties: 0 },
            blue: { yuko: 0, wazaari: 0, ippon: 0, penalties: 0 }
        };
        this.currentMatch.kata = {
            red: { technical: 0, athletic: 0, total: 0 },
            blue: { technical: 0, athletic: 0, total: 0 }
        };
        this.currentMatch.timer = { time: 180, running: false };
        this.stopTimer();
        this.updateDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('score-update', this.currentMatch);
        }
    }

    addScore(corner, type) {
        if (!['red', 'blue'].includes(corner)) return;
        if (!['yuko', 'wazaari', 'ippon'].includes(type)) return;
        this.currentMatch.kumite[corner][type]++;
        this.calculateKumiteScore(corner);
        this.updateDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('score-update', this.currentMatch);
        }
        if (type === 'ippon') this.endMatch(corner);
    }

    addPenalty(corner, type) {
        if (!['red', 'blue'].includes(corner)) return;
        this.currentMatch.kumite[corner].penalties++;
        if (type === 'keikoku') {
            const opponent = corner === 'red' ? 'blue' : 'red';
            this.currentMatch.scores[opponent]++;
        }
        if (type === 'hansoku') {
            const winner = corner === 'red' ? 'blue' : 'red';
            this.endMatch(winner);
        }
        this.updateDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('score-update', this.currentMatch);
        }
    }

    calculateKumiteScore(corner) {
        const k = this.currentMatch.kumite[corner];
        this.currentMatch.scores[corner] = k.yuko + (k.wazaari * 2) + (k.ippon * 3);
    }

    startTimer() {
        if (this.timerInterval) return;
        this.currentMatch.timer.running = true;
        this.timerInterval = setInterval(() => {
            if (this.currentMatch.timer.time > 0) {
                this.currentMatch.timer.time--;
                this.updateTimerDisplay();
                if (window.electronAPI) {
                    window.electronAPI.send('timer-update', this.currentMatch.timer);
                }
            } else {
                this.endMatch();
            }
        }, 1000);
    }

    pauseTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.currentMatch.timer.running = false;
            if (window.electronAPI) {
                window.electronAPI.send('timer-update', this.currentMatch.timer);
            }
        }
    }

    resetTimer() {
        this.stopTimer();
        this.currentMatch.timer.time = 180;
        this.updateTimerDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('timer-update', this.currentMatch.timer);
        }
    }

    stopTimer() {
        this.pauseTimer();
    }

    updateTimerDisplay() {
        const el = document.getElementById('timerDisplay');
        if (!el) return;
        const minutes = Math.floor(this.currentMatch.timer.time / 60);
        const seconds = this.currentMatch.timer.time % 60;
        el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    setupJudges() {
        const judgeCountEl = document.getElementById('judgeCount');
        if (judgeCountEl) {
            this.currentMatch.judges = parseInt(judgeCountEl.value) || 3;
        }
    }

    startKataRound() {
        const performerEl = document.getElementById('currentPerformer');
        if (!performerEl) return;
        const performer = performerEl.value;
        if (window.electronAPI) {
            window.electronAPI.send('kata-start', { performer, match: this.currentMatch });
        }
    }

    endMatch(winner = null) {
        this.stopTimer();
        if (!winner) {
            if (this.currentMatch.scores.red > this.currentMatch.scores.blue) winner = 'red';
            else if (this.currentMatch.scores.blue > this.currentMatch.scores.red) winner = 'blue';
        }
        if (winner) {
            const winnerName = this.currentMatch.competitors[winner]?.name || winner;
            notificationSystem.success('Match Ended', `Winner: ${winnerName} (${winner.toUpperCase()} corner)`);
            if (window.electronAPI) {
                window.electronAPI.send('match-end', { winner, match: this.currentMatch });
            }
        } else {
            notificationSystem.info('Match Ended', 'Match ended in a draw!');
        }
    }

    updateDisplay() {
        const redScoreEl = document.getElementById('redScore');
        const blueScoreEl = document.getElementById('blueScore');
        const redKataEl = document.getElementById('redKataScore');
        const blueKataEl = document.getElementById('blueKataScore');
        if (redScoreEl) redScoreEl.textContent = this.currentMatch.scores.red;
        if (blueScoreEl) blueScoreEl.textContent = this.currentMatch.scores.blue;
        if (redKataEl) redKataEl.textContent = this.currentMatch.kata.red.total.toFixed(2);
        if (blueKataEl) blueKataEl.textContent = this.currentMatch.kata.blue.total.toFixed(2);
        this.updateTimerDisplay();
    }
}

function openDisplay() {
    if (window.electronAPI) window.electronAPI.send('open-display-window');
}

function openJudgePanel() {
    if (window.electronAPI) window.electronAPI.send('open-judge-window');
}

let app;
window.addEventListener('DOMContentLoaded', () => {
    app = new KarateScoring();
});

function switchDiscipline() { if (app) app.switchDiscipline(); }
function startMatch() { if (app) app.startMatch(); }
function resetMatch() { if (app) app.resetMatch(); }
function addScore(corner, type) { if (app) app.addScore(corner, type); }
function addPenalty(corner, type) { if (app) app.addPenalty(corner, type); }
function startTimer() { if (app) app.startTimer(); }
function pauseTimer() { if (app) app.pauseTimer(); }
function resetTimer() { if (app) app.resetTimer(); }
function setupJudges() { if (app) app.setupJudges(); }
function startKataRound() { if (app) app.startKataRound(); }

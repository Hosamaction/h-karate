const { notificationSystem } = require('./notifications.js');

const VALID_CORNERS = ['red', 'blue', 'none'];

class JudgePanel {
    constructor() {
        this.currentMatch = null;
        this.judgeNumber = parseInt(new URLSearchParams(window.location.search).get('judge')) || 1;
        this.currentPerformer = null;
        this.scores = { technical: 0, athletic: 0, total: 0 };
        this.pendingCall = null;
        this.init();
    }

    init() {
        const judgeTitle = document.getElementById('judgeTitle');
        if (judgeTitle) judgeTitle.textContent = `Judge ${this.judgeNumber}`;
        this.setupEventListeners();
        this.updateInterface();
    }

    setupEventListeners() {
        if (window.electronAPI) {
            window.electronAPI.receive('match-started', (match) => {
                try {
                    this.currentMatch = match;
                    this.updateInterface();
                } catch (e) { console.error('match-started error:', e); }
            });

            window.electronAPI.receive('kata-start', (data) => {
                try {
                    this.currentPerformer = data.performer;
                    this.showKataInterface();
                } catch (e) { console.error('kata-start error:', e); }
            });
        }

        const technicalScore = document.getElementById('technicalScore');
        const athleticScore = document.getElementById('athleticScore');
        if (technicalScore) technicalScore.addEventListener('input', () => this.updateTotalScore());
        if (athleticScore) athleticScore.addEventListener('input', () => this.updateTotalScore());
    }

    updateInterface() {
        const currentMatchEl = document.getElementById('currentMatch');
        if (!this.currentMatch) {
            if (currentMatchEl) currentMatchEl.textContent = 'No active match';
            return;
        }

        const discipline = this.currentMatch.discipline || '';
        const redName = this.currentMatch.competitors?.red?.name || 'Red';
        const blueName = this.currentMatch.competitors?.blue?.name || 'Blue';
        if (currentMatchEl) {
            currentMatchEl.textContent = `${discipline.toUpperCase()} - ${redName} vs ${blueName}`;
        }

        const kataJudging = document.getElementById('kataJudging');
        const kumiteJudging = document.getElementById('kumiteJudging');
        if (discipline === 'kata') {
            if (kataJudging) kataJudging.style.display = 'block';
            if (kumiteJudging) kumiteJudging.style.display = 'none';
        } else {
            if (kataJudging) kataJudging.style.display = 'none';
            if (kumiteJudging) kumiteJudging.style.display = 'block';
            this.updateKumiteInterface();
        }
    }

    updateKumiteInterface() {
        if (!this.currentMatch) return;
        const redEl = document.getElementById('redName');
        const blueEl = document.getElementById('blueName');
        if (redEl) redEl.textContent = this.currentMatch.competitors?.red?.name || '';
        if (blueEl) blueEl.textContent = this.currentMatch.competitors?.blue?.name || '';
    }

    showKataInterface() {
        if (!this.currentMatch || !this.currentPerformer) return;
        const performer = this.currentMatch.competitors?.[this.currentPerformer];
        if (!performer) return;
        const nameEl = document.getElementById('performerName');
        const clubEl = document.getElementById('performerClub');
        if (nameEl) nameEl.textContent = performer.name || '';
        if (clubEl) clubEl.textContent = performer.club || '';
        this.clearScore();
    }

    adjustScore(type, amount) {
        const input = document.getElementById(type + 'Score');
        if (!input) return;
        let value = parseFloat(input.value) + amount;
        value = type === 'technical' ? Math.max(0, Math.min(7, value)) : Math.max(0, Math.min(3, value));
        input.value = value.toFixed(1);
        this.updateTotalScore();
    }

    updateTotalScore() {
        const techEl = document.getElementById('technicalScore');
        const athEl = document.getElementById('athleticScore');
        const totalEl = document.getElementById('totalScore');
        if (!techEl || !athEl || !totalEl) return;
        const technical = parseFloat(techEl.value) || 0;
        const athletic = parseFloat(athEl.value) || 0;
        const total = technical + athletic;
        totalEl.textContent = total.toFixed(1);
        this.scores = { technical, athletic, total };
    }

    setQuickScore(technical, athletic) {
        const techEl = document.getElementById('technicalScore');
        const athEl = document.getElementById('athleticScore');
        if (techEl) techEl.value = technical.toFixed(1);
        if (athEl) athEl.value = athletic.toFixed(1);
        this.updateTotalScore();
    }

    submitScore() {
        if (!this.currentPerformer || !this.currentMatch) {
            notificationSystem.error('Error', 'No active performance to score');
            return;
        }
        const scoreData = {
            judge: this.judgeNumber,
            performer: this.currentPerformer,
            technical: this.scores.technical,
            athletic: this.scores.athletic,
            total: this.scores.total
        };
        if (window.electronAPI) {
            window.electronAPI.send('judge-score', scoreData);
        }
        notificationSystem.success('Score Submitted', `Score submitted: ${this.scores.total.toFixed(1)}`);
        this.clearScore();
    }

    clearScore() {
        const techEl = document.getElementById('technicalScore');
        const athEl = document.getElementById('athleticScore');
        const totalEl = document.getElementById('totalScore');
        if (techEl) techEl.value = '0.0';
        if (athEl) athEl.value = '0.0';
        if (totalEl) totalEl.textContent = '0.0';
        this.scores = { technical: 0, athletic: 0, total: 0 };
    }

    raiseFlag(corner) {
        if (!VALID_CORNERS.includes(corner)) return;
        const currentCall = document.getElementById('currentCall');
        const confirmBtn = document.querySelector('.btn-confirm');
        if (currentCall) currentCall.textContent = `${corner.toUpperCase()} CORNER SCORES`;
        if (confirmBtn) confirmBtn.disabled = false;
        this.pendingCall = corner;
    }

    noScore() {
        const currentCall = document.getElementById('currentCall');
        const confirmBtn = document.querySelector('.btn-confirm');
        if (currentCall) currentCall.textContent = 'NO SCORE';
        if (confirmBtn) confirmBtn.disabled = false;
        this.pendingCall = 'none';
    }

    confirmCall() {
        if (!this.pendingCall) return;
        const callData = {
            judge: this.judgeNumber,
            call: this.pendingCall,
            timestamp: Date.now()
        };
        if (window.electronAPI) {
            window.electronAPI.send('judge-score', callData);
        }
        this.cancelCall();
    }

    cancelCall() {
        const currentCall = document.getElementById('currentCall');
        const confirmBtn = document.querySelector('.btn-confirm');
        if (currentCall) currentCall.textContent = 'None';
        if (confirmBtn) confirmBtn.disabled = true;
        this.pendingCall = null;
    }
}

let judgePanel;
window.addEventListener('DOMContentLoaded', () => {
    judgePanel = new JudgePanel();
});

function adjustScore(type, amount) { if (judgePanel) judgePanel.adjustScore(type, amount); }
function setQuickScore(technical, athletic) { if (judgePanel) judgePanel.setQuickScore(technical, athletic); }
function submitScore() { if (judgePanel) judgePanel.submitScore(); }
function clearScore() { if (judgePanel) judgePanel.clearScore(); }
function raiseFlag(corner) { if (judgePanel) judgePanel.raiseFlag(corner); }
function noScore() { if (judgePanel) judgePanel.noScore(); }
function confirmCall() { if (judgePanel) judgePanel.confirmCall(); }
function cancelCall() { if (judgePanel) judgePanel.cancelCall(); }

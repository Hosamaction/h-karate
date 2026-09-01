const { notificationSystem } = require('./notifications.js');

let _idCounter = Date.now();
function uniqueId() { return ++_idCounter; }

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.replace(/<[^>]*>/g, '').trim().substring(0, 200);
}

class KataAllInTournament {
    constructor() {
        this.tournament = {
            name: '',
            category: '',
            judges: 3,
            competitors: [],
            currentRound: 1,
            currentPerformer: null,
            rounds: [],
            judgeScores: {}
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (window.electronAPI) {
            window.electronAPI.receive('judge-score', (scoreData) => {
                try { this.receiveJudgeScore(scoreData); }
                catch (e) { console.error('judge-score error:', e); }
            });
        }
    }

    addCompetitor() {
        const name = sanitizeInput(document.getElementById('newCompetitorName')?.value || '');
        const club = sanitizeInput(document.getElementById('newCompetitorClub')?.value || '');

        if (!name) {
            notificationSystem.error('Error', 'Please enter competitor name');
            return;
        }

        this.tournament.competitors.push({ id: uniqueId(), name, club, totalScore: 0, eliminated: false });
        this.updateCompetitorList();

        const nameEl = document.getElementById('newCompetitorName');
        const clubEl = document.getElementById('newCompetitorClub');
        if (nameEl) nameEl.value = '';
        if (clubEl) clubEl.value = '';
    }

    updateCompetitorList() {
        const list = document.getElementById('competitorList');
        if (!list) return;
        list.innerHTML = '';
        this.tournament.competitors.forEach(comp => {
            const div = document.createElement('div');
            div.className = 'competitor-item';

            const span = document.createElement('span');
            span.textContent = `${comp.name} (${comp.club})`;

            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-danger';
            btn.textContent = 'Remove';
            btn.addEventListener('click', () => this.removeCompetitor(comp.id));

            div.appendChild(span);
            div.appendChild(btn);
            list.appendChild(div);
        });
    }

    removeCompetitor(id) {
        this.tournament.competitors = this.tournament.competitors.filter(c => c.id !== id);
        this.updateCompetitorList();
    }

    startTournament() {
        if (this.tournament.competitors.length < 4) {
            notificationSystem.error('Error', 'Need at least 4 competitors');
            return;
        }

        this.tournament.name = sanitizeInput(document.getElementById('tournamentName')?.value || '');
        this.tournament.category = sanitizeInput(document.getElementById('category')?.value || '');
        this.tournament.judges = parseInt(document.getElementById('judgeCount')?.value) || 3;

        const bracketEl = document.getElementById('tournamentBracket');
        if (bracketEl) bracketEl.style.display = 'block';
        this.startRound(1);

        if (window.electronAPI) {
            window.electronAPI.send('match-start', { discipline: 'kata-allin', tournament: this.tournament });
        }
    }

    startRound(roundNumber) {
        this.tournament.currentRound = roundNumber;
        const activeCompetitors = this.tournament.competitors.filter(c => !c.eliminated);

        const titleEl = document.getElementById('currentRoundTitle');
        const descEl = document.getElementById('roundDescription');
        if (titleEl) titleEl.textContent = roundNumber === 1 ? 'Round 1 - All Competitors' : `Round ${roundNumber}`;
        if (descEl) descEl.textContent = roundNumber === 1
            ? `All ${activeCompetitors.length} competitors perform`
            : `Top ${activeCompetitors.length} competitors`;

        this.updateCompetitorsGrid(activeCompetitors);
    }

    updateCompetitorsGrid(competitors) {
        const grid = document.getElementById('competitorsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        competitors.forEach(comp => {
            const card = document.createElement('div');
            card.className = `competitor-card ${comp.id === this.tournament.currentPerformer?.id ? 'active' : ''}`;
            card.addEventListener('click', () => this.selectPerformer(comp.id));

            const name = document.createElement('h4');
            name.textContent = comp.name;

            const club = document.createElement('p');
            club.textContent = comp.club;

            const score = document.createElement('div');
            score.className = 'score';
            score.textContent = `Score: ${comp.totalScore.toFixed(2)}`;

            const status = document.createElement('div');
            status.className = 'status';
            status.textContent = this.getPerformerStatus(comp.id);

            card.appendChild(name);
            card.appendChild(club);
            card.appendChild(score);
            card.appendChild(status);
            fragment.appendChild(card);
        });
        grid.appendChild(fragment);
    }

    selectPerformer(competitorId) {
        this.tournament.currentPerformer = this.tournament.competitors.find(c => c.id === competitorId) || null;
        const nameEl = document.getElementById('performerName');
        if (nameEl && this.tournament.currentPerformer) {
            nameEl.textContent = this.tournament.currentPerformer.name;
        }
        this.updateCompetitorsGrid(this.tournament.competitors.filter(c => !c.eliminated));
    }

    startPerformance() {
        if (!this.tournament.currentPerformer) {
            notificationSystem.error('Error', 'Please select a performer');
            return;
        }
        if (window.electronAPI) {
            window.electronAPI.send('kata-start', {
                discipline: 'kata-allin',
                performer: this.tournament.currentPerformer,
                tournament: this.tournament
            });
            window.electronAPI.send('score-update', { discipline: 'kata-allin', tournament: this.tournament });
        }
        notificationSystem.info('Performance', `${this.tournament.currentPerformer.name} performance started`);
    }

    endPerformance() {
        if (!this.tournament.currentPerformer) return;
        const scores = this.tournament.judgeScores[this.tournament.currentPerformer.id];
        const judgeCount = Object.keys(scores || {}).length;
        if (judgeCount < this.tournament.judges) {
            notificationSystem.warning('Waiting', `Waiting for ${this.tournament.judges - judgeCount} more judge scores`);
            return;
        }
        this.calculateScore(this.tournament.currentPerformer.id);
        this.updateCompetitorsGrid(this.tournament.competitors.filter(c => !c.eliminated));
        if (window.electronAPI) {
            window.electronAPI.send('score-update', { discipline: 'kata-allin', tournament: this.tournament });
        }
        notificationSystem.success('Performance', `Score: ${this.tournament.currentPerformer.totalScore.toFixed(2)}`);
    }

    receiveJudgeScore(scoreData) {
        if (!scoreData || typeof scoreData.technical !== 'number' ||
            typeof scoreData.athletic !== 'number' || typeof scoreData.total !== 'number') {
            console.error('Invalid score data received');
            return;
        }
        const performerId = this.tournament.currentPerformer?.id;
        if (!performerId) return;

        if (!this.tournament.judgeScores[performerId]) {
            this.tournament.judgeScores[performerId] = {};
        }
        this.tournament.judgeScores[performerId][scoreData.judge] = {
            technical: scoreData.technical,
            athletic: scoreData.athletic,
            total: scoreData.total
        };
        if (window.electronAPI) {
            window.electronAPI.send('judge-score', {
                discipline: 'kata-allin',
                tournament: this.tournament,
                scoreData
            });
        }
    }

    calculateScore(performerId) {
        const scores = this.tournament.judgeScores[performerId];
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

        const competitor = this.tournament.competitors.find(c => c.id === performerId);
        if (competitor) competitor.totalScore = avgTechnical + avgAthletic;
    }

    finishRound() {
        const activeCompetitors = this.tournament.competitors
            .filter(c => !c.eliminated)
            .sort((a, b) => b.totalScore - a.totalScore);

        let advancingCount;
        if (this.tournament.currentRound === 1) {
            advancingCount = Math.min(8, activeCompetitors.length);
        } else if (activeCompetitors.length >= 4) {
            advancingCount = 4;
        } else {
            this.finishTournament();
            return;
        }

        for (let i = advancingCount; i < activeCompetitors.length; i++) {
            activeCompetitors[i].eliminated = true;
        }

        notificationSystem.success('Round', `Round ${this.tournament.currentRound} finished. Top ${advancingCount} advance.`);

        if (advancingCount > 1) {
            this.startRound(this.tournament.currentRound + 1);
        } else {
            this.finishTournament();
        }
    }

    finishTournament() {
        const winner = this.tournament.competitors
            .filter(c => !c.eliminated)
            .sort((a, b) => b.totalScore - a.totalScore)[0];

        if (!winner) {
            notificationSystem.info('Tournament', 'Tournament finished with no winner');
            return;
        }

        notificationSystem.success('Tournament', `Winner: ${winner.name} - ${winner.totalScore.toFixed(2)}`);
        if (window.electronAPI) {
            window.electronAPI.send('match-end', { winner, tournament: this.tournament, discipline: 'kata-allin' });
        }
    }

    getPerformerStatus(competitorId) {
        const scores = this.tournament.judgeScores[competitorId];
        if (!scores) return 'Waiting';
        const judgeCount = Object.keys(scores).length;
        return judgeCount >= this.tournament.judges ? 'Complete' : `${judgeCount}/${this.tournament.judges}`;
    }

    showResults() {
        const lines = this.tournament.competitors
            .filter(c => !c.eliminated)
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((comp, i) => `${i + 1}. ${comp.name} - ${comp.totalScore.toFixed(2)}`);

        notificationSystem.info('Results', `Round ${this.tournament.currentRound}:\n${lines.join('\n')}`);
    }

    resetTournament() {
        this.tournament = {
            name: '', category: '', judges: 3, competitors: [],
            currentRound: 1, currentPerformer: null, rounds: [], judgeScores: {}
        };
        const bracketEl = document.getElementById('tournamentBracket');
        if (bracketEl) bracketEl.style.display = 'none';
        this.updateCompetitorList();
    }
}

function goBack() { window.location.href = 'main.html'; }

let tournament;
window.addEventListener('DOMContentLoaded', () => {
    tournament = new KataAllInTournament();
});

function addCompetitor() { if (tournament) tournament.addCompetitor(); }
function removeCompetitor(id) { if (tournament) tournament.removeCompetitor(id); }
function startTournament() { if (tournament) tournament.startTournament(); }
function selectPerformer(id) { if (tournament) tournament.selectPerformer(id); }
function startPerformance() { if (tournament) tournament.startPerformance(); }
function endPerformance() { if (tournament) tournament.endPerformance(); }
function finishRound() { if (tournament) tournament.finishRound(); }
function showResults() { if (tournament) tournament.showResults(); }
function resetTournament() { if (tournament) tournament.resetTournament(); }

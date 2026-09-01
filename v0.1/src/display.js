const WINNER_DISPLAY_DURATION = 10000;

class DisplayScreen {
    constructor() {
        this.currentMatch = null;
        this.judgeScores = {};
        this.discipline = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.showReadyState();
    }

    setupEventListeners() {
        if (!window.electronAPI) return;

        window.electronAPI.receive('match-started', (match) => {
            try {
                this.currentMatch = match;
                this.discipline = match.discipline || (match.red ? 'kumite' : 'kata');
                this.showMatchInterface();
                this.updateCompetitorInfo();
            } catch (e) { console.error('match-started error:', e); }
        });

        window.electronAPI.receive('score-updated', (match) => {
            try {
                this.currentMatch = match;
                this.updateScores();
            } catch (e) { console.error('score-updated error:', e); }
        });

        window.electronAPI.receive('timer-updated', (timer) => {
            try { this.updateTimer(timer); }
            catch (e) { console.error('timer-updated error:', e); }
        });

        window.electronAPI.receive('judge-score', (scoreData) => {
            try { this.updateJudgeScores(scoreData); }
            catch (e) { console.error('judge-score error:', e); }
        });

        window.electronAPI.receive('match-end', (data) => {
            try { this.showWinner(data.winner); }
            catch (e) { console.error('match-end error:', e); }
        });
    }

    showReadyState() {
        this.safeUpdateElement('matchStatus', 'READY');
        this.safeUpdateElement('kataStatus', 'READY');
    }

    showMatchInterface() {
        if (!this.currentMatch) return;

        let discipline = this.currentMatch.discipline || this.discipline;
        if (!discipline) {
            if (this.currentMatch.timer !== undefined || this.currentMatch.red?.yuko !== undefined) {
                discipline = 'kumite';
            } else if (this.currentMatch.tournament) {
                discipline = 'kata-allin';
            } else if (this.currentMatch.red && this.currentMatch.blue) {
                discipline = 'kata';
            }
            this.discipline = discipline;
        }

        ['kumiteDisplay', 'kataDisplay', 'kataAllInDisplay', 'winnerDisplay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        const displayMap = { kumite: 'kumiteDisplay', 'kata-allin': 'kataAllInDisplay', kata: 'kataDisplay' };
        const targetId = displayMap[discipline];
        if (targetId) {
            const el = document.getElementById(targetId);
            if (el) el.style.display = 'block';
        }
    }

    updateCompetitorInfo() {
        if (!this.currentMatch) return;
        const discipline = this.currentMatch.discipline || this.discipline;

        if (discipline === 'kumite') {
            const red = this.currentMatch.red;
            const blue = this.currentMatch.blue;
            if (red && blue) {
                this.safeUpdateElement('redDisplayName', red.name?.toUpperCase() || 'RED CORNER');
                this.safeUpdateElement('redDisplayClub', red.club?.toUpperCase() || 'CLUB');
                this.safeUpdateElement('blueDisplayName', blue.name?.toUpperCase() || 'BLUE CORNER');
                this.safeUpdateElement('blueDisplayClub', blue.club?.toUpperCase() || 'CLUB');
            }
        } else if (discipline === 'kata') {
            const red = this.currentMatch.red;
            const blue = this.currentMatch.blue;
            if (red && blue) {
                this.safeUpdateElement('redKataDisplayName', red.name?.toUpperCase() || 'COMPETITOR 1');
                this.safeUpdateElement('redKataDisplayClub', red.club?.toUpperCase() || 'CLUB');
                this.safeUpdateElement('blueKataDisplayName', blue.name?.toUpperCase() || 'COMPETITOR 2');
                this.safeUpdateElement('blueKataDisplayClub', blue.club?.toUpperCase() || 'CLUB');
            }
        } else if (discipline === 'kata-allin') {
            const tournament = this.currentMatch.tournament;
            if (tournament) {
                this.safeUpdateElement('tournamentName', tournament.name?.toUpperCase() || 'KATA TOURNAMENT');
                this.safeUpdateElement('currentRound', `ROUND ${tournament.currentRound || 1}`);
                if (tournament.currentPerformer) {
                    this.safeUpdateElement('currentPerformerName', tournament.currentPerformer.name?.toUpperCase() || 'PERFORMER');
                    this.safeUpdateElement('currentPerformerClub', tournament.currentPerformer.club?.toUpperCase() || 'CLUB');
                }
            }
        }
    }

    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element && value !== null && value !== undefined) {
            element.textContent = typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : String(value);
        }
    }

    updateScores() {
        if (!this.currentMatch) return;
        const discipline = this.currentMatch.discipline || this.discipline;
        if (discipline === 'kumite') this.updateKumiteScores();
        else if (discipline === 'kata-allin') this.updateKataAllInScores();
        else if (discipline === 'kata') this.updateKataScores();
    }

    updateKumiteScores() {
        this.safeUpdateElement('redDisplayScore', this.currentMatch.red?.score || 0);
        this.safeUpdateElement('blueDisplayScore', this.currentMatch.blue?.score || 0);
        this.safeUpdateElement('redDisplayPenalties', this.currentMatch.red?.penalties || 0);
        this.safeUpdateElement('blueDisplayPenalties', this.currentMatch.blue?.penalties || 0);
        const status = this.currentMatch.timer?.running ? 'IN PROGRESS' :
                       this.currentMatch.timer?.time === 0 ? 'TIME UP' : 'READY';
        this.safeUpdateElement('matchStatus', status);
    }

    updateKataScores() {
        const red = this.currentMatch.red;
        const blue = this.currentMatch.blue;
        if (red && blue) {
            this.safeUpdateElement('redFinalScore', (red.total || 0).toFixed(2));
            this.safeUpdateElement('blueFinalScore', (blue.total || 0).toFixed(2));
            this.safeUpdateElement('redTechnical', (red.technical || 0).toFixed(2));
            this.safeUpdateElement('redAthletic', (red.athletic || 0).toFixed(2));
            this.safeUpdateElement('blueTechnical', (blue.technical || 0).toFixed(2));
            this.safeUpdateElement('blueAthletic', (blue.athletic || 0).toFixed(2));
        }
        this.updateJudgeScoresGrid();
    }

    updateKataAllInScores() {
        const tournament = this.currentMatch.tournament;
        if (!tournament) return;
        this.safeUpdateElement('tournamentName', tournament.name?.toUpperCase() || 'KATA TOURNAMENT');
        this.safeUpdateElement('currentRound', `ROUND ${tournament.currentRound || 1}`);
        if (tournament.currentPerformer) {
            this.safeUpdateElement('currentPerformerName', tournament.currentPerformer.name?.toUpperCase() || 'PERFORMER');
            this.safeUpdateElement('currentPerformerClub', tournament.currentPerformer.club?.toUpperCase() || 'CLUB');
            this.safeUpdateElement('currentPerformerScore', (tournament.currentPerformer.totalScore || 0).toFixed(2));
        }
        this.updateCompetitorsList(tournament.competitors);
    }

    updateTimer(timer) {
        if (!timer) return;
        const minutes = Math.floor(timer.time / 60);
        const seconds = timer.time % 60;
        const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const timerEl = document.getElementById('displayTimer');
        const statusEl = document.getElementById('timerStatus');

        if (timerEl) {
            timerEl.textContent = display;
            if (timer.time <= 30) {
                timerEl.style.color = '#ff0000';
                timerEl.classList.add('pulse');
            } else if (timer.time <= 60) {
                timerEl.style.color = '#ff8c00';
                timerEl.classList.remove('pulse');
            } else {
                timerEl.style.color = '#00ff00';
                timerEl.classList.remove('pulse');
            }
        }
        if (statusEl) {
            statusEl.textContent = timer.running ? 'RUNNING' : timer.time === 0 ? 'TIME UP' : 'PAUSED';
        }
    }

    updateJudgeScores(scoreData) {
        if (!scoreData || typeof scoreData !== 'object') return;
        const { performer, judge, technical, athletic, total } = scoreData;
        if (!performer || !judge ||
            typeof technical !== 'number' ||
            typeof athletic !== 'number' ||
            typeof total !== 'number') return;

        if (!this.judgeScores[performer]) this.judgeScores[performer] = {};
        this.judgeScores[performer][judge] = { technical, athletic, total };
        this.updateJudgeScoresGrid();
    }

    updateJudgeScoresGrid() {
        const grid = document.getElementById('judgeScoresGrid');
        if (!grid) return;

        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();

        ['red', 'blue'].forEach(corner => {
            if (!this.judgeScores[corner]) return;
            const cornerDiv = document.createElement('div');
            cornerDiv.className = 'corner-scores';

            const title = document.createElement('h4');
            title.textContent = corner.toUpperCase() + ' CORNER';
            cornerDiv.appendChild(title);

            Object.keys(this.judgeScores[corner]).forEach(judge => {
                const score = this.judgeScores[corner][judge];
                const scoreDiv = document.createElement('div');
                scoreDiv.className = 'judge-score';

                const span = document.createElement('span');
                span.textContent = `Judge ${judge}: ${score.total.toFixed(1)}`;

                const small = document.createElement('small');
                small.textContent = `(T:${score.technical.toFixed(1)} A:${score.athletic.toFixed(1)})`;

                scoreDiv.appendChild(span);
                scoreDiv.appendChild(small);
                cornerDiv.appendChild(scoreDiv);
            });

            fragment.appendChild(cornerDiv);
        });

        grid.appendChild(fragment);
    }

    showWinner(winner) {
        if (!this.currentMatch || !winner) return;

        let winnerInfo, winnerCorner;
        if (this.discipline === 'kumite' || this.discipline === 'kata') {
            winnerInfo = this.currentMatch[winner];
            winnerCorner = `${winner.toUpperCase()} CORNER`;
        } else if (this.discipline === 'kata-allin') {
            winnerInfo = winner;
            winnerCorner = 'TOURNAMENT WINNER';
        }

        if (!winnerInfo) return;

        this.safeUpdateElement('winnerName', winnerInfo.name?.toUpperCase() || 'WINNER');
        this.safeUpdateElement('winnerClub', winnerInfo.club?.toUpperCase() || 'CLUB');
        this.safeUpdateElement('winnerCorner', winnerCorner);

        ['kumiteDisplay', 'kataDisplay', 'kataAllInDisplay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const winnerEl = document.getElementById('winnerDisplay');
        if (winnerEl) winnerEl.style.display = 'flex';

        setTimeout(() => {
            if (winnerEl) winnerEl.style.display = 'none';
            this.showMatchInterface();
        }, WINNER_DISPLAY_DURATION);
    }

    updateCompetitorsList(competitors) {
        const grid = document.getElementById('competitorsListGrid');
        if (!grid || !competitors) return;

        const active = competitors
            .filter(c => !c.eliminated)
            .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

        grid.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const currentId = this.currentMatch?.tournament?.currentPerformer?.id;

        active.forEach((comp, index) => {
            const item = document.createElement('div');
            item.className = `competitor-item ${comp?.id === currentId ? 'active' : ''}`;

            const rank = document.createElement('div');
            rank.className = 'rank';
            rank.textContent = index + 1;

            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = (comp?.name || '').replace(/<[^>]*>/g, '').trim().toUpperCase();

            const score = document.createElement('div');
            score.className = 'score';
            score.textContent = (comp?.totalScore || 0).toFixed(2);

            item.appendChild(rank);
            item.appendChild(name);
            item.appendChild(score);
            fragment.appendChild(item);
        });

        grid.appendChild(fragment);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

let displayScreen;
window.addEventListener('DOMContentLoaded', () => {
    displayScreen = new DisplayScreen();
});

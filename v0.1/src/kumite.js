// Use secure API from preload script
const { notificationSystem } = require('./notifications.js');

class KumiteScoring {
    constructor() {
        this.match = {
            red: { name: '', club: '', yuko: 0, wazaari: 0, ippon: 0, penalties: 0, score: 0 },
            blue: { name: '', club: '', yuko: 0, wazaari: 0, ippon: 0, penalties: 0, score: 0 },
            timer: { time: 180, running: false },
            category: '',
            round: ''
        };
        this.timerInterval = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (window.electronAPI) {
            window.electronAPI.receive('score-updated', (data) => {
                try {
                    this.updateDisplay();
                } catch (error) {
                    console.error('Error updating display:', error);
                }
            });
        }
    }

    startKumiteMatch() {
        const redName = this.sanitizeInput(document.getElementById('redName')?.value || '');
        const redClub = this.sanitizeInput(document.getElementById('redClub')?.value || '');
        const blueName = this.sanitizeInput(document.getElementById('blueName')?.value || '');
        const blueClub = this.sanitizeInput(document.getElementById('blueClub')?.value || '');
        const category = this.sanitizeInput(document.getElementById('category')?.value || '');
        const round = this.sanitizeInput(document.getElementById('round')?.value || '');

        if (!redName || !blueName) {
            this.showNotification('Please enter both competitor names', 'error');
            return;
        }

        this.match.red.name = redName;
        this.match.red.club = redClub || 'Unknown';
        this.match.blue.name = blueName;
        this.match.blue.club = blueClub || 'Unknown';
        this.match.category = category;
        this.match.round = round;

        const redCornerEl = document.getElementById('redCornerName');
        const blueCornerEl = document.getElementById('blueCornerName');
        const scoringEl = document.getElementById('kumiteScoring');
        if (redCornerEl) redCornerEl.textContent = redName;
        if (blueCornerEl) blueCornerEl.textContent = blueName;
        if (scoringEl) scoringEl.style.display = 'block';

        if (window.electronAPI) {
            window.electronAPI.send('open-display-window');
            window.electronAPI.send('match-start', { ...this.match, discipline: 'kumite' });
        }
        this.updateDisplay();
    }

    addScore(corner, type) {
        if (!['red', 'blue'].includes(corner)) return;
        if (!['yuko', 'wazaari', 'ippon'].includes(type)) return;
        this.match[corner][type]++;
        this.calculateScore(corner);
        this.updateDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('score-update', { ...this.match, discipline: 'kumite' });
        }
        if (this.match[corner].score >= 8) this.endMatch(corner, '8 Points');
    }

    addPenalty(corner, type) {
        if (!['red', 'blue'].includes(corner)) return;
        this.match[corner].penalties++;
        if (type === 'keikoku') {
            const opponent = corner === 'red' ? 'blue' : 'red';
            this.match[opponent].score++;
        }
        if (this.match[corner].penalties >= 5) {
            const winner = corner === 'red' ? 'blue' : 'red';
            this.endMatch(winner, '5 Penalties');
        }
        this.updateDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('score-update', { ...this.match, discipline: 'kumite' });
        }
    }

    calculateScore(corner) {
        const c = this.match[corner];
        c.score = c.yuko + (c.wazaari * 2) + (c.ippon * 3);
    }

    startTimer() {
        if (this.timerInterval) return;
        
        this.match.timer.running = true;
        this.timerInterval = setInterval(() => {
            if (this.match.timer.time > 0) {
                this.match.timer.time--;
                this.updateTimerDisplay();
                if (window.electronAPI) {
                    window.electronAPI.send('timer-update', this.match.timer);
                }
            } else {
                this.timeUp();
            }
        }, 1000);
    }

    pauseTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.match.timer.running = false;
            if (window.electronAPI) {
                window.electronAPI.send('timer-update', this.match.timer);
            }
        }
    }

    resetTimer() {
        this.pauseTimer();
        this.match.timer.time = 180;
        this.updateTimerDisplay();
        if (window.electronAPI) {
            window.electronAPI.send('timer-update', this.match.timer);
        }
    }

    timeUp() {
        this.pauseTimer();
        const winner = this.match.red.score > this.match.blue.score ? 'red' : 
                      this.match.blue.score > this.match.red.score ? 'blue' : null;
        
        if (winner) {
            this.endMatch(winner, 'Time Up - Points');
        } else {
            this.showNotification('Time up! Match ended in a draw.', 'info');
        }
    }

    endMatch(winner = null, method = 'Manual') {
        this.pauseTimer();
        
        if (winner) {
            const winnerName = this.match[winner].name;
            this.showNotification(`Match ended! Winner: ${winnerName} (${winner.toUpperCase()} corner) - ${method}`, 'success');
            if (window.electronAPI) {
                window.electronAPI.send('match-end', { winner, method, match: this.match });
            }
        }
    }

    medicalTimeout() {
        this.pauseTimer();
        const competitor = prompt('Medical timeout for which corner? (red/blue)');
        if (competitor && (competitor === 'red' || competitor === 'blue')) {
            this.showNotification(`Medical timeout called for ${competitor} corner`, 'warning');
            if (window.electronAPI) {
                window.electronAPI.send('medical-timeout', { competitor, match: this.match });
            }
        }
    }

    undoScore(corner) {
        const c = this.match[corner];
        if (c.ippon > 0) {
            c.ippon--;
        } else if (c.wazaari > 0) {
            c.wazaari--;
        } else if (c.yuko > 0) {
            c.yuko--;
        }
        this.calculateScore(corner);
        this.updateDisplay();
        const matchData = { ...this.match, discipline: 'kumite' };
        if (window.electronAPI) {
            window.electronAPI.send('score-update', matchData);
        }
    }

    undoPenalty(corner) {
        if (this.match[corner].penalties > 0) {
            this.match[corner].penalties--;
            this.updateDisplay();
            const matchData = { ...this.match, discipline: 'kumite' };
            if (window.electronAPI) {
                window.electronAPI.send('score-update', matchData);
            }
        }
    }

    resetMatch() {
        this.match.red = { name: '', club: '', yuko: 0, wazaari: 0, ippon: 0, penalties: 0, score: 0 };
        this.match.blue = { name: '', club: '', yuko: 0, wazaari: 0, ippon: 0, penalties: 0, score: 0 };
        this.match.timer = { time: 180, running: false };
        this.pauseTimer();
        this.updateDisplay();
        const scoringEl = document.getElementById('kumiteScoring');
        if (scoringEl) scoringEl.style.display = 'none';
        ['redName', 'redClub', 'blueName', 'blueClub'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    updateDisplay() {
        this.safeUpdateElement('redScore', this.match.red.score);
        this.safeUpdateElement('blueScore', this.match.blue.score);
        
        this.safeUpdateElement('redYuko', this.match.red.yuko);
        this.safeUpdateElement('redWazaari', this.match.red.wazaari);
        this.safeUpdateElement('redIppon', this.match.red.ippon);
        this.safeUpdateElement('redPenalties', this.match.red.penalties);
        
        this.safeUpdateElement('blueYuko', this.match.blue.yuko);
        this.safeUpdateElement('blueWazaari', this.match.blue.wazaari);
        this.safeUpdateElement('blueIppon', this.match.blue.ippon);
        this.safeUpdateElement('bluePenalties', this.match.blue.penalties);
        
        this.updateTimerDisplay();
    }
    
    safeUpdateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    showNotification(message, type = 'info') {
        switch (type) {
            case 'success':
                notificationSystem.success('Notification', message);
                break;
            case 'error':
                notificationSystem.error('Error', message);
                break;
            case 'warning':
                notificationSystem.warning('Warning', message);
                break;
            case 'info':
            default:
                notificationSystem.info('Notification', message);
                break;
        }
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input.replace(/<[^>]*>/g, '')
                   .replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#x27;')
                   .trim();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.match.timer.time / 60);
        const seconds = this.match.timer.time % 60;
        const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        const timerElement = document.getElementById('timerDisplay');
        if (timerElement) {
            timerElement.textContent = display;
        }
    }
}

function openDisplay() {
    if (window.electronAPI) {
        window.electronAPI.send('open-display-window');
    }
}

function goBack() {
    window.location.href = 'main.html';
}

let kumite;
window.addEventListener('DOMContentLoaded', () => {
    kumite = new KumiteScoring();
});

function startKumiteMatch() { if (kumite) kumite.startKumiteMatch(); }
function addScore(corner, type) { if (kumite) kumite.addScore(corner, type); }
function addPenalty(corner, type) { if (kumite) kumite.addPenalty(corner, type); }
function startTimer() { if (kumite) kumite.startTimer(); }
function pauseTimer() { if (kumite) kumite.pauseTimer(); }
function resetTimer() { if (kumite) kumite.resetTimer(); }
function endMatch() { if (kumite) kumite.endMatch(); }
function medicalTimeout() { if (kumite) kumite.medicalTimeout(); }
function resetMatch() { if (kumite) kumite.resetMatch(); }
function undoScore(corner) { if (kumite) kumite.undoScore(corner); }
function undoPenalty(corner) { if (kumite) kumite.undoPenalty(corner); }
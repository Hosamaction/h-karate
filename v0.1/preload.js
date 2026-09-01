const { contextBridge, ipcRenderer } = require('electron');

const SEND_CHANNELS = [
    'score-update', 'timer-update', 'match-start', 'judge-score',
    'match-end', 'start-web-judge', 'stop-web-judge', 'judge-setup',
    'open-display-window', 'close-display-window', 'kata-start', 'judge-call'
];

const RECEIVE_CHANNELS = [
    'judge-score', 'match-started', 'score-updated', 'timer-updated',
    'match-end', 'kata-start'
];

contextBridge.exposeInMainWorld('electronAPI', {
    send: (channel, data) => {
        if (SEND_CHANNELS.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        if (RECEIVE_CHANNELS.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    removeAllListeners: (channel) => {
        if (RECEIVE_CHANNELS.includes(channel)) {
            ipcRenderer.removeAllListeners(channel);
        }
    }
});

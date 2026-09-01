const { contextBridge, ipcRenderer } = require('electron');

const SEND = [
  'display:open', 'display:close',
  'server:start', 'server:stop', 'server:open-browser',
  'match:start', 'match:update', 'match:end',
  'timer:update', 'judge:score', 'kata:performance-start',
  'history:clear',
  'data:clear-competitors',
  'data:clear-all',
  'settings:set', 'settings:set-all',
  'print:results',
  'competitors:save'
];

const RECEIVE = [
  'match:started', 'match:updated', 'match:ended',
  'timer:updated', 'judge:score', 'kata:performance-started',
  'state:sync', 'display:closed',
  'server:started', 'server:stopped', 'server:error',
  'server:judge-connected', 'server:judge-disconnected',
  'settings:changed'
];

const INVOKE = [
  'server:status', 'app:get-ip',
  'history:get',
  'settings:get-all', 'settings:get',
  'export:history-json', 'export:history-csv',
  'competitors:load',
  'backup:export', 'backup:import',
  'data:open-folder',
  'app:check-update'
];

contextBridge.exposeInMainWorld('api', {
  send:   (ch, data) => { if (SEND.includes(ch)) ipcRenderer.send(ch, data); },
  on:     (ch, fn)   => { if (RECEIVE.includes(ch)) ipcRenderer.on(ch, (_, ...a) => fn(...a)); },
  off:    (ch)       => { if (RECEIVE.includes(ch)) ipcRenderer.removeAllListeners(ch); },
  invoke: (ch, data) => { if (INVOKE.includes(ch)) return ipcRenderer.invoke(ch, data); return Promise.resolve(null); }
});

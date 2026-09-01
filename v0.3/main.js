const { app, BrowserWindow, ipcMain, Menu, screen, shell, nativeTheme, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs   = require('fs');
const express  = require('express');
const socketIo = require('socket.io');
const os = require('os');

// ── JSON Store ────────────────────────────────────────────────────────────────
let dataDir, dbPath, settingsPath;
let _matches  = [];
let _settings = {};

const DEFAULTS = {
  language: 'en', soundEnabled: 'true', soundVolume: '0.8',
  timerDuration: '180', judgeCount: '3',
  displayFullscreen: 'true', organizationName: 'H Karate'
};

function initStore() {
  dataDir      = path.join(app.getPath('userData'), 'hkarate-data');
  dbPath       = path.join(dataDir, 'matches.json');
  settingsPath = path.join(dataDir, 'settings.json');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  try { _matches  = JSON.parse(fs.readFileSync(dbPath,       'utf8')); } catch(e) { _matches  = []; }
  try { _settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch(e) { _settings = {}; }
}

function saveMatches()  { try { fs.writeFileSync(dbPath,       JSON.stringify(_matches,  null, 2)); } catch(e) {} }
function saveSettings() { try { fs.writeFileSync(settingsPath, JSON.stringify(_settings, null, 2)); } catch(e) {} }

function getSetting(key)        { return _settings[key] ?? DEFAULTS[key] ?? null; }
function setSetting(key, value) { _settings[key] = String(value); saveSettings(); }
function getAllSettings()        { return { ...DEFAULTS, ..._settings }; }

function saveMatch(data) {
  const record = {
    id:         Date.now(),
    discipline: data.discipline  || '',
    category:   data.category    || '',
    round:      data.round       || '',
    red_name:   data.red?.name   || data.winnerName || '',
    red_club:   data.red?.club   || '',
    blue_name:  data.blue?.name  || '',
    blue_club:  data.blue?.club  || '',
    red_score:  String(data.red?.score  ?? data.red?.total  ?? ''),
    blue_score: String(data.blue?.score ?? data.blue?.total ?? ''),
    winner:     data.winner  || '',
    method:     data.method  || '',
    date:       new Date().toISOString(),
    data:       JSON.stringify(data)
  };
  _matches.unshift(record);
  saveMatches();
}

function getHistory(limit = 100) { return _matches.slice(0, limit); }
function clearHistory()          { _matches = []; saveMatches(); }

// ── Windows ───────────────────────────────────────────────────────────────────
let mainWindow = null, displayWindow = null, webServer = null, io = null;

const state = {
  match: null, discipline: null,
  timer: { time: 0, running: false },
  webJudgeCount: 0, serverRunning: false,
  serverPort: 12121, localIP: 'localhost'
};

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}

function broadcast(ch, data) {
  if (mainWindow    && !mainWindow.isDestroyed())    mainWindow.webContents.send(ch, data);
  if (displayWindow && !displayWindow.isDestroyed()) displayWindow.webContents.send(ch, data);
  if (io) io.emit(ch, data);
}
function toMain(ch, data)    { if (mainWindow    && !mainWindow.isDestroyed())    mainWindow.webContents.send(ch, data); }
function toDisplay(ch, data) { if (displayWindow && !displayWindow.isDestroyed()) displayWindow.webContents.send(ch, data); }

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360, height: 860, minWidth: 1100, minHeight: 720,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0c12', show: false
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'pages', 'splash.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createDisplayWindow() {
  if (displayWindow && !displayWindow.isDestroyed()) { displayWindow.focus(); return; }
  const displays = screen.getAllDisplays();
  const target = displays.length > 1 ? (displays.find(d => !d.internal) || displays[1]) : displays[0];
  const fullscreen = getSetting('displayFullscreen') !== 'false';
  displayWindow = new BrowserWindow({
    x: target.bounds.x, y: target.bounds.y,
    width: target.bounds.width, height: target.bounds.height,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    fullscreen, frame: false, alwaysOnTop: true,
    backgroundColor: '#0a0a0f', title: 'H Karate — Scoreboard'
  });
  displayWindow.loadFile(path.join(__dirname, 'renderer', 'pages', 'display.html'));
  displayWindow.webContents.once('did-finish-load', () => {
    if (state.match) toDisplay('state:sync', state);
  });
  displayWindow.on('closed', () => { displayWindow = null; toMain('display:closed', null); });
}

// ── Web Server ────────────────────────────────────────────────────────────────
function startWebServer() {
  if (webServer) return;
  state.localIP = getLocalIP();
  const expressApp = express();
  expressApp.use(express.static(path.join(__dirname, 'web')));
  expressApp.get('/', (req, res) => res.sendFile(path.join(__dirname, 'web', 'judge.html')));
  webServer = http.createServer(expressApp);
  io = socketIo(webServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    state.webJudgeCount++;
    const num = state.webJudgeCount;
    socket.emit('assigned', { judgeNumber: num });
    if (state.match) socket.emit('state:sync', state);
    toMain('server:judge-connected', { count: state.webJudgeCount, judgeNumber: num });
    socket.on('judge:score', (data) => { toMain('judge:score', data); toDisplay('judge:score', data); });
    socket.on('disconnect', () => {
      state.webJudgeCount = Math.max(0, state.webJudgeCount - 1);
      toMain('server:judge-disconnected', { count: state.webJudgeCount });
    });
  });
  webServer.listen(state.serverPort, () => {
    state.serverRunning = true;
    toMain('server:started', { ip: state.localIP, port: state.serverPort });
  });
}

function stopWebServer() {
  if (!webServer) return;
  webServer.close(); webServer = null; io = null;
  state.serverRunning = false; state.webJudgeCount = 0;
  toMain('server:stopped', null);
}

// ── Menu ──────────────────────────────────────────────────────────────────────
function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'H Karate', submenu: [{ label: 'About', role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Windows', submenu: [
      { label: 'Scoreboard Display', accelerator: 'CmdOrCtrl+D', click: () => createDisplayWindow() },
      { label: 'Start Judge Server',  accelerator: 'CmdOrCtrl+J', click: () => { startWebServer(); setTimeout(() => shell.openExternal(`http://${state.localIP}:${state.serverPort}`), 800); } }
    ]}
  ]));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => { nativeTheme.themeSource = 'dark'; buildMenu(); initStore(); createMainWindow(); });
app.on('window-all-closed', () => { stopWebServer(); if (process.platform !== 'darwin') app.quit(); });

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('display:open',  () => createDisplayWindow());
ipcMain.on('display:close', () => { if (displayWindow && !displayWindow.isDestroyed()) displayWindow.close(); });

ipcMain.on('server:start',        () => startWebServer());
ipcMain.on('server:stop',         () => stopWebServer());
ipcMain.on('server:open-browser', () => shell.openExternal(`http://${state.localIP}:${state.serverPort}`));
ipcMain.handle('server:status',   () => ({ running: state.serverRunning, ip: state.localIP, port: state.serverPort, judges: state.webJudgeCount }));

ipcMain.on('match:start',  (e, data) => { state.match = data; state.discipline = data.discipline; broadcast('match:started', data); });
ipcMain.on('match:update', (e, data) => { state.match = data; broadcast('match:updated', data); });
ipcMain.on('match:end',    (e, data) => { broadcast('match:ended', data); saveMatch(data); state.match = null; });

ipcMain.on('timer:update',           (e, data) => { state.timer = data; toDisplay('timer:updated', data); });
ipcMain.on('judge:score',            (e, data) => { toMain('judge:score', data); toDisplay('judge:score', data); if (io) io.emit('judge:score', data); });
ipcMain.on('kata:performance-start', (e, data) => { broadcast('kata:performance-started', data); if (io) io.emit('kata:performance-started', data); });

// History
ipcMain.handle('history:get',   (e, limit) => getHistory(limit));
ipcMain.on('history:clear',     () => clearHistory());

// Settings
ipcMain.handle('settings:get-all', () => getAllSettings());
ipcMain.handle('settings:get',     (e, key) => getSetting(key));
ipcMain.on('settings:set',         (e, { key, value }) => { setSetting(key, value); broadcast('settings:changed', getAllSettings()); });
ipcMain.on('settings:set-all',     (e, obj) => { Object.entries(obj).forEach(([k, v]) => setSetting(k, v)); broadcast('settings:changed', getAllSettings()); });

// Export
ipcMain.handle('export:history-json', async () => {
  const rows = getHistory(9999);
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Match History', defaultPath: 'hkarate-history.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
  return true;
});

ipcMain.handle('export:history-csv', async () => {
  const rows = getHistory(9999);
  const header = 'id,discipline,category,round,red_name,red_club,blue_name,blue_club,red_score,blue_score,winner,method,date\n';
  const csv = header + rows.map(r =>
    ['id','discipline','category','round','red_name','red_club','blue_name','blue_club','red_score','blue_score','winner','method','date']
    .map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')
  ).join('\n');
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Match History', defaultPath: 'hkarate-history.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (!filePath) return false;
  fs.writeFileSync(filePath, csv, 'utf8');
  return true;
});

// Print
ipcMain.on('print:results', (e, htmlContent) => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  win.webContents.once('did-finish-load', () => {
    win.webContents.print({ silent: false, printBackground: true }, () => win.close());
  });
});

ipcMain.handle('app:get-ip', () => getLocalIP());

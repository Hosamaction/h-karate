const { app, BrowserWindow, ipcMain, Menu, screen, shell, nativeTheme, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs   = require('fs');
const express  = require('express');
const socketIo = require('socket.io');
const os = require('os');
const { validateLicense, activateLicense, loadStoredLicense, getMachineId } = require('./license/validator');

// ── Paths ─────────────────────────────────────────────────────────────────────
let dataDir, dbPath, settingsPath, competitorsPath, logPath, licensePath;

// ── In-memory store ───────────────────────────────────────────────────────────
let _matches  = [];
let _settings = {};
let _competitors = [];

// ── License state ─────────────────────────────────────────────────────────────
let _licenseValid   = false;
let _licenseData    = null;
let _licenseChecked = false;

const DEFAULTS = {
  language: 'en', soundEnabled: 'true', soundVolume: '0.8',
  timerDuration: '180', judgeCount: '3',
  displayFullscreen: 'true', organizationName: 'H Karate',
  theme: 'dark', themeAutoSwitch: 'false', shortcutsEnabled: 'true',
  scoringPreset: 'wkf',
  yukoPoints: '1', wazaariPoints: '2', ipponPoints: '3',
  pointGap: '8', maxPenalties: '5'
};

// ── Logging ───────────────────────────────────────────────────────────────────
function log(level, msg, err) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${msg}${err ? ' ' + (err.stack || err.message || err) : ''}\n`;
  try { if (logPath) fs.appendFileSync(logPath, line); } catch (_) {}
  if (level === 'error') console.error(msg, err || '');
  else console.log(msg);
}

// ── Atomic file writes ────────────────────────────────────────────────────────
function atomicWrite(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, filePath);
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    log('error', `Failed to read ${filePath}`, e);
    const bak = filePath + '.bak';
    try { if (fs.existsSync(bak)) return JSON.parse(fs.readFileSync(bak, 'utf8')); } catch (_) {}
    return fallback;
  }
}

function writeJson(filePath, value) {
  try {
    if (fs.existsSync(filePath)) {
      try { fs.copyFileSync(filePath, filePath + '.bak'); } catch (_) {}
    }
    atomicWrite(filePath, JSON.stringify(value, null, 2));
  } catch (e) { log('error', `Failed to write ${filePath}`, e); }
}

// ── Store init ────────────────────────────────────────────────────────────────
function initStore() {
  dataDir        = path.join(app.getPath('userData'), 'hkarate-data');
  dbPath         = path.join(dataDir, 'matches.json');
  settingsPath   = path.join(dataDir, 'settings.json');
  competitorsPath= path.join(dataDir, 'competitors.json');
  logPath        = path.join(dataDir, 'app.log');
  licensePath    = path.join(dataDir, 'license.dat');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  _matches     = readJson(dbPath, []);
  _settings    = readJson(settingsPath, {});
  _competitors = readJson(competitorsPath, []);
  if (!Array.isArray(_matches))     _matches = [];
  if (!_settings || typeof _settings !== 'object') _settings = {};
  if (!Array.isArray(_competitors)) _competitors = [];
  log('info', `Store ready (${_matches.length} matches, ${_competitors.length} competitors)`);
}

function saveMatches()    { writeJson(dbPath, _matches); }
function saveSettings()   { writeJson(settingsPath, _settings); }
function saveCompetitors(list) {
  _competitors = Array.isArray(list) ? list : [];
  writeJson(competitorsPath, _competitors);
}

function getSetting(key)        { return _settings[key] ?? DEFAULTS[key] ?? null; }
function setSetting(key, value) { _settings[key] = value == null ? '' : String(value); saveSettings(); }
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
let mainWindow = null, displayWindow = null, licenseWindow = null;
let webServer = null, io = null;
let nextJudgeNumber = 1;

const state = {
  match: null, discipline: null,
  timer: { time: 0, running: false },
  webJudgeCount: 0, serverRunning: false,
  serverPort: 12121, localIP: 'localhost'
};

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
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

// ── License window ────────────────────────────────────────────────────────────
function createLicenseWindow() {
  licenseWindow = new BrowserWindow({
    width: 560, height: 680,
    resizable: false, center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0a0c12',
    title: 'H Karate — License',
    frame: true, show: false,
    // Prevent closing without a valid license
    closable: true
  });
  licenseWindow.loadFile(path.join(__dirname, 'renderer', 'pages', 'license.html'));
  licenseWindow.once('ready-to-show', () => licenseWindow.show());
  licenseWindow.on('closed', () => {
    licenseWindow = null;
    // If main window not open yet, quit
    if (!mainWindow) app.quit();
  });
}

// ── Main window ───────────────────────────────────────────────────────────────
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

// ── Web server ────────────────────────────────────────────────────────────────
function startWebServer() {
  if (webServer) return;
  state.localIP = getLocalIP();
  nextJudgeNumber = 1;
  const expressApp = express();
  expressApp.use(express.static(path.join(__dirname, 'web')));
  expressApp.get('/',    (req, res) => res.sendFile(path.join(__dirname, 'web', 'judge.html')));
  expressApp.get('/obs', (req, res) => res.sendFile(path.join(__dirname, 'web', 'obs.html')));
  webServer = http.createServer(expressApp);
  io = socketIo(webServer, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    state.webJudgeCount++;
    const num = nextJudgeNumber++;
    socket.emit('assigned', { judgeNumber: num });
    if (state.match) socket.emit('state:sync', state);
    toMain('server:judge-connected', { count: state.webJudgeCount, judgeNumber: num });
    socket.on('judge:score', (data) => { toMain('judge:score', data); toDisplay('judge:score', data); if (io) io.emit('obs:update', state); });
    socket.on('disconnect', () => {
      state.webJudgeCount = Math.max(0, state.webJudgeCount - 1);
      toMain('server:judge-disconnected', { count: state.webJudgeCount });
    });
  });
  webServer.on('error', (err) => {
    log('error', 'Judge server error', err);
    webServer = null; io = null; state.serverRunning = false;
    toMain('server:error', { message: err.code === 'EADDRINUSE' ? `Port ${state.serverPort} is already in use` : String(err.message) });
  });
  webServer.listen(state.serverPort, () => {
    state.serverRunning = true;
    log('info', `Judge server on ${state.localIP}:${state.serverPort}`);
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
      { label: 'Start Judge Server',  accelerator: 'CmdOrCtrl+J', click: () => { startWebServer(); setTimeout(() => shell.openExternal(`http://${state.localIP}:${state.serverPort}`), 800); } },
      { label: 'OBS Overlay', click: () => { startWebServer(); setTimeout(() => shell.openExternal(`http://${state.localIP}:${state.serverPort}/obs`), 800); } }
    ]}
  ]));
}

// ── License check on startup ──────────────────────────────────────────────────
async function checkLicenseOnStartup() {
  const stored = loadStoredLicense(licensePath);
  if (!stored) {
    log('info', 'No license found — showing license window');
    createLicenseWindow();
    return;
  }

  const result = await validateLicense(stored, licensePath);
  _licenseChecked = true;

  if (result.valid) {
    _licenseValid = true;
    _licenseData  = result.data;
    log('info', `License valid — ${result.data.plan} — ${result.daysLeft} days left — ${result.reason}`);
    createMainWindow();
  } else {
    log('info', `License invalid: ${result.reason}`);
    _licenseValid = false;
    createLicenseWindow();
  }
}

// ── Auto-update configuration ─────────────────────────────────────────────────
autoUpdater.autoDownload = false; // Ask before downloading
autoUpdater.autoInstallOnAppQuit = true; // Install on quit

autoUpdater.on('update-available', (info) => {
  log('info', `Update available: v${info.version}`);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `H Karate v${info.version} is available!`,
      detail: `You're running v${app.getVersion()}. The update will download in the background.`,
      buttons: ['Download Update', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
        
        // Show download progress
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update:downloading', { version: info.version });
        }
      }
    });
  }
});

autoUpdater.on('update-not-available', () => {
  log('info', `App is up to date (v${app.getVersion()})`);
});

autoUpdater.on('download-progress', (progressObj) => {
  log('info', `Download progress: ${progressObj.percent.toFixed(1)}%`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:progress', progressObj);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log('info', `Update downloaded: v${info.version}`);
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `H Karate v${info.version} has been downloaded!`,
      detail: 'The update will be installed when you close the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }
});

autoUpdater.on('error', (err) => {
  log('error', 'Auto-updater error', err);
  // Fail silently - don't bother user
});

// ── Auto-update check on startup ──────────────────────────────────────────────
async function checkForUpdatesOnStartup() {
  try {
    log('info', `Checking for updates... (current: v${app.getVersion()})`);
    
    // Configure update feed URL
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'Hosamaction',
      repo: 'h-karate'
    });
    
    // Check for updates
    await autoUpdater.checkForUpdates();
  } catch (e) {
    log('info', `Update check failed: ${e.message}`);
    // Fail silently
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
process.on('uncaughtException',  (err) => log('error', 'uncaughtException', err));
process.on('unhandledRejection', (err) => log('error', 'unhandledRejection', err));

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  initStore();
  buildMenu();
  checkLicenseOnStartup();
  // Auto-check for updates on startup
  setTimeout(() => checkForUpdatesOnStartup(), 3000);
});

app.on('window-all-closed', () => { stopWebServer(); if (process.platform !== 'darwin') app.quit(); });

// ── License IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('license:activate', async (e, licenseFileObj) => {
  try {
    const result = await activateLicense(licenseFileObj, licensePath);
    if (result.ok) {
      _licenseValid = true;
      _licenseData  = { plan: result.plan, expiresAt: result.expiresAt };
      // Close license window, open main window
      if (licenseWindow && !licenseWindow.isDestroyed()) licenseWindow.close();
      createMainWindow();
    }
    return result;
  } catch(e) {
    log('error', 'License activation error', e);
    return { ok: false, reason: 'internal_error' };
  }
});

ipcMain.handle('license:status', async () => {
  if (!_licenseValid) return { valid: false };
  const stored = loadStoredLicense(licensePath);
  if (!stored) return { valid: false };
  const result = await validateLicense(stored, licensePath);
  return {
    valid:     result.valid,
    reason:    result.reason,
    plan:      result.data?.plan,
    email:     result.data?.email,
    expiresAt: result.data?.expiresAt,
    daysLeft:  result.daysLeft
  };
});

ipcMain.handle('license:get-machine-id', () => getMachineId());

// ── Display IPC ───────────────────────────────────────────────────────────────
ipcMain.on('display:open',  () => { if (_licenseValid) createDisplayWindow(); });
ipcMain.on('display:close', () => { if (displayWindow && !displayWindow.isDestroyed()) displayWindow.close(); });

// ── Server IPC ────────────────────────────────────────────────────────────────
ipcMain.on('server:start',        () => { if (_licenseValid) startWebServer(); });
ipcMain.on('server:stop',         () => stopWebServer());
ipcMain.on('server:open-browser', () => shell.openExternal(`http://${state.localIP}:${state.serverPort}`));
ipcMain.handle('server:status',   () => ({ running: state.serverRunning, ip: state.localIP, port: state.serverPort, judges: state.webJudgeCount }));

// ── Match IPC ─────────────────────────────────────────────────────────────────
ipcMain.on('match:start',  (e, data) => { state.match = data; state.discipline = data.discipline; broadcast('match:started', data); if (io) io.emit('obs:update', state); });
ipcMain.on('match:update', (e, data) => { state.match = data; broadcast('match:updated', data); if (io) io.emit('obs:update', state); });
ipcMain.on('match:end',    (e, data) => { broadcast('match:ended', data); saveMatch(data); state.match = null; if (io) io.emit('obs:update', state); });

ipcMain.on('timer:update',           (e, data) => { state.timer = data; toDisplay('timer:updated', data); if (io) io.emit('timer:updated', data); });
ipcMain.on('judge:score',            (e, data) => { toMain('judge:score', data); toDisplay('judge:score', data); if (io) io.emit('judge:score', data); });
ipcMain.on('kata:performance-start', (e, data) => { broadcast('kata:performance-started', data); if (io) io.emit('kata:performance-started', data); });

// ── History IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('history:get',        (e, limit) => getHistory(limit));
ipcMain.on('history:clear',          () => clearHistory());
ipcMain.on('data:clear-competitors', () => saveCompetitors([]));
ipcMain.on('data:clear-all',         () => { clearHistory(); saveCompetitors([]); });

// ── Settings IPC ──────────────────────────────────────────────────────────────
ipcMain.handle('settings:get-all', () => getAllSettings());
ipcMain.handle('settings:get',     (e, key) => getSetting(key));
ipcMain.on('settings:set',         (e, { key, value }) => { setSetting(key, value); broadcast('settings:changed', getAllSettings()); });
ipcMain.on('settings:set-all',     (e, obj) => { Object.entries(obj || {}).forEach(([k, v]) => setSetting(k, v)); broadcast('settings:changed', getAllSettings()); });

// ── Competitors IPC ───────────────────────────────────────────────────────────
ipcMain.handle('competitors:load', () => _competitors);
ipcMain.on('competitors:save',     (e, competitors) => saveCompetitors(competitors));

// ── Data IPC ──────────────────────────────────────────────────────────────────
ipcMain.handle('data:open-folder', () => { shell.openPath(dataDir); return true; });

ipcMain.handle('backup:export', async () => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup H Karate Data',
    defaultPath: `hkarate-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePath) return false;
  fs.writeFileSync(filePath, JSON.stringify({ version: app.getVersion(), exportedAt: new Date().toISOString(), matches: _matches, settings: _settings, competitors: _competitors }, null, 2), 'utf8');
  return true;
});

ipcMain.handle('backup:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore H Karate Backup',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths?.[0]) return false;
  try {
    const payload = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (Array.isArray(payload.matches))   { _matches = payload.matches; saveMatches(); }
    if (payload.settings && typeof payload.settings === 'object') { _settings = payload.settings; saveSettings(); }
    if (Array.isArray(payload.competitors)) saveCompetitors(payload.competitors);
    broadcast('settings:changed', getAllSettings());
    return true;
  } catch (e) {
    log('error', 'Backup import failed', e);
    dialog.showErrorBox('Restore failed', e.message || String(e));
    return false;
  }
});

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
  const keys = ['id','discipline','category','round','red_name','red_club','blue_name','blue_club','red_score','blue_score','winner','method','date'];
  const csv  = keys.join(',') + '\n' + rows.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Match History', defaultPath: 'hkarate-history.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (!filePath) return false;
  fs.writeFileSync(filePath, csv, 'utf8');
  return true;
});

ipcMain.on('print:results', (e, htmlContent) => {
  const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
  win.webContents.once('did-finish-load', () => {
    win.webContents.print({ silent: false, printBackground: true }, () => win.close());
  });
});

ipcMain.handle('app:get-ip', () => getLocalIP());
ipcMain.handle('app:open-url', (e, url) => { shell.openExternal(url); return true; });

ipcMain.handle('app:check-update', async () => {
  try {
    const https = require('https');
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    const current = pkg.version;
    const data = await new Promise((resolve, reject) => {
      https.get('https://api.github.com/repos/Hosamaction/h-karate/releases/latest',
        { headers: { 'User-Agent': 'H-Karate-App' } },
        (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
        }).on('error', reject);
    });
    const latest = (data.tag_name || '').replace(/^v/, '');
    return { current, latest, hasUpdate: latest && latest !== current, url: data.html_url || '' };
  } catch(e) {
    return { current: app.getVersion(), latest: null, hasUpdate: false, error: String(e.message) };
  }
});

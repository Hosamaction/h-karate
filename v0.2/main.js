const { app, BrowserWindow, ipcMain, Menu, screen, shell, nativeTheme } = require('electron');
const path = require('path');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const os = require('os');

// ─── Windows ────────────────────────────────────────────────────────────────
let mainWindow = null;
let displayWindow = null;
let webServer = null;
let io = null;

// ─── Centralized State ───────────────────────────────────────────────────────
const state = {
  match: null,
  discipline: null,
  timer: { time: 0, running: false },
  judges: [],
  webJudgeCount: 0,
  serverRunning: false,
  serverPort: 12121,
  localIP: 'localhost'
};

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// ─── Broadcast to all windows + web ─────────────────────────────────────────
function broadcast(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data);
  if (displayWindow && !displayWindow.isDestroyed()) displayWindow.webContents.send(channel, data);
  if (io) io.emit(channel, data);
}

function sendToMain(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, data);
}

function sendToDisplay(channel, data) {
  if (displayWindow && !displayWindow.isDestroyed()) displayWindow.webContents.send(channel, data);
}

// ─── Main Window ─────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    backgroundColor: '#0f1117',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'pages', 'splash.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Display Window ───────────────────────────────────────────────────────────
function createDisplayWindow() {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.focus();
    return;
  }
  const displays = screen.getAllDisplays();
  const target = displays.length > 1
    ? (displays.find(d => !d.internal) || displays[1])
    : displays[0];

  displayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#0a0a0f',
    title: 'H Karate — Scoreboard'
  });

  displayWindow.loadFile(path.join(__dirname, 'renderer', 'pages', 'display.html'));

  // Sync current state to new display window
  displayWindow.webContents.once('did-finish-load', () => {
    if (state.match) sendToDisplay('state:sync', state);
  });

  displayWindow.on('closed', () => {
    displayWindow = null;
    sendToMain('display:closed', null);
  });
}

// ─── Web Judge Server ─────────────────────────────────────────────────────────
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
    const judgeNum = state.webJudgeCount;
    socket.emit('assigned', { judgeNumber: judgeNum });
    if (state.match) socket.emit('state:sync', state);
    sendToMain('server:judge-connected', { count: state.webJudgeCount, judgeNumber: judgeNum });

    socket.on('judge:score', (data) => {
      sendToMain('judge:score', data);
      sendToDisplay('judge:score', data);
    });

    socket.on('disconnect', () => {
      state.webJudgeCount = Math.max(0, state.webJudgeCount - 1);
      sendToMain('server:judge-disconnected', { count: state.webJudgeCount });
    });
  });

  webServer.listen(state.serverPort, () => {
    state.serverRunning = true;
    sendToMain('server:started', { ip: state.localIP, port: state.serverPort });
  });
}

function stopWebServer() {
  if (!webServer) return;
  webServer.close();
  webServer = null;
  io = null;
  state.serverRunning = false;
  state.webJudgeCount = 0;
  sendToMain('server:stopped', null);
}

// ─── App Menu ─────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'H Karate',
      submenu: [
        { label: 'About H Karate', role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Windows',
      submenu: [
        {
          label: 'Open Scoreboard Display',
          accelerator: 'CmdOrCtrl+D',
          click: () => createDisplayWindow()
        },
        {
          label: 'Start Web Judge Server',
          accelerator: 'CmdOrCtrl+J',
          click: () => {
            startWebServer();
            setTimeout(() => shell.openExternal(`http://${state.localIP}:${state.serverPort}`), 800);
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark';
  buildMenu();
  createMainWindow();
});

app.on('window-all-closed', () => {
  stopWebServer();
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Display window
ipcMain.on('display:open', () => createDisplayWindow());
ipcMain.on('display:close', () => { if (displayWindow && !displayWindow.isDestroyed()) displayWindow.close(); });

// Web server
ipcMain.on('server:start', () => startWebServer());
ipcMain.on('server:stop', () => stopWebServer());
ipcMain.handle('server:status', () => ({ running: state.serverRunning, ip: state.localIP, port: state.serverPort, judges: state.webJudgeCount }));
ipcMain.on('server:open-browser', () => shell.openExternal(`http://${state.localIP}:${state.serverPort}`));

// Match lifecycle
ipcMain.on('match:start', (event, data) => {
  state.match = data;
  state.discipline = data.discipline;
  broadcast('match:started', data);
});

ipcMain.on('match:update', (event, data) => {
  state.match = data;
  broadcast('match:updated', data);
});

ipcMain.on('match:end', (event, data) => {
  broadcast('match:ended', data);
  state.match = null;
});

// Timer
ipcMain.on('timer:update', (event, data) => {
  state.timer = data;
  sendToDisplay('timer:updated', data);
});

// Judge scores
ipcMain.on('judge:score', (event, data) => {
  sendToMain('judge:score', data);
  sendToDisplay('judge:score', data);
  if (io) io.emit('judge:score', data);
});

// Kata performance
ipcMain.on('kata:performance-start', (event, data) => {
  broadcast('kata:performance-started', data);
  if (io) io.emit('kata:performance-started', data);
});

// Settings
ipcMain.handle('app:get-ip', () => getLocalIP());
ipcMain.on('app:navigate', (event, page) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'pages', `${page}.html`));
  }
});

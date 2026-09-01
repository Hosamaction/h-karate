const { app, BrowserWindow, ipcMain, Menu, screen, shell } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');

let mainWindow;
let displayWindow;
let webServer;
let io;
let judges = [];
let currentCompetition = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default',
    frame: true
  });

  mainWindow.loadFile('src/splash.html');
  
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function startWebJudgeServer() {
  if (webServer) return;
  
  const expressApp = express();
  webServer = http.createServer(expressApp);
  io = socketIo(webServer);
  
  expressApp.use(express.static(path.join(__dirname, 'public')));
  
  expressApp.get('/judge', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Judge Panel</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --primary: #4a5568;
            --success: #38a169;
            --gray-600: #4b5563;
            --gray-700: #374151;
            --gray-800: #1f2937;
            --gray-900: #111827;
            --white: #ffffff;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
        }
        body {
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, var(--gray-800), var(--gray-900));
            color: var(--gray-100);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
        }
        .judge-panel { max-width: 600px; margin: 0 auto; }
        .judge-info {
            background: linear-gradient(135deg, var(--gray-700), var(--gray-800));
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
            border: 1px solid var(--gray-600);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }
        .performer-info {
            background: linear-gradient(135deg, var(--gray-700), var(--gray-800));
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
            border: 1px solid var(--gray-600);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }
        .scoring-form {
            background: linear-gradient(135deg, var(--gray-700), var(--gray-800));
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid var(--gray-600);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }
        .score-group {
            margin-bottom: 20px;
        }
        .score-group label {
            display: block;
            margin-bottom: 10px;
            font-weight: 600;
            color: var(--white);
        }
        .score-input-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .score-input-group input {
            flex: 1;
            padding: 12px;
            font-size: 18px;
            text-align: center;
            border: 1px solid var(--gray-600);
            border-radius: 8px;
            background: var(--gray-700);
            color: var(--white);
        }
        .btn {
            padding: 12px 20px;
            border: 1px solid var(--gray-600);
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            background: linear-gradient(135deg, var(--gray-600), var(--gray-700));
            color: var(--white);
            transition: all 0.2s ease;
        }
        .btn:hover {
            background: linear-gradient(135deg, var(--gray-500), var(--gray-600));
        }
        .btn-plus, .btn-minus {
            width: 40px;
            height: 40px;
            padding: 0;
            font-size: 20px;
        }
        .btn-success {
            background: linear-gradient(135deg, var(--success), #2f855a);
        }
        .btn-success:hover {
            background: linear-gradient(135deg, #2f855a, var(--success));
        }
        .btn-large {
            padding: 15px 30px;
            font-size: 18px;
        }
        .total-score {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background: var(--gray-800);
            border-radius: 8px;
            border: 1px solid var(--gray-600);
        }
        .quick-scores {
            background: linear-gradient(135deg, var(--gray-700), var(--gray-800));
            padding: 20px;
            border-radius: 12px;
            border: 1px solid var(--gray-600);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        }
        .quick-buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .status {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, var(--gray-700), var(--gray-800));
            border-radius: 12px;
            border: 1px solid var(--gray-600);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            font-weight: 600;
        }
        h2, h3, h4 {
            color: var(--white);
            font-weight: 700;
            margin-bottom: 1rem;
        }
        p {
            color: var(--gray-200);
        }
    </style>
</head>
<body>
    <div class="judge-panel">
        <div class="judge-info">
            <h2 id="judgeTitle">Connecting...</h2>
            <p id="competitionInfo">Waiting for competition...</p>
        </div>
        
        <div id="kataJudging" style="display: none;">
            <div class="performer-info">
                <h2 id="performerName">Competitor Name</h2>
                <p id="performerClub">Club Name</p>
            </div>
            
            <div class="scoring-form">
                <div class="score-group">
                    <label>Technical Score (0.0 - 7.0)</label>
                    <div class="score-input-group">
                        <button class="btn btn-minus" onclick="adjustScore('technical', -0.1)">-</button>
                        <input type="number" id="technicalScore" min="0" max="7" step="0.1" value="0.0">
                        <button class="btn btn-plus" onclick="adjustScore('technical', 0.1)">+</button>
                    </div>
                </div>
                
                <div class="score-group">
                    <label>Athletic Score (0.0 - 3.0)</label>
                    <div class="score-input-group">
                        <button class="btn btn-minus" onclick="adjustScore('athletic', -0.1)">-</button>
                        <input type="number" id="athleticScore" min="0" max="3" step="0.1" value="0.0">
                        <button class="btn btn-plus" onclick="adjustScore('athletic', 0.1)">+</button>
                    </div>
                </div>
                
                <div class="total-score">
                    <h3>Total Score: <span id="totalScore">0.0</span></h3>
                </div>
                
                <div style="text-align: center;">
                    <button class="btn btn-success btn-large" onclick="submitScore()">Submit Score</button>
                    <button class="btn" onclick="clearScore()">Clear</button>
                </div>
            </div>
            
            <div class="quick-scores">
                <h4>Quick Scores</h4>
                <div class="quick-buttons">
                    <button class="btn" onclick="setQuickScore(5.0, 2.0)">Good (5.0 + 2.0)</button>
                    <button class="btn" onclick="setQuickScore(6.0, 2.5)">Very Good (6.0 + 2.5)</button>
                    <button class="btn" onclick="setQuickScore(7.0, 3.0)">Excellent (7.0 + 3.0)</button>
                </div>
            </div>
        </div>
        
        <div class="status" id="statusArea">Waiting for competition to start...</div>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        let judgeNumber = 0;
        let scores = { technical: 0, athletic: 0, total: 0 };
        
        socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        socket.on('judgeAssigned', (data) => {
            judgeNumber = data.judgeNumber;
            document.getElementById('judgeTitle').textContent = 'Judge ' + judgeNumber;
        });
        
        socket.on('competitionUpdate', (data) => {
            document.getElementById('competitionInfo').textContent = data.type + ' Competition';
            
            if (data.currentPerformer) {
                document.getElementById('performerName').textContent = data.currentPerformer.name || 'Current Performer';
                document.getElementById('performerClub').textContent = data.currentPerformer.club || 'Club';
                document.getElementById('kataJudging').style.display = 'block';
                document.getElementById('statusArea').textContent = 'Ready to score kata performance';
                
                // Update kata info if available
                if (data.currentPerformer.kata) {
                    document.getElementById('performerKata').textContent = data.currentPerformer.kata;
                }
            }
        });
        
        function adjustScore(type, amount) {
            const input = document.getElementById(type + 'Score');
            if (!input) return;
            let value = parseFloat(input.value) + amount;
            
            // Clamp values
            if (type === 'technical') {
                value = Math.max(0, Math.min(7, value));
            } else {
                value = Math.max(0, Math.min(3, value));
            }
            
            input.value = value.toFixed(1);
            updateTotalScore();
        }
        
        function updateTotalScore() {
            const techElement = document.getElementById('technicalScore');
            const athElement = document.getElementById('athleticScore');
            const totalElement = document.getElementById('totalScore');
            
            if (!techElement || !athElement || !totalElement) return;
            
            const technical = parseFloat(techElement.value) || 0;
            const athletic = parseFloat(athElement.value) || 0;
            const total = technical + athletic;
            
            totalElement.textContent = total.toFixed(1);
            scores = { technical, athletic, total };
        }
        
        function setQuickScore(technical, athletic) {
            document.getElementById('technicalScore').value = technical.toFixed(1);
            document.getElementById('athleticScore').value = athletic.toFixed(1);
            updateTotalScore();
        }
        
        function submitScore() {
            socket.emit('judgeScore', {
                judgeNumber: judgeNumber,
                technical: scores.technical,
                athletic: scores.athletic,
                total: scores.total
            });
            document.getElementById('statusArea').textContent = 'Score submitted: ' + scores.total.toFixed(1);
        }
        
        function clearScore() {
            document.getElementById('technicalScore').value = '0.0';
            document.getElementById('athleticScore').value = '0.0';
            document.getElementById('totalScore').textContent = '0.0';
            scores = { technical: 0, athletic: 0, total: 0 };
        }
        
        // Initialize
        document.getElementById('technicalScore').addEventListener('input', updateTotalScore);
        document.getElementById('athleticScore').addEventListener('input', updateTotalScore);
    </script>
</body>
</html>
    `);
  });
  
  io.on('connection', (socket) => {
    const judgeNumber = judges.length + 1;
    judges.push({ id: socket.id, number: judgeNumber, socket });
    
    socket.emit('judgeAssigned', { judgeNumber });
    
    if (currentCompetition) {
      socket.emit('competitionUpdate', currentCompetition);
    }
    
    socket.on('judgeScore', (data) => {
      console.log('Judge score received');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('judge-score', data);
      }
      if (displayWindow && !displayWindow.isDestroyed()) {
        displayWindow.webContents.send('judge-score', data);
      }
    });
    
    socket.on('disconnect', () => {
      judges = judges.filter(j => j.id !== socket.id);
      console.log('Judge disconnected, remaining:', judges.length);
    });
  });
  
  webServer.listen(12121, () => {
    console.log('Web judge server running on port 12121');
  });
}

function createDisplayWindow() {
  if (displayWindow) {
    displayWindow.focus();
    return;
  }
  
  const displays = screen.getAllDisplays();
  let targetDisplay = displays[0]; // Default to primary
  
  // Find external display (usually has different bounds)
  if (displays.length > 1) {
    targetDisplay = displays.find(display => !display.internal) || displays[1];
  }
  
  displayWindow = new BrowserWindow({
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Karate Scoring Display',
    fullscreen: true,
    frame: false,
    alwaysOnTop: true
  });

  displayWindow.loadFile('src/display.html');
  
  displayWindow.on('closed', () => {
    displayWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();
  
  // Create menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Windows',
      submenu: [
        {
          label: 'Open Display',
          click: () => createDisplayWindow()
        },
        {
          label: 'Start Web Judge Server',
          click: () => {
            startWebJudgeServer();
            const networkInterfaces = os.networkInterfaces();
            let localIP = 'localhost';
            Object.keys(networkInterfaces).forEach(key => {
              networkInterfaces[key].forEach(addr => {
                if (addr.family === 'IPv4' && !addr.internal) {
                  localIP = addr.address;
                }
              });
            });
            shell.openExternal(`http://${localIP}:12121/judge`);
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Communication - Enhanced Real-time Sync
ipcMain.on('score-update', (event, data) => {
  console.log('Broadcasting score update');
  // Broadcast to all windows immediately
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('score-updated', data);
  }
  // Broadcast to web judges
  if (io) {
    io.emit('competitionUpdate', data);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('score-updated', data);
  }
});

ipcMain.on('timer-update', (event, data) => {
  console.log('Broadcasting timer update');
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('timer-updated', data);
  }
  // Web judges don't need timer updates
});

ipcMain.on('match-start', (event, data) => {
  console.log('Broadcasting match start');
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('match-started', data);
  }
  currentCompetition = data;
  if (io) {
    io.emit('competitionUpdate', data);
  }
});

ipcMain.on('judge-score', (event, data) => {
  console.log('Broadcasting judge score');
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('judge-score', data);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('judge-score', data);
  }
  // Judge scores are handled by web socket
});

ipcMain.on('match-end', (event, data) => {
  console.log('Broadcasting match end');
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.webContents.send('match-end', data);
  }
  currentCompetition = null;
  if (io) {
    io.emit('competitionUpdate', { type: 'ended' });
  }
});

ipcMain.on('start-web-judge', () => {
  startWebJudgeServer();
});

ipcMain.on('stop-web-judge', () => {
  if (webServer) {
    webServer.close();
    webServer = null;
    io = null;
    judges = [];
    currentCompetition = null;
    console.log('Web judge server stopped');
  }
});

ipcMain.on('judge-setup', (event, data) => {
  console.log('Setting up web judges with data');
  currentCompetition = data;
  if (io) {
    io.emit('competitionUpdate', data);
  }
});

ipcMain.on('open-display-window', () => {
  createDisplayWindow();
});

ipcMain.on('close-display-window', () => {
  if (displayWindow && !displayWindow.isDestroyed()) {
    displayWindow.close();
  }
});
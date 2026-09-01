/**
 * Keyboard Shortcuts System
 * Provides hotkey support for faster judging
 */

const KeyboardShortcuts = (() => {
  let enabled = true;
  let shortcuts = {};
  let activeContext = 'global';

  // Default shortcuts
  const defaultShortcuts = {
    global: {
      'Escape': { action: 'cancel', description: 'Cancel/Close' },
      'F11': { action: 'fullscreen', description: 'Toggle Fullscreen' },
      'ctrl+s': { action: 'save', description: 'Save' },
    },
    kumite: {
      'Space': { action: 'toggleTimer', description: 'Start/Stop Timer' },
      'r': { action: 'redScore', description: 'Red +1' },
      'R': { action: 'redScore2', description: 'Red +2' },
      'shift+r': { action: 'redScore3', description: 'Red +3' },
      'b': { action: 'blueScore', description: 'Blue +1' },
      'B': { action: 'blueScore2', description: 'Blue +2' },
      'shift+b': { action: 'blueScore3', description: 'Blue +3' },
      'p': { action: 'redPenalty', description: 'Red Penalty' },
      'P': { action: 'bluePenalty', description: 'Blue Penalty' },
      'u': { action: 'undo', description: 'Undo' },
      'm': { action: 'medTimeout', description: 'Medical Timeout' },
      'Enter': { action: 'endMatch', description: 'End Match' },
    },
    kata: {
      'Space': { action: 'startPerf', description: 'Start/End Performance' },
      'r': { action: 'selectRed', description: 'Select Red' },
      'b': { action: 'selectBlue', description: 'Select Blue' },
      'Enter': { action: 'calculate', description: 'Calculate Final' },
      'c': { action: 'calculate', description: 'Calculate Final' },
    }
  };

  function init(context = 'global') {
    shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
    activeContext = context;
    
    // Load custom shortcuts from settings
    if (window.api) {
      window.api.invoke('settings:get', 'keyboardShortcuts').then(custom => {
        if (custom) {
          shortcuts = { ...shortcuts, ...JSON.parse(custom) };
        }
      });
      
      window.api.invoke('settings:get', 'shortcutsEnabled').then(isEnabled => {
        enabled = isEnabled !== 'false';
      });
    }

    document.addEventListener('keydown', handleKeyPress);
  }

  function handleKeyPress(e) {
    if (!enabled) return;
    
    // Don't trigger if typing in input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = getKeyString(e);
    const contextShortcuts = shortcuts[activeContext] || {};
    const globalShortcuts = shortcuts.global || {};

    // Check context-specific shortcuts first
    if (contextShortcuts[key]) {
      e.preventDefault();
      executeAction(contextShortcuts[key].action, e);
      return;
    }

    // Check global shortcuts
    if (globalShortcuts[key]) {
      e.preventDefault();
      executeAction(globalShortcuts[key].action, e);
      return;
    }
  }

  function getKeyString(e) {
    let key = e.key;
    const modifiers = [];
    
    if (e.ctrlKey) modifiers.push('ctrl');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey && e.key.length > 1) modifiers.push('shift'); // Only add shift for special keys
    
    if (modifiers.length > 0) {
      return modifiers.join('+') + '+' + key.toLowerCase();
    }
    
    return key;
  }

  function executeAction(action, event) {
    // Trigger custom event that pages can listen to
    const customEvent = new CustomEvent('shortcutAction', {
      detail: { action, originalEvent: event }
    });
    document.dispatchEvent(customEvent);

    // Visual feedback
    showShortcutFeedback(action);
  }

  function showShortcutFeedback(action) {
    const feedback = document.createElement('div');
    feedback.className = 'shortcut-feedback';
    feedback.textContent = action.replace(/([A-Z])/g, ' $1').trim();
    feedback.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--accent);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      z-index: 9999;
      animation: slideInRight 0.2s ease-out;
      pointer-events: none;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.style.animation = 'fadeOut 0.2s ease-out';
      setTimeout(() => feedback.remove(), 200);
    }, 1000);
  }

  function setContext(context) {
    activeContext = context;
  }

  function enable() {
    enabled = true;
    if (window.api) {
      window.api.send('settings:set', { key: 'shortcutsEnabled', value: 'true' });
    }
  }

  function disable() {
    enabled = false;
    if (window.api) {
      window.api.send('settings:set', { key: 'shortcutsEnabled', value: 'false' });
    }
  }

  function isEnabled() {
    return enabled;
  }

  function getShortcuts(context = activeContext) {
    return { ...shortcuts.global, ...shortcuts[context] };
  }

  function setShortcut(context, key, action, description) {
    if (!shortcuts[context]) shortcuts[context] = {};
    shortcuts[context][key] = { action, description };
    
    // Save to settings
    if (window.api) {
      window.api.send('settings:set', { 
        key: 'keyboardShortcuts', 
        value: JSON.stringify(shortcuts) 
      });
    }
  }

  function showHelp() {
    const contextShortcuts = getShortcuts();
    const helpText = Object.entries(contextShortcuts)
      .map(([key, data]) => `${key.toUpperCase()} - ${data.description}`)
      .join('\n');
    
    alert(`Keyboard Shortcuts:\n\n${helpText}\n\nPress ? to show this help anytime`);
  }

  // Show help on ?
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      showHelp();
    }
  });

  return {
    init,
    setContext,
    enable,
    disable,
    isEnabled,
    getShortcuts,
    setShortcut,
    showHelp
  };
})();

// Add CSS for feedback animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

/**
 * Theme Switcher
 * Handles dark/light theme toggling with auto-scheduling
 */

const ThemeSwitcher = (() => {
  let currentTheme = 'dark';
  let autoSwitch = false;
  let autoSwitchTime = { light: 6, dark: 18 }; // 6 AM to 6 PM = light

  async function init() {
    // Load theme preference
    if (window.api) {
      const savedTheme = await window.api.invoke('settings:get', 'theme');
      const savedAuto = await window.api.invoke('settings:get', 'themeAutoSwitch');
      
      currentTheme = savedTheme || 'dark';
      autoSwitch = savedAuto === 'true';
    }

    // Apply initial theme
    applyTheme(currentTheme);

    // Setup auto-switch if enabled
    if (autoSwitch) {
      checkAutoSwitch();
      // Check every minute
      setInterval(checkAutoSwitch, 60000);
    }

    // Load light theme CSS
    const lightThemeLink = document.createElement('link');
    lightThemeLink.rel = 'stylesheet';
    lightThemeLink.href = '../css/theme-light.css';
    lightThemeLink.id = 'lightThemeCSS';
    document.head.appendChild(lightThemeLink);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save preference
    if (window.api) {
      window.api.send('settings:set', { key: 'theme', value: theme });
    }

    // Trigger event for other components
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  function toggle() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    
    // Show notification
    if (window.Toast) {
      Toast.success('Theme Changed', `Switched to ${newTheme} theme`);
    }
  }

  function setTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    applyTheme(theme);
  }

  function getTheme() {
    return currentTheme;
  }

  function enableAutoSwitch(enable = true) {
    autoSwitch = enable;
    
    if (window.api) {
      window.api.send('settings:set', { 
        key: 'themeAutoSwitch', 
        value: enable ? 'true' : 'false' 
      });
    }

    if (enable) {
      checkAutoSwitch();
      if (window.Toast) {
        Toast.success('Auto-switch Enabled', 'Theme will change based on time of day');
      }
    }
  }

  function checkAutoSwitch() {
    if (!autoSwitch) return;

    const hour = new Date().getHours();
    const shouldBeLight = hour >= autoSwitchTime.light && hour < autoSwitchTime.dark;
    const targetTheme = shouldBeLight ? 'light' : 'dark';

    if (currentTheme !== targetTheme) {
      applyTheme(targetTheme);
      if (window.Toast) {
        Toast.info('Theme Auto-switched', `Changed to ${targetTheme} theme`);
      }
    }
  }

  function setAutoSwitchTime(lightHour, darkHour) {
    autoSwitchTime = { light: lightHour, dark: darkHour };
    
    if (window.api) {
      window.api.send('settings:set', { 
        key: 'themeAutoSwitchTime', 
        value: JSON.stringify(autoSwitchTime) 
      });
    }
  }

  return {
    init,
    toggle,
    setTheme,
    getTheme,
    enableAutoSwitch,
    setAutoSwitchTime
  };
})();

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeSwitcher.init());
} else {
  ThemeSwitcher.init();
}

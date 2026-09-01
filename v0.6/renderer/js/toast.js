const Toast = (() => {
  let container;

  function init() {
    if (document.getElementById('toast-container')) return;
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  function show(title, message, type = 'info', duration = 4000) {
    if (!container) init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = icons[type] || icons.info;

    const body = document.createElement('div');
    body.className = 'toast-body';

    const ttl = document.createElement('div');
    ttl.className = 'toast-title';
    ttl.textContent = String(title).replace(/<[^>]*>/g, '');

    const msg = document.createElement('div');
    msg.className = 'toast-msg';
    msg.textContent = String(message).replace(/<[^>]*>/g, '');

    body.appendChild(ttl);
    body.appendChild(msg);
    t.appendChild(icon);
    t.appendChild(body);
    container.appendChild(t);

    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));

    if (duration > 0) {
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 400);
      }, duration);
    }
    return t;
  }

  return {
    init,
    success: (title, msg, d) => show(title, msg, 'success', d),
    error:   (title, msg, d) => show(title, msg, 'error',   d),
    warning: (title, msg, d) => show(title, msg, 'warning', d),
    info:    (title, msg, d) => show(title, msg, 'info',    d),
  };
})();

window.Toast = Toast;
document.addEventListener('DOMContentLoaded', () => Toast.init());

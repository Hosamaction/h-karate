/**
 * modal.js — Custom confirm/alert modal for H Karate
 * Replaces native confirm() with a styled in-app dialog.
 */
const Modal = (() => {
  let _overlay = null;

  function _build() {
    if (document.getElementById('hk-modal-overlay')) return;
    const style = document.createElement('style');
    style.textContent = `
      #hk-modal-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.2s;
      }
      #hk-modal-overlay.show { opacity: 1; }
      #hk-modal-box {
        background: var(--bg-card, #1a1d2e);
        border: 1px solid var(--border, rgba(255,255,255,0.08));
        border-radius: 16px; padding: 32px 28px 24px;
        min-width: 340px; max-width: 440px; width: 90%;
        box-shadow: 0 24px 64px rgba(0,0,0,0.6);
        transform: scale(0.95); transition: transform 0.2s;
      }
      #hk-modal-overlay.show #hk-modal-box { transform: scale(1); }
      #hk-modal-icon { font-size: 2.2rem; margin-bottom: 12px; }
      #hk-modal-title { font-size: 1.1rem; font-weight: 800; color: var(--text-white, #fff); margin-bottom: 8px; }
      #hk-modal-msg { font-size: 0.875rem; color: var(--text-secondary, #94a3b8); line-height: 1.6; margin-bottom: 24px; }
      #hk-modal-btns { display: flex; gap: 10px; justify-content: flex-end; }
      #hk-modal-btns button { padding: 9px 20px; border-radius: 8px; font-size: 0.875rem; font-weight: 600; cursor: pointer; border: none; transition: opacity 0.15s; }
      #hk-modal-btns button:hover { opacity: 0.85; }
      #hk-modal-cancel { background: var(--bg-input, rgba(255,255,255,0.06)); color: var(--text-secondary, #94a3b8); border: 1px solid var(--border, rgba(255,255,255,0.08)) !important; }
      #hk-modal-confirm { background: var(--red, #ef4444); color: #fff; }
      #hk-modal-confirm.safe { background: var(--accent, #6366f1); }
    `;
    document.head.appendChild(style);

    _overlay = document.createElement('div');
    _overlay.id = 'hk-modal-overlay';
    _overlay.innerHTML = `
      <div id="hk-modal-box">
        <div id="hk-modal-icon"></div>
        <div id="hk-modal-title"></div>
        <div id="hk-modal-msg"></div>
        <div id="hk-modal-btns">
          <button id="hk-modal-cancel">Cancel</button>
          <button id="hk-modal-confirm">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(_overlay);
  }

  /**
   * confirm(title, message, { confirmText, cancelText, danger, icon })
   * Returns a Promise<boolean>
   */
  function confirm(title, message, opts = {}) {
    _build();
    return new Promise(resolve => {
      document.getElementById('hk-modal-icon').textContent  = opts.icon  ?? '⚠️';
      document.getElementById('hk-modal-title').textContent = title;
      document.getElementById('hk-modal-msg').textContent   = message;

      const btn = document.getElementById('hk-modal-confirm');
      btn.textContent = opts.confirmText ?? 'Confirm';
      btn.className   = opts.danger === false ? 'safe' : '';

      document.getElementById('hk-modal-cancel').textContent = opts.cancelText ?? 'Cancel';

      const close = (result) => {
        _overlay.classList.remove('show');
        setTimeout(() => { _overlay.style.display = 'none'; }, 200);
        resolve(result);
      };

      btn.onclick = () => close(true);
      document.getElementById('hk-modal-cancel').onclick = () => close(false);
      _overlay.onclick = (e) => { if (e.target === _overlay) close(false); };

      _overlay.style.display = 'flex';
      requestAnimationFrame(() => requestAnimationFrame(() => _overlay.classList.add('show')));
    });
  }

  return { confirm };
})();

window.Modal = Modal;

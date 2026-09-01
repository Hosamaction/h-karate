const Utils = (() => {
  function sanitize(val) {
    if (typeof val !== 'string') return String(val ?? '');
    return val.replace(/<[^>]*>/g, '').trim().slice(0, 300);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = sanitize(String(val ?? ''));
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function getVal(id, fallback = '') {
    return document.getElementById(id)?.value?.trim() ?? fallback;
  }

  function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
  function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
  function toggle(id, condition) { condition ? show(id) : hide(id); }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function popScore(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }

  return { sanitize, setText, setVal, getVal, show, hide, toggle, formatTime, popScore };
})();

window.Utils = Utils;

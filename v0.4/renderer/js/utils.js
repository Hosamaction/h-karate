const Utils = (() => {
  function sanitize(val) {
    if (typeof val !== 'string') return String(val ?? '');
    return val.replace(/<[^>]*>/g, '').trim().slice(0, 300);
  }
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = sanitize(String(val ?? ''));
  }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function getVal(id, fb = '') { return document.getElementById(id)?.value?.trim() ?? fb; }
  function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
  function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
  function toggle(id, cond) { cond ? show(id) : hide(id); }
  function formatTime(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
  function popScore(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }
  return { sanitize, setText, setVal, getVal, show, hide, toggle, formatTime, popScore, formatDate };
})();
window.Utils = Utils;
